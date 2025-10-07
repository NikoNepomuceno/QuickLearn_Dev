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
            return this.parseQuizResponse(quizContent, text, numQuestions);
        } catch (error) {
            console.error('DeepSeek API Error:', error);
            // Return fallback quiz instead of throwing error
            console.log('Falling back to simple quiz generation...');
            return this.createFallbackQuiz(text, numQuestions);
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
        
        let prompt = `Please analyze the following text and create ${numQuestions} high-quality quiz questions.

TEXT TO ANALYZE:
${text.substring(0, 8000)} ${text.length > 8000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Generate exactly ${numQuestions} questions. If unsure, synthesize plausible questions from the text so the total equals ${numQuestions}.
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')}
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
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text here",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct answer",
      "explanation": "Why this answer is correct",
      "difficulty": "easy|medium|hard",
      "topic": "Main topic this question covers"
    }
  ]
}

STRICT OUTPUT RULES:
- Respond with ONLY the JSON. Do not include code fences, markdown, or commentary.
- The questions array MUST have exactly ${numQuestions} items.

Please ensure the JSON is valid and properly formatted.`;

        return prompt;
    }

    parseQuizResponse(aiResponse, originalText, desiredCount = 5) {
        try {
            // Normalize common wrappers (remove code fences, stray commentary)
            let content = aiResponse.trim();
            content = content.replace(/^```json\s*|^```\s*|\s*```$/gmi, '');
            // Try full parse first
            try {
                const parsed = JSON.parse(content);
                return this.validateAndCleanQuiz(parsed, originalText, desiredCount);
            } catch {}

            // Fallback: extract the largest JSON-looking block
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const quizData = JSON.parse(jsonMatch[0]);
                return this.validateAndCleanQuiz(quizData, originalText, desiredCount);
            }
            throw new Error('No valid JSON found in AI response');
        } catch (error) {
            console.error('Error parsing AI response:', error);
            // Fallback to a simple quiz if parsing fails
            return this.createFallbackQuiz(originalText, desiredCount);
        }
    }

    validateAndCleanQuiz(quizData, originalText, desiredCount = 5) {
        const cleanedQuiz = {
            title: quizData.title || 'AI Generated Quiz',
            description: quizData.description || 'Quiz generated from uploaded content',
            questions: []
        };

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach((q, index) => {
                if (this.isValidQuestion(q)) {
                    cleanedQuiz.questions.push({
                        id: index + 1,
                        type: q.type || 'multiple_choice',
                        question: q.question || '',
                        choices: q.choices || [],
                        answer: q.answer || '',
                        explanation: q.explanation || 'No explanation provided',
                        difficulty: q.difficulty || 'medium',
                        topic: q.topic || 'General'
                    });
                }
            });
        }

        // Ensure exact desiredCount
        if (cleanedQuiz.questions.length === 0) {
            return this.createFallbackQuiz(originalText, desiredCount);
        }
        if (cleanedQuiz.questions.length > desiredCount) {
            cleanedQuiz.questions = cleanedQuiz.questions.slice(0, desiredCount).map((q, i) => ({ ...q, id: i + 1 }));
        } else if (cleanedQuiz.questions.length < desiredCount) {
            // Top up by generating additional fallback questions
            const extra = this.createFallbackQuiz(originalText, desiredCount - cleanedQuiz.questions.length).questions;
            const merged = cleanedQuiz.questions.concat(extra);
            cleanedQuiz.questions = merged.slice(0, desiredCount).map((q, i) => ({ ...q, id: i + 1 }));
        }

        return cleanedQuiz;
    }

    isValidQuestion(question) {
        return question &&
               question.question &&
               question.question.trim().length > 10 &&
               question.choices &&
               Array.isArray(question.choices) &&
               question.choices.length >= 2 &&
               question.answer &&
               question.choices.includes(question.answer);
    }

    createFallbackQuiz(text, desiredCount = 5) {
        // Simple fallback quiz generation
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

        // Generate questions based on content
        const limit = Math.max(1, Math.min(desiredCount - 1, sentences.length));
        for (let i = 0; i < limit; i++) {
            const sentence = sentences[i].trim();
            if (sentence.length > 30) {
                const words = sentence.split(' ');
                const keyWord = words.find(w => w.length > 4) || words[Math.floor(words.length/2)];
                
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
            }
        }

        // Add a question about key terms if we have them
        if (topWords.length > 0 && questions.length < desiredCount) {
            questions.push({
                id: questions.length + 1,
                type: 'multiple_choice',
                question: `Which of these terms appears most frequently in the content?`,
                choices: [
                    topWords[0],
                    topWords[1] || 'Alternative term',
                    topWords[2] || 'Different term',
                    'None of the above'
                ],
                answer: topWords[0],
                explanation: `The term "${topWords[0]}" appears most frequently in the content.`,
                difficulty: 'medium',
                topic: 'Content Analysis'
            });
        }

        // Pad if still short: create simple true/false style questions
        while (questions.length < desiredCount) {
            const id = questions.length + 1;
            questions.push({
                id,
                type: 'true_false',
                question: 'The uploaded text discusses a key concept in detail.',
                choices: ['True', 'False'],
                answer: 'True',
                explanation: 'Based on the provided content analysis.',
                difficulty: 'easy',
                topic: 'General'
            });
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
- Mix of question types: multiple choice, true/false, fill-in-blank
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
      "type": "multiple_choice|true_false|fill_blank",
      "question": "Question text",
      "choices": ["A", "B", "C", "D"] (for multiple choice),
      "answer": "Correct answer",
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


