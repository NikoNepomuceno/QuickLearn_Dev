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
		return await deepSeekService.generateQuizFromText(text, {
			numQuestions,
			difficulty,
			questionTypes,
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



