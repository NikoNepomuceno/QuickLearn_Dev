const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const AchievementService = require('../services/achievementService');

const router = express.Router();

// Get user's earned achievements
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const achievements = await AchievementService.getUserAchievements(req.user.id);
        res.json({ achievements });
    } catch (error) {
        console.error('Error fetching user achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Get all available achievements with progress
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const achievements = await AchievementService.getAllAchievementsWithProgress(req.user.id);
        res.json({ achievements });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Get specific achievement progress
router.get('/:code/progress', authenticateToken, async (req, res) => {
    try {
        const progress = await AchievementService.getAchievementProgress(
            req.user.id,
            req.params.code
        );
        
        if (!progress) {
            return res.status(404).json({ error: 'Achievement not found' });
        }
        
        res.json(progress);
    } catch (error) {
        console.error('Error fetching achievement progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

module.exports = router;

