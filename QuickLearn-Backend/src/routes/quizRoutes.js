const express = require('express');
const multer = require('multer');
const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz, generateAdvancedQuiz } = require('../services/quizService');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Enhanced quiz generation with AI
router.post('/from-file', upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		const textContent = await parseUploadedFile(req.file);
		if (!textContent || !textContent.trim()) {
			return res.status(400).json({ error: 'Unable to extract text from the uploaded file.' });
		}

		// Parse query parameters for AI options
		const numQuestions = Math.min(20, Number(req.query.count) || 5);
		const difficulty = req.query.difficulty || 'medium';
		const questionTypes = req.query.types ? req.query.types.split(',') : ['multiple_choice'];
		const focusAreas = req.query.focus ? req.query.focus.split(',') : [];

		const quiz = await generateAIPoweredQuiz(textContent, {
			numQuestions,
			difficulty,
			questionTypes,
			focusAreas
		});

		return res.json({ 
			quiz,
			metadata: {
				generatedWithAI: true,
				textLength: textContent.length,
				processingTime: new Date().toISOString()
			}	
		});
	} catch (err) {
		console.error('Error handling /from-file:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Advanced quiz generation endpoint
router.post('/advanced', upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		const textContent = await parseUploadedFile(req.file);
		if (!textContent || !textContent.trim()) {
			return res.status(400).json({ error: 'Unable to extract text from the uploaded file.' });
		}

		// Parse advanced options
		const numQuestions = Math.min(25, Number(req.body.numQuestions) || 10);
		const difficulty = req.body.difficulty || 'medium';
		const includeReasoning = req.body.includeReasoning !== 'false';
		const customInstructions = req.body.customInstructions || '';

		const quiz = await generateAdvancedQuiz(textContent, {
			numQuestions,
			difficulty,
			includeReasoning,
			customInstructions
		});

		return res.json({ 
			quiz,
			metadata: {
				generatedWithAI: true,
				textLength: textContent.length,
				processingTime: new Date().toISOString(),
				options: {
					numQuestions,
					difficulty,
					includeReasoning,
					customInstructions
				}
			}
		});
	} catch (err) {
		console.error('Error handling /advanced:', err);
		return res.status(500).json({ 
			error: err.message || 'Failed to generate advanced quiz' 
		});
	}
});

// Health check for AI service
router.get('/ai-status', (req, res) => {
	const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
	res.json({
		aiAvailable: hasApiKey,
		service: 'DeepSeek AI',
		baseUrl: 'https://api.deepseek.com',
		models: ['deepseek-chat', 'deepseek-reasoner']
	});
});

module.exports = router;



