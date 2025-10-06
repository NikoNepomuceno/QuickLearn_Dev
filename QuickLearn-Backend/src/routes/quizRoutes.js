const express = require('express');
const multer = require('multer');
const CloudStorageService = require('../services/cloudStorageService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/msword'
        ];

        if (allowedTypes.includes(file.mimetype) ||
            file.originalname.match(/\.(pdf|docx|txt|doc)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
        }
    }
});

// Create quiz with file upload to cloud storage
router.post('/from-file', authenticateToken, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		// Parse query parameters for AI options
		const numQuestions = Math.min(20, Number(req.query.count) || 5);
		const difficulty = req.query.difficulty || 'medium';
		const questionTypes = req.query.types ? req.query.types.split(',') : ['multiple_choice'];
		const focusAreas = req.query.focus ? req.query.focus.split(',') : [];

		const quizOptions = {
			numQuestions,
			difficulty,
			questionTypes,
			focusAreas,
			isAdvanced: false
		};

		const result = await CloudStorageService.createQuizWithFile(
			req.file.buffer,
			req.file.originalname,
			req.user.id,
			quizOptions
		);

		return res.json({
			quiz: result.quiz.toJSON(),
			metadata: result.metadata
		});
	} catch (err) {
		console.error('Error handling /from-file:', err);
		return res.status(500).json({
			error: err.message || 'Failed to create quiz'
		});
	}
});

// Advanced quiz generation endpoint with cloud storage
router.post('/advanced', authenticateToken, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		// Parse advanced options
		const numQuestions = Math.min(25, Number(req.body.numQuestions) || 10);
		const difficulty = req.body.difficulty || 'medium';
		const includeReasoning = req.body.includeReasoning !== 'false';
		const customInstructions = req.body.customInstructions || '';

		const quizOptions = {
			numQuestions,
			difficulty,
			includeReasoning,
			customInstructions,
			isAdvanced: true
		};

		const result = await CloudStorageService.createQuizWithFile(
			req.file.buffer,
			req.file.originalname,
			req.user.id,
			quizOptions
		);

		return res.json({
			quiz: result.quiz.toJSON(),
			metadata: result.metadata
		});
	} catch (err) {
		console.error('Error handling /advanced:', err);
		return res.status(500).json({
			error: err.message || 'Failed to generate advanced quiz'
		});
	}
});

// Get user's quizzes
router.get('/', authenticateToken, async (req, res) => {
	try {
		const limit = Math.min(50, Number(req.query.limit) || 20);
		const offset = Math.max(0, Number(req.query.offset) || 0);

		const quizzes = await CloudStorageService.getUserQuizzes(req.user.id, limit, offset);

		return res.json({
			quizzes,
			pagination: {
				limit,
				offset,
				hasMore: quizzes.length === limit
			}
		});
	} catch (err) {
		console.error('Error getting user quizzes:', err);
		return res.status(500).json({ error: 'Failed to get quizzes' });
	}
});

// Get specific quiz by UUID (public access with optional auth)
router.get('/:uuid', optionalAuth, async (req, res) => {
	try {
		const quiz = await CloudStorageService.getQuizByUuid(req.params.uuid, req.user?.id);

		if (!quiz) {
			return res.status(404).json({ error: 'Quiz not found' });
		}

		return res.json({ quiz });
	} catch (err) {
		console.error('Error getting quiz:', err);
		return res.status(500).json({ error: 'Failed to get quiz' });
	}
});

// Delete quiz
router.delete('/:uuid', authenticateToken, async (req, res) => {
	try {
		const deleted = await CloudStorageService.deleteQuiz(req.params.uuid, req.user.id);

		if (!deleted) {
			return res.status(404).json({ error: 'Quiz not found or not authorized' });
		}

		return res.json({ message: 'Quiz deleted successfully' });
	} catch (err) {
		console.error('Error deleting quiz:', err);
		return res.status(500).json({ error: 'Failed to delete quiz' });
	}
});

// Save quiz attempt
router.post('/:uuid/attempts', authenticateToken, async (req, res) => {
	try {
		const { score, timeSeconds, userAnswers } = req.body;

		const attempt = await CloudStorageService.saveQuizAttempt(
			req.params.uuid,
			req.user.id,
			{ score, timeSeconds, userAnswers }
		);

		return res.json({ attempt });
	} catch (err) {
		console.error('Error saving quiz attempt:', err);
		return res.status(500).json({ error: 'Failed to save attempt' });
	}
});

// Get quiz attempts
router.get('/:uuid/attempts', authenticateToken, async (req, res) => {
	try {
		const attempts = await CloudStorageService.getQuizAttempts(req.params.uuid, req.user.id);
		return res.json({ attempts });
	} catch (err) {
		console.error('Error getting quiz attempts:', err);
		return res.status(500).json({ error: 'Failed to get attempts' });
	}
});

// Get quiz file information
router.get('/:uuid/file', authenticateToken, async (req, res) => {
	try {
		const file = await CloudStorageService.getQuizFile(req.params.uuid, req.user.id);

		if (!file) {
			return res.status(404).json({ error: 'File not found' });
		}

		return res.json({ file });
	} catch (err) {
		console.error('Error getting quiz file:', err);
		return res.status(500).json({ error: 'Failed to get file' });
	}
});

// Health check for AI service
router.get('/system/ai-status', (req, res) => {
	const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
	res.json({
		aiAvailable: hasApiKey,
		service: 'DeepSeek AI',
		baseUrl: 'https://api.deepseek.com',
		models: ['deepseek-chat', 'deepseek-reasoner']
	});
});

module.exports = router;



