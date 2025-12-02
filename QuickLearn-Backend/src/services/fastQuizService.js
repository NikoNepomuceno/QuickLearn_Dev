const { GoogleGenAI, Type, Schema } = require('@google/genai');

class FastQuizService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    initializeClient() {
        if (!this.initialized) {
            const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('Google GenAI API key not configured. Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY');
            }
            
            this.client = new GoogleGenAI({ apiKey: apiKey });
            this.initialized = true;
        }
        return this.client;
    }

    getQuizSchema() {
        return {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    question: { type: Type.STRING },
                    choices: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Only for Multiple Choice and True/False. For MCQ provide 4 options, for T/F provide ['True', 'False']."
                    },
                    answer: {
                        type: Type.STRING,
                        description: "The correct answer. For True/False use 'True' or 'False'. For MCQ use the exact option text. For Enumeration, use comma-separated string."
                    },
                    explanation: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    topic: { type: Type.STRING }
                },
                required: ["id", "type", "question", "answer"],
            }
        };
    }

    async generateQuizFromText(text, options = {}) {
        const {
            numQuestions = 10,
            difficulty = 'medium',
            questionTypes = ['multiple_choice'],
            focusAreas = []
        } = options;

        try {
            this.initializeClient();
            
            // Normalize question types
            let normalizedTypes = questionTypes;
            const allTypes = ['multiple_choice', 'true_false', 'identification', 'enumeration'];
            if (Array.isArray(questionTypes)) {
                const set = new Set(questionTypes);
                const isMixed = questionTypes.length === 1 && questionTypes[0] === 'mixed';
                const isAllSelected = allTypes.every(t => set.has(t));
                if (isMixed || isAllSelected) {
                    normalizedTypes = allTypes;
                }
            }

            const typeString = normalizedTypes.join(", ");
            
            const prompt = `You are an expert educational quiz generator. 
Analyze the provided text and generate exactly ${numQuestions} quiz questions.

The questions should be a mix of the following types: ${typeString}.

Rules:
1. For 'multiple_choice', provide 4 distinct options and one correct answer.
2. For 'true_false', the answer must be 'True' or 'False', and choices must be ['True', 'False'].
3. For 'identification', provide a clear question where the answer is a specific key term from the text.
4. For 'enumeration', ask to list items. Format the answer as a comma-separated string (e.g., "Item1, Item2, Item3").
5. Ensure questions are directly answerable from the text provided.
6. Difficulty level: ${difficulty}
${focusAreas.length > 0 ? `7. Pay special attention to: ${focusAreas.join(', ')}` : ''}

Text Content to Analyze:
"${text.substring(0, 50000)}"${text.length > 50000 ? '...[truncated]' : ''}`;

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: this.getQuizSchema(),
                    systemInstruction: "You are a helpful and strict teacher generating a quiz JSON. Return exactly the requested number of questions.",
                }
            });

            const jsonText = response.text;
            if (!jsonText) {
                throw new Error("No data returned from Gemini");
            }

            const questions = JSON.parse(jsonText);
            return this.formatResponse(questions, numQuestions, normalizedTypes, difficulty);
        } catch (error) {
            console.error("[FastQuiz] Gemini API Error:", error);
            throw new Error("Failed to generate quiz with Gemini. Please try again.");
        }
    }

    formatResponse(questions, desiredCount, requestedTypes, difficulty) {
        // Ensure questions array
        if (!Array.isArray(questions)) {
            questions = [questions];
        }

        // Map Gemini format to our format
        const formattedQuestions = questions.slice(0, desiredCount).map((q, index) => {
            const questionType = q.type || 'multiple_choice';
            
            // Handle enumeration answer (comma-separated string -> array)
            let answer = q.answer;
            if (questionType === 'enumeration' && typeof answer === 'string') {
                answer = answer.split(',').map(item => item.trim()).filter(Boolean);
            }

            // Ensure choices for MCQ and T/F
            let choices = q.choices || [];
            if (questionType === 'true_false' && (!choices || choices.length === 0)) {
                choices = ['True', 'False'];
            }

            return {
                id: q.id || (index + 1),
                type: questionType,
                question: q.question || '',
                choices: (questionType === 'multiple_choice' || questionType === 'true_false') ? choices : undefined,
                answer: answer,
                explanation: q.explanation || 'No explanation provided',
                difficulty: q.difficulty || difficulty,
                topic: q.topic || 'General'
            };
        });

        // Ensure we have exactly desiredCount
        while (formattedQuestions.length < desiredCount) {
            const lastQ = formattedQuestions[formattedQuestions.length - 1] || formattedQuestions[0];
            if (lastQ) {
                formattedQuestions.push({
                    ...lastQ,
                    id: formattedQuestions.length + 1
                });
            } else {
                break;
            }
        }

        return {
            title: 'Quick Quiz',
            description: 'Quiz generated quickly using Gemini AI',
            questions: formattedQuestions.slice(0, desiredCount)
        };
    }

    getSummarySchema() {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                keyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                sections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            subpoints: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["title", "content"]
                    }
                },
                conclusions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ["title", "keyPoints"]
        };
    }

    async generateSummaryFromText(text, options = {}) {
        const {
            customInstructions = '',
            focusAreas = []
        } = options;

        try {
            this.initializeClient();

            const prompt = `Please analyze the following text and create a comprehensive lesson summary.

TEXT TO ANALYZE:
${text.substring(0, 50000)}${text.length > 50000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Focus on main concepts, key points, and important details
- Use clear, concise language suitable for study and review
- Organize information logically with proper structure
- Include bullet points and lists where appropriate
- Highlight the most important information
- Make complex explanations into short, focused sentences
- Ensure the summary is comprehensive yet easy to understand
${focusAreas.length > 0 ? `- Pay special attention to these areas: ${focusAreas.join(', ')}` : ''}
${customInstructions ? `- Additional instructions: ${customInstructions}` : ''}`;

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: this.getSummarySchema(),
                    systemInstruction: "You are an expert educational content summarizer. Create clear, concise, and well-structured summaries in JSON format.",
                }
            });

            const jsonText = response.text;
            if (!jsonText) {
                throw new Error("No data returned from Gemini");
            }

            const summary = JSON.parse(jsonText);
            return this.formatSummaryResponse(summary);
        } catch (error) {
            console.error("[FastQuiz] Gemini Summary API Error:", error);
            throw new Error("Failed to generate summary with Gemini. Please try again.");
        }
    }

    formatSummaryResponse(summary) {
        return {
            title: summary.title || 'Content Summary',
            description: summary.description || 'Summary of the uploaded content',
            keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
            sections: Array.isArray(summary.sections) ? summary.sections : [],
            conclusions: Array.isArray(summary.conclusions) ? summary.conclusions : []
        };
    }

    getFlashcardsSchema() {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                cards: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            front: { type: Type.STRING },
                            back: { type: Type.STRING }
                        },
                        required: ["front", "back"]
                    }
                }
            },
            required: ["title", "cards"]
        };
    }

    async generateFlashcardsFromText(text, options = {}) {
        const { customInstructions = '' } = options;

        try {
            this.initializeClient();

            const prompt = `Create a set of concise study flashcards from the text below.

TEXT:
${text.substring(0, 50000)}${text.length > 50000 ? '...[truncated]' : ''}

REQUIREMENTS:
- Create between 8 and 16 flashcards depending on content richness
- Each card must have a "front" and "back"
- "Front" should be a short question/term; "Back" should be a clear answer/definition
- Keep language simple and direct; avoid long paragraphs
- Prefer one concept per card
${customInstructions ? `- Additional instructions: ${customInstructions}` : ''}`;

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: this.getFlashcardsSchema(),
                    systemInstruction: "You are an expert at creating concise, high-quality flashcards for studying. Generate clear front/back cards in JSON format.",
                }
            });

            const jsonText = response.text;
            if (!jsonText) {
                throw new Error("No data returned from Gemini");
            }

            const flashcards = JSON.parse(jsonText);
            return this.formatFlashcardsResponse(flashcards);
        } catch (error) {
            console.error("[FastQuiz] Gemini Flashcards API Error:", error);
            throw new Error("Failed to generate flashcards with Gemini. Please try again.");
        }
    }

    formatFlashcardsResponse(flashcards) {
        const title = flashcards.title || 'Flashcards';
        let cards = Array.isArray(flashcards.cards) ? flashcards.cards : [];
        
        // Validate and clean cards
        cards = cards
            .filter(c => c && typeof c.front === 'string' && typeof c.back === 'string')
            .map(c => ({
                front: c.front.trim(),
                back: c.back.trim()
            }))
            .filter(c => c.front.length > 0 && c.back.length > 0);

        // Ensure minimum cards
        if (cards.length === 0) {
            cards = [{
                front: 'What is the main topic?',
                back: 'The content discusses important concepts and information.'
            }];
        }

        return {
            title,
            cards
        };
    }
}

module.exports = new FastQuizService();

