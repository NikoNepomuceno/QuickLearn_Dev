const OpenAI = require('openai');

class DeepSeekService {
    constructor() {
        this.client = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });
    }

    async generateQuizFromText(text, options = {}) {
        const {
            numQuestions = 5,
            difficulty = 'medium',
            questionTypes = ['multiple_choice'],
            focusAreas = []
        } = options;

        try {
            const prompt = this.buildQuizPrompt(text, {
                numQuestions,
                difficulty,
                questionTypes,
                focusAreas
            });

            const response = await this.client.chat.completions.create({
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
                max_tokens: 4000,
                stream: false
            });

            const quizContent = response.choices[0].message.content;
            return this.parseQuizResponse(quizContent, text);
        } catch (error) {
            console.error('DeepSeek API Error:', error);
            throw new Error('Failed to generate quiz with AI. Please try again.');
        }
    }

    buildQuizPrompt(text, options) {
        const { numQuestions, difficulty, questionTypes, focusAreas } = options;
        
        let prompt = `Please analyze the following text and create ${numQuestions} high-quality quiz questions.

TEXT TO ANALYZE:
${text.substring(0, 8000)} ${text.length > 8000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Generate exactly ${numQuestions} questions
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')}
- Focus on key concepts, important facts, and main ideas
- Ensure questions test comprehension, not just memorization
- Make distractors plausible but clearly incorrect
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

Please ensure the JSON is valid and properly formatted.`;

        return prompt;
    }

    parseQuizResponse(aiResponse, originalText) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const quizData = JSON.parse(jsonMatch[0]);
                
                // Validate and clean the quiz data
                return this.validateAndCleanQuiz(quizData, originalText);
            } else {
                throw new Error('No valid JSON found in AI response');
            }
        } catch (error) {
            console.error('Error parsing AI response:', error);
            // Fallback to a simple quiz if parsing fails
            return this.createFallbackQuiz(originalText);
        }
    }

    validateAndCleanQuiz(quizData, originalText) {
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

        // If no valid questions were found, create a fallback
        if (cleanedQuiz.questions.length === 0) {
            return this.createFallbackQuiz(originalText);
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

    createFallbackQuiz(text) {
        // Simple fallback quiz generation
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const questions = [];

        for (let i = 0; i < Math.min(3, sentences.length); i++) {
            const sentence = sentences[i].trim();
            if (sentence.length > 50) {
                questions.push({
                    id: i + 1,
                    type: 'multiple_choice',
                    question: `Based on the content: "${sentence.substring(0, 100)}...", what is the main topic?`,
                    choices: ['General concept', 'Specific detail', 'Method or process', 'Theory or principle'],
                    answer: 'General concept',
                    explanation: 'This is a fallback question generated when AI parsing fails.',
                    difficulty: 'easy',
                    topic: 'General'
                });
            }
        }

        return {
            title: 'Fallback Quiz',
            description: 'Basic quiz generated due to AI processing issues',
            questions
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
            return this.parseQuizResponse(quizContent, text);
        } catch (error) {
            console.error('Advanced quiz generation error:', error);
            throw new Error('Failed to generate advanced quiz. Please try again.');
        }
    }
}

module.exports = new DeepSeekService();


