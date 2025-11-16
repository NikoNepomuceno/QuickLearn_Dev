const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const CloudStorageService = require('../services/cloudStorageService');

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

// List user flashcards
router.get('/', authenticateToken, async (req, res) => {
	try {
		const limitRaw = Number(req.query.limit);
		const offsetRaw = Number(req.query.offset);
		const limit = isNaN(limitRaw) ? 20 : Math.min(50, Math.max(1, limitRaw));
		const offset = isNaN(offsetRaw) ? 0 : Math.max(0, Math.floor(offsetRaw));
		const items = await CloudStorageService.getUserFlashcards(req.user.id, limit, offset);
		return res.json({ flashcards: items, pagination: { limit, offset, hasMore: items.length === limit } });
	} catch (err) {
		console.error('Error listing flashcards:', err);
		return res.status(500).json({ error: 'Failed to get flashcards' });
	}
});

// Create flashcards from file
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
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

		const options = {
			customInstructions: req.body.customInstructions || '',
			selectedPages
		};

		const result = await CloudStorageService.createFlashcardsWithFile(
			req.file.buffer,
			req.file.originalname,
			req.user.id,
			options
		);

		return res.json(result);
	} catch (err) {
		console.error('Error creating flashcards:', err);
		return res.status(500).json({
			error: err.message || 'Failed to create flashcards'
		});
	}
});

// Get flashcards by UUID
router.get('/:uuid', authenticateToken, async (req, res) => {
	try {
		const fc = await CloudStorageService.getFlashcards(req.params.uuid, req.user.id);
		if (!fc) return res.status(404).json({ error: 'Flashcards not found' });
		return res.json({ flashcards: fc });
	} catch (err) {
		console.error('Error getting flashcards:', err);
		return res.status(500).json({ error: 'Failed to get flashcards' });
	}
});

// Update flashcards
router.patch('/:uuid', authenticateToken, async (req, res) => {
	try {
		const updated = await CloudStorageService.updateFlashcards(req.params.uuid, req.user.id, req.body || {});
		if (!updated) return res.status(404).json({ error: 'Flashcards not found or not authorized' });
		return res.json({ flashcards: updated });
	} catch (err) {
		console.error('Error updating flashcards:', err);
		return res.status(500).json({ error: 'Failed to update flashcards' });
	}
});

module.exports = router;


