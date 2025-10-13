const OpenAI = require('openai');

class DeepSeekService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    initializeClient() {
        if (!this.initialized) {
            if (!process.env.DEEPSEEK_API_KEY) {
                throw new Error('DEEPSEEK_API_KEY environment variable is not set');
            }
            this.client = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: process.env.DEEPSEEK_API_KEY,
                timeout: 60000, // 60 seconds timeout
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
            // Initialize client if not already done
            this.initializeClient();
            
            const prompt = this.buildQuizPrompt(text, {
                numQuestions,
                difficulty,
                questionTypes,
                focusAreas
            });

            const response = await this.makeApiCallWithRetry({
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
            });

            const quizContent = response.choices[0].message.content;
            return this.parseQuizResponse(quizContent, text, numQuestions, questionTypes);
        } catch (error) {
            console.error('DeepSeek API Error:', error);
            // Return fallback quiz instead of throwing error
            console.log('Falling back to simple quiz generation...');
            return this.createFallbackQuiz(text, numQuestions, questionTypes);
        }
    }

    async makeApiCallWithRetry(requestData, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`DeepSeek API attempt ${attempt}/${maxRetries}`);
                const response = await this.client.chat.completions.create(requestData);
                return response;
            } catch (error) {
                lastError = error;
                console.error(`DeepSeek API attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    buildQuizPrompt(text, options) {
        const { numQuestions, difficulty, questionTypes, focusAreas } = options;
        
        console.log('Building prompt with question types:', questionTypes);
        
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
            console.log('AI Response received, length:', aiResponse.length);
            console.log('First 500 chars of AI response:', aiResponse.substring(0, 500));
            
            // Normalize common wrappers (remove code fences, stray commentary)
            let content = aiResponse.trim();
            content = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
            // Try full parse first
            try {
                const parsed = JSON.parse(content);
                console.log('Successfully parsed JSON, questions count:', parsed.questions?.length);
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
            console.error('Error parsing AI response:', error);
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
                        console.log(`Filtering out question type: ${questionType} (not in requested types: ${requestedTypes.join(', ')})`);
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
        
        // Get most common words
        const topWords = Object.entries(commonWords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);

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
}

module.exports = new DeepSeekService();


