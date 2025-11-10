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
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'application/msword'
        ];

        if (allowedTypes.includes(file.mimetype) ||
            file.originalname.match(/\.(pdf|docx|pptx|txt|doc)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, PPTX, DOC, and TXT files are allowed.'));
        }
    }
});

// Parse file and return page information
router.post('/parse-file', authenticateToken, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		// Parse the file to extract pages
		const { parseUploadedFile } = require('../utils/parseFile');
		const parseResult = await parseUploadedFile(req.file);
		
		console.log('File parsing result:', {
			fileName: req.file.originalname,
			pageCount: parseResult.pageCount,
			pagesLength: parseResult.pages?.length,
			totalTextLength: parseResult.text.length
		});
		
		return res.json({
			fileName: req.file.originalname,
			fileSize: req.file.size,
			pages: parseResult.pages,
			pageCount: parseResult.pageCount,
			totalTextLength: parseResult.text.length
		});
	} catch (err) {
		console.error('Error parsing file:', err);
		return res.status(500).json({
			error: err.message || 'Failed to parse file'
		});
	}
});

// Create quiz with file upload to cloud storage
router.post('/from-file', authenticateToken, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		// Parse query parameters for AI options
		const requestedCount = Number(req.query.count) || 5;
		const numQuestions = Math.min(50, Math.max(5, requestedCount));
		const difficulty = req.query.difficulty || 'medium';
		let questionTypes = req.query.types ? req.query.types.split(',') : ['multiple_choice'];
		const focusAreas = req.query.focus ? req.query.focus.split(',') : [];

		// Normalize 'mixed' sentinel; actual expansion handled by service layer
		if (questionTypes.length === 1 && questionTypes[0] === 'mixed') {
			questionTypes = ['mixed'];
		}

		// Parse selectedPages from JSON string if it exists
		let selectedPages = [];
		if (req.body.selectedPages) {
			try {
				selectedPages = JSON.parse(req.body.selectedPages);
			} catch (error) {
				console.error('Error parsing selectedPages:', error);
				selectedPages = [];
			}
		}

		const quizOptions = {
			numQuestions,
			difficulty,
			questionTypes,
			focusAreas,
			isAdvanced: false,
			customInstructions: req.body.customInstructions || '',
			selectedPages: selectedPages
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

		// Parse selectedPages from JSON string if it exists
		let selectedPages = [];
		if (req.body.selectedPages) {
			try {
				selectedPages = JSON.parse(req.body.selectedPages);
			} catch (error) {
				console.error('Error parsing selectedPages:', error);
				selectedPages = [];
			}
		}

		const quizOptions = {
			numQuestions,
			difficulty,
			includeReasoning,
			customInstructions,
			selectedPages: selectedPages,
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

// Get trashed quizzes
router.get('/trash/list', authenticateToken, async (req, res) => {
    try {
        const items = await CloudStorageService.getTrashedQuizzes(req.user.id, 100, 0);
        return res.json({ items });
    } catch (err) {
        console.error('Error listing trashed quizzes:', err);
        return res.status(500).json({ error: 'Failed to list trash' });
    }
});

// Restore a trashed quiz
router.post('/:uuid/restore', authenticateToken, async (req, res) => {
    try {
        const ok = await CloudStorageService.restoreQuiz(req.params.uuid, req.user.id);
        if (!ok) return res.status(404).json({ error: 'Quiz not found or not authorized' });
        return res.json({ message: 'Quiz restored' });
    } catch (err) {
        console.error('Error restoring quiz:', err);
        return res.status(500).json({ error: 'Failed to restore quiz' });
    }
});

// Permanently delete a quiz
router.delete('/:uuid/permanent', authenticateToken, async (req, res) => {
    try {
        const ok = await CloudStorageService.deleteQuizPermanently(req.params.uuid, req.user.id);
        if (!ok) return res.status(404).json({ error: 'Quiz not found or not authorized' });
        return res.json({ message: 'Quiz permanently deleted' });
    } catch (err) {
        console.error('Error permanently deleting quiz:', err);
        return res.status(500).json({ error: 'Failed to permanently delete quiz' });
    }
});

// Purge trashed quizzes older than 30 days
router.post('/trash/purge', authenticateToken, async (req, res) => {
    try {
        const days = Number(req.body?.days) || 30;
        const result = await CloudStorageService.purgeTrashedQuizzes(req.user.id, days);
        return res.json(result);
    } catch (err) {
        console.error('Error purging trash:', err);
        return res.status(500).json({ error: 'Failed to purge trash' });
    }
});

// Save quiz attempt
router.post('/:uuid/attempts', authenticateToken, async (req, res) => {
	try {
		const { score, timeSeconds, userAnswers, questionTimesMs } = req.body;

		const attempt = await CloudStorageService.saveQuizAttempt(
			req.params.uuid,
			req.user.id,
			{ score, timeSeconds, userAnswers, questionTimesMs }
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

// Generate summary from file
router.post('/summary', authenticateToken, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
		}

		// Parse selectedPages from JSON string if it exists
		let selectedPages = [];
		if (req.body.selectedPages) {
			try {
				selectedPages = JSON.parse(req.body.selectedPages);
			} catch (error) {
				console.error('Error parsing selectedPages:', error);
				selectedPages = [];
			}
		}

		const summaryOptions = {
			customInstructions: req.body.customInstructions || '',
			focusAreas: req.body.focusAreas ? req.body.focusAreas.split(',') : [],
			selectedPages: selectedPages
		};

		const result = await CloudStorageService.createSummaryWithFile(
			req.file.buffer,
			req.file.originalname,
			req.user.id,
			summaryOptions
		);

		return res.json({
			summary: result.summary,
			metadata: result.metadata
		});
	} catch (err) {
		console.error('Error handling /summary:', err);
		console.error('Error stack:', err.stack);
		return res.status(500).json({
			error: err.message || 'Failed to generate summary',
			details: process.env.NODE_ENV === 'development' ? err.stack : undefined
		});
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



