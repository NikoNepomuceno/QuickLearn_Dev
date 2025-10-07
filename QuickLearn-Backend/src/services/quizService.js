const deepSeekService = require('./deepseekService');

// AI-powered quiz generation using DeepSeek
async function generateAIPoweredQuiz(text, options = {}) {
	const {
		numQuestions = 5,
		difficulty = 'medium',
        questionTypes = ['multiple_choice'],
		focusAreas = []
	} = options;

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

module.exports = { 
	generateAIPoweredQuiz, // AI-powered function using DeepSeek
	generateAdvancedQuiz // Advanced AI function using DeepSeek
};



