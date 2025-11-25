const OpenAI = require('openai');
const crypto = require('crypto');

const DEBUG_AI = process.env.DEBUG_AI === '1';
const resultCache = new Map(); // key -> { data, exp }
const inflight = new Map(); // key -> Promise

function shaKey(payload) {
	return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
function cacheGet(key) {
	const hit = resultCache.get(key);
	return hit && hit.exp > Date.now() ? hit.data : null;
}
function cacheSet(key, data, ttlMs) {
	resultCache.set(key, { data, exp: Date.now() + ttlMs });
}

class DeepSeekService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async generateFlashcardsFromText(text, options = {}) {
        const { customInstructions = '' } = options;
        try {
            // Initialize client if not already done
            this.initializeClient();

            const prompt = this.buildFlashcardsPrompt(text, { customInstructions });
            const response = await this.makeApiCallWithRetry({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating concise, high-quality flashcards for studying. Generate clear front/back cards.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 4000,
                stream: false
            });
            const content = response.choices[0].message.content;
            return this.parseFlashcardsResponse(content, text);
        } catch (error) {
            if (DEBUG_AI) console.error('DeepSeek flashcards API Error:', error);
            return this.createFallbackFlashcards(text);
        }
    }

    buildFlashcardsPrompt(text, options) {
        const { customInstructions } = options;
        let prompt = `Create a set of concise study flashcards from the text below.

TEXT:
${text.substring(0, 10000)} ${text.length > 10000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Create between 8 and 16 flashcards depending on content richness.
- Each card must have a "front" and "back".
- "Front" should be a short question/term; "Back" should be a clear answer/definition.
- Keep language simple and direct; avoid long paragraphs.
- Prefer one concept per card.
${customInstructions ? `- Additional instructions: ${customInstructions}` : ''}

OUTPUT FORMAT (JSON):
{
  "title": "Short collection title",
  "cards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}

STRICT OUTPUT RULES:
- Respond with ONLY the JSON (no code fences or commentary).
- Ensure the JSON is valid and properly formatted.`;
        return prompt;
    }

    parseFlashcardsResponse(aiResponse, originalText) {
        try {
            let content = aiResponse.trim();
            content = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
            try {
                const parsed = JSON.parse(content);
                return this.validateAndCleanFlashcards(parsed, originalText);
            } catch {}
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return this.validateAndCleanFlashcards(data, originalText);
            }
            throw new Error('No valid JSON found in AI response');
        } catch (error) {
            if (DEBUG_AI) console.error('Error parsing AI flashcards response:', error);
            return this.createFallbackFlashcards(originalText);
        }
    }

    validateAndCleanFlashcards(data, originalText) {
        const title = data.title || 'Flashcards';
        let cards = Array.isArray(data.cards) ? data.cards : [];
        cards = cards
            .filter(c => c && typeof c.front === 'string' && typeof c.back === 'string')
            .map(c => ({ front: c.front.trim(), back: c.back.trim() }))
            .filter(c => c.front.length > 0 && c.back.length > 0);
        if (cards.length === 0) {
            return this.createFallbackFlashcards(originalText);
        }
        return { title, cards };
    }

    createFallbackFlashcards(text) {
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
        const take = Math.min(10, Math.max(6, sentences.length));
        const cards = [];
        for (let i = 0; i < take; i++) {
            const s = sentences[i] || sentences[0] || 'This material discusses important concepts.';
            const term = (s.split(' ').find(w => w.length > 5) || 'Key concept').replace(/[^a-z0-9 ]/ig, '');
            cards.push({
                front: `What is ${term}?`,
                back: s.substring(0, 140) + (s.length > 140 ? '...' : '')
            });
        }
        return {
            title: 'Flashcards',
            cards
        };
    }
    initializeClient() {
        if (!this.initialized) {
            if (!process.env.DEEPSEEK_API_KEY) {
                throw new Error('DEEPSEEK_API_KEY environment variable is not set');
            }
            this.client = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: process.env.DEEPSEEK_API_KEY,
                timeout: 120000, // 120 seconds (2 minutes) timeout - increased for mixed questions
                maxRetries: 3
            });
            this.initialized = true;
        }
        return this.client;
    }

    async generateQuizFromText(text, options = {}) {
        const {
            numQuestions = 5,
            difficulty = 'medium',
            questionTypes = ['multiple_choice'],
            focusAreas = []
        } = options;

        try {
            // Cache key on truncated text + options to limit memory
            const key = shaKey({ t: String(text || '').slice(0, 4096), numQuestions, difficulty, questionTypes, focusAreas });
            const cached = cacheGet(key);
            if (cached) return cached;
            if (inflight.has(key)) return inflight.get(key);

            // Initialize client if not already done
            this.initializeClient();
            
            const prompt = this.buildQuizPrompt(text, {
                numQuestions,
                difficulty,
                questionTypes,
                focusAreas
            });

            const task = this.makeApiCallWithRetry({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational content creator specializing in creating high-quality quizzes and assessments. You excel at analyzing text content and generating meaningful, well-structured questions that test comprehension and knowledge retention.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 6000,
                stream: false
            }).then(response => {
                const quizContent = response.choices[0].message.content;
                const out = this.parseQuizResponse(quizContent, text, numQuestions, questionTypes);
                cacheSet(key, out, 2 * 60 * 1000); // 2 minutes
                return out;
            }).finally(() => {
                inflight.delete(key);
            });
            inflight.set(key, task);
            return await task;
        } catch (error) {
            if (DEBUG_AI) console.error('DeepSeek API Error:', error);
            // Return fallback quiz instead of throwing error
            if (DEBUG_AI) console.log('Falling back to simple quiz generation...');
            return this.createFallbackQuiz(text, numQuestions, questionTypes);
        }
    }

    async makeApiCallWithRetry(requestData, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (DEBUG_AI) console.log(`DeepSeek API attempt ${attempt}/${maxRetries}`);
                const response = await this.client.chat.completions.create(requestData);
                return response;
            } catch (error) {
                lastError = error;
                if (DEBUG_AI) console.error(`DeepSeek API attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    if (DEBUG_AI) console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    buildQuizPrompt(text, options) {
        const { numQuestions, difficulty, questionTypes, focusAreas } = options;
        
        if (DEBUG_AI) console.log('Building prompt with question types:', questionTypes);
        
        let prompt = `Please analyze the following text and create ${numQuestions} high-quality quiz questions.

TEXT TO ANALYZE:
${text.substring(0, 8000)} ${text.length > 8000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Generate exactly ${numQuestions} questions. If unsure, synthesize plausible questions from the text so the total equals ${numQuestions}.
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')}
- IMPORTANT: ONLY generate questions of the specified types: ${questionTypes.join(', ')}. Do not mix in other question types.
- Focus on key concepts, important facts, and main ideas
- Ensure questions test comprehension, not just memorization
- Make distractors plausible but clearly incorrect (for multiple choice)
- Include brief explanations for each answer

${focusAreas.length > 0 ? `- Pay special attention to these areas: ${focusAreas.join(', ')}` : ''}

OUTPUT FORMAT (JSON):
{
  "title": "Quiz Title based on content",
  "description": "Brief description of the quiz",
  "questions": [
    ${this.generateQuestionExamples(questionTypes)}
  ]
}

STRICT OUTPUT RULES:
- Respond with ONLY the JSON. Do not include code fences, markdown, or commentary.
- The questions array MUST have exactly ${numQuestions} items.

Please ensure the JSON is valid and properly formatted.`;

        return prompt;
    }

    generateQuestionExamples(questionTypes) {
        const examples = [];
        let id = 1;
        
        questionTypes.forEach(type => {
            switch (type) {
                case 'multiple_choice':
                    examples.push(`{
      "id": ${id++},
      "type": "multiple_choice",
      "question": "Question text here",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct answer",
      "explanation": "Why this answer is correct",
      "difficulty": "easy|medium|hard",
      "topic": "Main topic this question covers"
    }`);
                    break;
                case 'true_false':
                    examples.push(`{
      "id": ${id++},
      "type": "true_false",
      "question": "True or false question here",
      "choices": ["True", "False"],
      "answer": "True",
      "explanation": "Why this answer is correct",
      "difficulty": "easy|medium|hard",
      "topic": "Main topic this question covers"
    }`);
                    break;
                case 'identification':
                    examples.push(`{
      "id": ${id++},
      "type": "identification",
      "question": "What is the capital of France?",
      "answer": "Paris",
      "explanation": "Paris is the capital and largest city of France.",
      "difficulty": "easy|medium|hard",
      "topic": "Geography"
    }`);
                    break;
                case 'enumeration':
                    examples.push(`{
      "id": ${id++},
      "type": "enumeration",
      "question": "Name three primary colors.",
      "answer": ["Red", "Blue", "Yellow"],
      "explanation": "The three primary colors are red, blue, and yellow.",
      "difficulty": "easy|medium|hard",
      "topic": "Art"
    }`);
                    break;
            }
        });
        
        return examples.join(',\n    ');
    }

    parseQuizResponse(aiResponse, originalText, desiredCount = 5, requestedTypes = null) {
        try {
            if (DEBUG_AI) console.log('AI Response received, length:', aiResponse.length);
            if (DEBUG_AI) console.log('First 500 chars of AI response:', aiResponse.substring(0, 500));
            
            // Normalize common wrappers (remove code fences, stray commentary)
            let content = aiResponse.trim();
            content = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
            // Try full parse first
            try {
                const parsed = JSON.parse(content);
                if (DEBUG_AI) console.log('Successfully parsed JSON, questions count:', parsed.questions?.length);
                return this.validateAndCleanQuiz(parsed, originalText, desiredCount, requestedTypes);
            } catch {}

            // Fallback: extract the largest JSON-looking block
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const quizData = JSON.parse(jsonMatch[0]);
                return this.validateAndCleanQuiz(quizData, originalText, desiredCount, requestedTypes);
            }
            throw new Error('No valid JSON found in AI response');
        } catch (error) {
            if (DEBUG_AI) console.error('Error parsing AI response:', error);
            // Fallback to a simple quiz if parsing fails
            return this.createFallbackQuiz(originalText, desiredCount, requestedTypes);
        }
    }

    validateAndCleanQuiz(quizData, originalText, desiredCount = 5, requestedTypes = null) {
        const cleanedQuiz = {
            title: quizData.title || 'AI Generated Quiz',
            description: quizData.description || 'Quiz generated from uploaded content',
            questions: []
        };

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach((q, index) => {
                if (this.isValidQuestion(q)) {
                    const questionType = q.type || 'multiple_choice';
                    
                    // Filter by requested types if specified
                    if (requestedTypes && !requestedTypes.includes(questionType)) {
                        if (DEBUG_AI) console.log(`Filtering out question type: ${questionType} (not in requested types: ${requestedTypes.join(', ')})`);
                        return;
                    }
                    
                    const baseQuestion = {
                        id: index + 1,
                        type: questionType,
                        question: q.question || '',
                        answer: q.answer || '',
                        explanation: q.explanation || 'No explanation provided',
                        difficulty: q.difficulty || 'medium',
                        topic: q.topic || 'General'
                    };

                    // Add choices only for multiple choice and true/false questions
                    if (questionType === 'multiple_choice' || questionType === 'true_false') {
                        baseQuestion.choices = q.choices || [];
                    }

                    cleanedQuiz.questions.push(baseQuestion);
                }
            });
        }

        // Ensure exact desiredCount
        if (cleanedQuiz.questions.length === 0) {
            return this.createFallbackQuiz(originalText, desiredCount, requestedTypes);
        }
        if (cleanedQuiz.questions.length > desiredCount) {
            cleanedQuiz.questions = cleanedQuiz.questions.slice(0, desiredCount).map((q, i) => ({ ...q, id: i + 1 }));
        } else if (cleanedQuiz.questions.length < desiredCount) {
            // Top up by generating additional fallback questions
            const extra = this.createFallbackQuiz(originalText, desiredCount - cleanedQuiz.questions.length, requestedTypes).questions;
            const merged = cleanedQuiz.questions.concat(extra);
            cleanedQuiz.questions = merged.slice(0, desiredCount).map((q, i) => ({ ...q, id: i + 1 }));
        }

        return cleanedQuiz;
    }

    isValidQuestion(question) {
        if (!question || !question.question || question.question.trim().length <= 10) {
            return false;
        }

        const questionType = question.type || 'multiple_choice';
        
        switch (questionType) {
            case 'multiple_choice':
            case 'true_false':
                return question.choices &&
                       Array.isArray(question.choices) &&
                       question.choices.length >= 2 &&
                       question.answer &&
                       question.choices.includes(question.answer);
            
            case 'identification':
                return question.answer &&
                       typeof question.answer === 'string' &&
                       question.answer.trim().length > 0;
            
            case 'enumeration':
                return question.answer &&
                       Array.isArray(question.answer) &&
                       question.answer.length > 0 &&
                       question.answer.every(item => typeof item === 'string' && item.trim().length > 0);
            
            default:
                return false;
        }
    }

    createFallbackQuiz(text, desiredCount = 5, requestedTypes = ['multiple_choice']) {
        // Simple fallback quiz generation with variety
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const questions = [];
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const commonWords = {};
        
        // Count word frequency
        words.forEach(word => {
            commonWords[word] = (commonWords[word] || 0) + 1;
        });
        
        // Generate questions with variety from the start
        for (let i = 0; i < desiredCount; i++) {
            const questionType = requestedTypes[i % requestedTypes.length]; // Cycle through requested types only
            const sentence = sentences[i % sentences.length] || sentences[0];
            
            if (questionType === 'multiple_choice') {
                // Multiple choice
                const keyWord = sentence.split(' ').find(w => w.length > 4) || 'content';
                questions.push({
                    id: i + 1,
                    type: 'multiple_choice',
                    question: `What is mentioned in this context: "${sentence.substring(0, 80)}..."?`,
                    choices: [
                        keyWord,
                        'A different concept',
                        'An alternative approach',
                        'A related topic'
                    ],
                    answer: keyWord,
                    explanation: `This question is based on the content: "${sentence.substring(0, 50)}..."`,
                    difficulty: 'easy',
                    topic: 'Content Analysis'
                });
            } else if (questionType === 'true_false') {
                // True/False
                questions.push({
                    id: i + 1,
                    type: 'true_false',
                    question: 'The uploaded text discusses a key concept in detail.',
                    choices: ['True', 'False'],
                    answer: 'True',
                    explanation: 'Based on the provided content analysis.',
                    difficulty: 'easy',
                    topic: 'General'
                });
            } else if (questionType === 'identification') {
                // Identification (fill-in-the-blank)
                const keyWord = sentence.split(' ').find(w => w.length > 4) || 'content';
                questions.push({
                    id: i + 1,
                    type: 'identification',
                    question: `What is the main topic discussed in: "${sentence.substring(0, 50)}..."?`,
                    answer: keyWord,
                    explanation: `The main topic appears to be related to ${keyWord}.`,
                    difficulty: 'easy',
                    topic: 'Content Analysis'
                });
            } else if (questionType === 'enumeration') {
                // Enumeration
                const keyWords = sentence.split(' ').filter(w => w.length > 4).slice(0, 3);
                questions.push({
                    id: i + 1,
                    type: 'enumeration',
                    question: `Name key concepts mentioned in: "${sentence.substring(0, 50)}..."`,
                    answer: keyWords.length > 0 ? keyWords : ['Learning', 'Education'],
                    explanation: 'These are key concepts found in the content.',
                    difficulty: 'easy',
                    topic: 'Content Analysis'
                });
            }
        }


        return {
            title: 'Content-Based Quiz',
            description: 'Quiz generated from content analysis (AI service temporarily unavailable)',
            questions: questions.length > 0 ? questions : [{
                id: 1,
                type: 'multiple_choice',
                question: 'What type of content was uploaded?',
                choices: ['Educational material', 'Technical document', 'General text', 'Other'],
                answer: 'Educational material',
                explanation: 'This is a basic fallback question.',
                difficulty: 'easy',
                topic: 'General'
            }]
        };
    }

    async generateAdvancedQuiz(text, options = {}) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            includeReasoning = true,
            customInstructions = ''
        } = options;

        try {
            // Initialize client if not already done
            this.initializeClient();
            
            const prompt = `You are an expert quiz creator. Create a comprehensive quiz from this text:

${text.substring(0, 10000)} ${text.length > 10000 ? '...[truncated]' : ''}

Create ${numQuestions} questions with these specifications:
- Difficulty: ${difficulty}
- Include reasoning questions: ${includeReasoning}
- Mix of question types: multiple choice, true/false, identification (fill-in-blank), enumeration
- Test both factual knowledge and conceptual understanding
- Ensure questions are fair and unambiguous
- Provide detailed explanations

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Return as valid JSON with this structure:
{
  "title": "Quiz Title",
  "description": "Description",
  "metadata": {
    "difficulty": "${difficulty}",
    "estimatedTime": "X minutes",
    "topics": ["topic1", "topic2"]
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice|true_false|identification|enumeration",
      "question": "Question text",
      "choices": ["A", "B", "C", "D"] (for multiple choice and true/false only),
      "answer": "Correct answer" (string for identification, array for enumeration),
      "explanation": "Detailed explanation",
      "difficulty": "easy|medium|hard",
      "topic": "Topic name",
      "reasoning": "Why this tests understanding" (optional)
    }
  ]
}`;

            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional educational assessment designer with expertise in creating pedagogically sound quizzes and tests.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 6000,
                stream: false
            });

            const quizContent = response.choices[0].message.content;
            return this.parseQuizResponse(quizContent, text, numQuestions);
        } catch (error) {
            console.error('Advanced quiz generation error:', error);
            throw new Error('Failed to generate advanced quiz. Please try again.');
        }
    }

    async generateSummary(text, options = {}) {
        const {
            customInstructions = '',
            focusAreas = []
        } = options;

        try {
            // Initialize client if not already done
            this.initializeClient();
            
            const prompt = this.buildSummaryPrompt(text, {
                customInstructions,
                focusAreas
            });

            const response = await this.makeApiCallWithRetry({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert educational content summarizer specializing in creating clear, concise, and well-structured summaries. You excel at identifying key concepts, main points, and important details while maintaining accuracy and readability.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 4000,
                stream: false
            });

            const summaryContent = response.choices[0].message.content;
            return this.parseSummaryResponse(summaryContent, text);
        } catch (error) {
            console.error('DeepSeek Summary API Error:', error);
            // Return fallback summary instead of throwing error
            console.log('Falling back to simple summary generation...');
            return this.createFallbackSummary(text);
        }
    }

    buildSummaryPrompt(text, options) {
        const { customInstructions, focusAreas } = options;
        
        let prompt = `Please analyze the following text and create a comprehensive lesson summary.

TEXT TO ANALYZE:
${text.substring(0, 12000)} ${text.length > 12000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Focus on main concepts, key points, and important details
- Use clear, concise language suitable for study and review
- Organize information logically with proper structure
- Include bullet points and lists where appropriate
- Highlight the most important information
- Make complex explanations into short, focused sentences
- Ensure the summary is comprehensive yet easy to understand

${focusAreas.length > 0 ? `- Pay special attention to these areas: ${focusAreas.join(', ')}` : ''}

${customInstructions ? `- Additional instructions: ${customInstructions}` : ''}

OUTPUT FORMAT (JSON):
{
  "title": "Summary Title based on content",
  "description": "Brief description of what the summary covers",
  "keyPoints": [
    "Main point 1",
    "Main point 2",
    "Main point 3"
  ],
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with key information",
      "subpoints": [
        "Important detail 1",
        "Important detail 2"
      ]
    }
  ],
  "conclusions": [
    "Key takeaway 1",
    "Key takeaway 2"
  ]
}

STRICT OUTPUT RULES:
- Respond with ONLY the JSON. Do not include code fences, markdown, or commentary.
- Ensure the JSON is valid and properly formatted.
- Focus on the most important and relevant information.
- Use bullet points and lists to make information digestible.
- Keep explanations concise but comprehensive.`;

        return prompt;
    }

    parseSummaryResponse(aiResponse, originalText) {
        try {
            console.log('AI Summary Response received, length:', aiResponse.length);
            console.log('First 500 chars of AI response:', aiResponse.substring(0, 500));
            
            // Normalize common wrappers (remove code fences, stray commentary)
            let content = aiResponse.trim();
            content = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
            
            // Try full parse first
            try {
                const parsed = JSON.parse(content);
                console.log('Successfully parsed JSON summary');
                return this.validateAndCleanSummary(parsed, originalText);
            } catch {}

            // Fallback: extract the largest JSON-looking block
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const summaryData = JSON.parse(jsonMatch[0]);
                return this.validateAndCleanSummary(summaryData, originalText);
            }
            throw new Error('No valid JSON found in AI response');
        } catch (error) {
            console.error('Error parsing AI summary response:', error);
            // Fallback to a simple summary if parsing fails
            return this.createFallbackSummary(originalText);
        }
    }

    validateAndCleanSummary(summaryData, originalText) {
        const cleanedSummary = {
            title: summaryData.title || 'Content Summary',
            description: summaryData.description || 'Summary of the uploaded content',
            keyPoints: summaryData.keyPoints || [],
            sections: summaryData.sections || [],
            conclusions: summaryData.conclusions || []
        };

        // Ensure we have at least some content
        if (cleanedSummary.keyPoints.length === 0 && cleanedSummary.sections.length === 0) {
            return this.createFallbackSummary(originalText);
        }

        return cleanedSummary;
    }

    createFallbackSummary(text) {
        // Simple fallback summary generation
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const commonWords = {};
        
        // Count word frequency
        words.forEach(word => {
            commonWords[word] = (commonWords[word] || 0) + 1;
        });
        
        // Get most common words
        const topWords = Object.entries(commonWords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);

        const keyPoints = sentences.slice(0, 3).map(sentence => 
            sentence.trim().substring(0, 100) + (sentence.length > 100 ? '...' : '')
        );

        return {
            title: 'Content Summary',
            description: 'Summary generated from uploaded content',
            keyPoints: keyPoints.length > 0 ? keyPoints : [
                'The content discusses important concepts and information.',
                'Key topics are covered in detail.',
                'The material provides valuable insights.'
            ],
            sections: [
                {
                    title: 'Main Concepts',
                    content: 'The content covers several important concepts and ideas that are essential for understanding the topic.',
                    subpoints: topWords.slice(0, 3)
                }
            ],
            conclusions: [
                'The content provides valuable information on the topic.',
                'Key concepts are well-explained and easy to understand.'
            ]
        };
    }

    /**
     * Categorize a question using AI
     * @param {Object} question - Question object with stem, choices, answer, explanation, etc.
     * @returns {Promise<{topic: string, category: string, subject: string, keywords: Array, difficulty: string}>}
     */
    async categorizeQuestion(question) {
        try {
            this.initializeClient();

            const questionText = question.question || question.stem || '';
            const choices = question.choices ? JSON.stringify(question.choices) : '';
            const answer = question.answer || question.correctAnswer || '';
            const explanation = question.explanation || '';
            const existingDifficulty = question.difficulty || 'medium';

            const prompt = `Analyze the following question and provide categorization information in JSON format.

Question: ${questionText}
${choices ? `Choices: ${choices}` : ''}
Answer: ${answer}
${explanation ? `Explanation: ${explanation}` : ''}

Please provide a JSON object with the following structure:
{
  "topic": "Main subject area (e.g., 'Biology', 'History', 'Mathematics')",
  "category": "Specific category within the topic (e.g., 'Cell Biology', 'World War II', 'Calculus')",
  "subject": "Academic subject classification (e.g., 'Science', 'Social Studies', 'Math')",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "difficulty": "easy|medium|hard"
}

Rules:
- topic: Should be a broad subject area (max 50 characters)
- category: Should be more specific than topic (max 50 characters, can be null if not applicable)
- subject: Should be a general academic subject classification (max 50 characters)
- keywords: Array of 3-5 relevant keywords extracted from the question
- difficulty: Assess the difficulty level. If the question already has a difficulty, use it unless you strongly disagree.

Return ONLY valid JSON, no additional text.`;

            const cacheKey = shaKey({ method: 'categorizeQuestion', question: questionText });
            const cached = cacheGet(cacheKey);
            if (cached) {
                if (DEBUG_AI) console.log('Cache hit for question categorization');
                return cached;
            }

            const response = await this.makeApiCallWithRetry({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at analyzing and categorizing educational questions. Provide accurate categorization in JSON format only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500,
                stream: false
            });

            const content = response.choices[0].message.content.trim();
            
            // Parse JSON response
            let categorization;
            try {
                // Remove code fences if present
                const cleaned = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
                categorization = JSON.parse(cleaned);
            } catch {
                // Try to extract JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    categorization = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Failed to parse categorization response');
                }
            }

            // Validate and normalize response
            const result = {
                topic: categorization.topic || 'General',
                category: categorization.category || null,
                subject: categorization.subject || null,
                keywords: Array.isArray(categorization.keywords) ? categorization.keywords.slice(0, 5) : [],
                difficulty: ['easy', 'medium', 'hard'].includes(categorization.difficulty?.toLowerCase()) 
                    ? categorization.difficulty.toLowerCase() 
                    : existingDifficulty
            };

            // Cache result for 24 hours
            cacheSet(cacheKey, result, 24 * 60 * 60 * 1000);

            return result;
        } catch (error) {
            console.error('Error categorizing question with AI:', error);
            // Return default categorization on error
            return {
                topic: 'General',
                category: null,
                subject: null,
                keywords: [],
                difficulty: question.difficulty || 'medium'
            };
        }
    }
}

module.exports = new DeepSeekService();


