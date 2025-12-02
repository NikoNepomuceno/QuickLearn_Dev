const deepSeekService = require('./deepseekService');
const fastQuizService = require('./fastQuizService');

// AI-powered quiz generation using DeepSeek or Gemini (fast service)
async function generateAIPoweredQuiz(text, options = {}) {
	const {
		numQuestions = 5,
		difficulty = 'medium',
        questionTypes = ['multiple_choice'],
		focusAreas = []
	} = options;

	// Route to fast Gemini service for 10-25 questions
	if (numQuestions >= 10 && numQuestions <= 25) {
		try {
			console.log(`[Quiz] Using Gemini fast service for ${numQuestions} questions`);
			return await fastQuizService.generateQuizFromText(text, {
				numQuestions,
				difficulty,
				questionTypes,
				focusAreas
			});
		} catch (error) {
			console.error('[Quiz] Gemini fast service failed, falling back to DeepSeek:', error);
			// Fallback to DeepSeek if Gemini fails
		}
	}

	// Use DeepSeek for <10, >25 questions, or if fast service unavailable
	if (!process.env.DEEPSEEK_API_KEY) {
		throw new Error('DeepSeek API key not configured. Please set DEEPSEEK_API_KEY environment variable.');
	}

    try {
        // Expand 'mixed' (or full selection) to full list so the AI prompt receives explicit types
        let normalizedTypes = questionTypes;
        const allTypes = ['multiple_choice', 'true_false', 'identification', 'enumeration'];
        if (Array.isArray(questionTypes)) {
            const set = new Set(questionTypes);
            const isMixedSentinel = questionTypes.length === 1 && questionTypes[0] === 'mixed';
            const isAllSelected = allTypes.every(t => set.has(t));
            if (isMixedSentinel || isAllSelected) {
                normalizedTypes = allTypes;
            }
        } else if (typeof questionTypes === 'string' && questionTypes === 'mixed') {
            normalizedTypes = allTypes;
        }

        return await deepSeekService.generateQuizFromText(text, {
            numQuestions,
            difficulty,
            questionTypes: normalizedTypes,
            focusAreas
        });
	} catch (error) {
		console.error('DeepSeek quiz generation failed:', error);
		throw new Error('Failed to generate quiz with DeepSeek AI. Please try again.');
	}
}

// Advanced quiz generation with more options
async function generateAdvancedQuiz(text, options = {}) {
	const {
		numQuestions = 10,
		difficulty = 'medium',
		includeReasoning = true,
		customInstructions = ''
	} = options;

	try {
		if (process.env.DEEPSEEK_API_KEY) {
			return await deepSeekService.generateAdvancedQuiz(text, {
				numQuestions,
				difficulty,
				includeReasoning,
				customInstructions
			});
		} else {
			throw new Error('DeepSeek API key not configured');
		}
	} catch (error) {
		console.error('Advanced quiz generation failed:', error);
		throw error;
	}
}

// AI-powered summary generation using DeepSeek or Gemini (fast service)
async function generateAIPoweredSummary(text, options = {}) {
	const {
		customInstructions = '',
		focusAreas = []
	} = options;

	// Try Gemini first for faster generation
	try {
		console.log('[Summary] Using Gemini fast service for summary generation');
		return await fastQuizService.generateSummaryFromText(text, {
			customInstructions,
			focusAreas
		});
	} catch (error) {
		console.error('[Summary] Gemini fast service failed, falling back to DeepSeek:', error);
		// Fallback to DeepSeek if Gemini fails
	}

	if (!process.env.DEEPSEEK_API_KEY) {
		throw new Error('DeepSeek API key not configured. Please set DEEPSEEK_API_KEY environment variable.');
	}

    try {
        return await deepSeekService.generateSummary(text, {
            customInstructions,
            focusAreas
        });
	} catch (error) {
		console.error('DeepSeek summary generation failed:', error);
		throw new Error('Failed to generate summary with DeepSeek AI. Please try again.');
	}
}

// AI-powered flashcards generation using DeepSeek or Gemini (fast service)
async function generateAIPoweredFlashcards(text, options = {}) {
	const {
		customInstructions = ''
	} = options;

	// Try Gemini first for faster generation
	try {
		console.log('[Flashcards] Using Gemini fast service for flashcards generation');
		return await fastQuizService.generateFlashcardsFromText(text, {
			customInstructions
		});
	} catch (error) {
		console.error('[Flashcards] Gemini fast service failed, falling back to DeepSeek:', error);
		// Fallback to DeepSeek if Gemini fails
	}

	if (!process.env.DEEPSEEK_API_KEY) {
		// Fallback without throwing
		return deepSeekService.createFallbackFlashcards(text);
	}

	try {
		return await deepSeekService.generateFlashcardsFromText(text, {
			customInstructions
		});
	} catch (error) {
		console.error('DeepSeek flashcards generation failed:', error);
		// Fallback rather than throwing
		return deepSeekService.createFallbackFlashcards(text);
	}
}

module.exports = { 
	generateAIPoweredQuiz, // AI-powered function using DeepSeek
	generateAdvancedQuiz, // Advanced AI function using DeepSeek
	generateAIPoweredSummary, // AI-powered summary function using DeepSeek
    generateAIPoweredFlashcards // AI-powered flashcards function using DeepSeek
};



