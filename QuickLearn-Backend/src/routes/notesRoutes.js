const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const CloudStorageService = require('../services/cloudStorageService');

const router = express.Router();

// List user summaries
router.get('/', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(50, Number(req.query.limit) || 20);
        const offset = Math.max(0, Number(req.query.offset) || 0);
        const summaries = await CloudStorageService.getUserSummaries(req.user.id, limit, offset);
        return res.json({ summaries, pagination: { limit, offset, hasMore: summaries.length === limit } });
    } catch (err) {
        console.error('Error listing summaries:', err);
        return res.status(500).json({ error: 'Failed to get summaries' });
    }
});

// Soft delete (move to trash)
router.delete('/:uuid', authenticateToken, async (req, res) => {
    try {
        const ok = await CloudStorageService.deleteSummary(req.params.uuid, req.user.id);
        if (!ok) return res.status(404).json({ error: 'Summary not found or not authorized' });
        return res.json({ message: 'Summary moved to trash' });
    } catch (err) {
        console.error('Error deleting summary:', err);
        return res.status(500).json({ error: 'Failed to delete summary' });
    }
});

// List trashed summaries
router.get('/trash/list', authenticateToken, async (req, res) => {
    try {
        const items = await CloudStorageService.getTrashedSummaries(req.user.id, 100, 0);
        return res.json({ items });
    } catch (err) {
        console.error('Error listing trashed summaries:', err);
        return res.status(500).json({ error: 'Failed to list trash' });
    }
});

// Restore
router.post('/:uuid/restore', authenticateToken, async (req, res) => {
    try {
        const ok = await CloudStorageService.restoreSummary(req.params.uuid, req.user.id);
        if (!ok) return res.status(404).json({ error: 'Summary not found or not authorized' });
        return res.json({ message: 'Summary restored' });
    } catch (err) {
        console.error('Error restoring summary:', err);
        return res.status(500).json({ error: 'Failed to restore summary' });
    }
});

// Permanently delete
router.delete('/:uuid/permanent', authenticateToken, async (req, res) => {
    try {
        const ok = await CloudStorageService.deleteSummaryPermanently(req.params.uuid, req.user.id);
        if (!ok) return res.status(404).json({ error: 'Summary not found or not authorized' });
        return res.json({ message: 'Summary permanently deleted' });
    } catch (err) {
        console.error('Error permanently deleting summary:', err);
        return res.status(500).json({ error: 'Failed to permanently delete summary' });
    }
});

module.exports = router;


