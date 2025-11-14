const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const questionBankService = require('../services/questionBankService');

const router = express.Router();

/**
 * GET /api/question-bank
 * Get user's questions with optional filters and pagination
 * Query params: topic, category, difficulty, type, search, page, limit
 * Triggers extraction if no questions exist (on-demand)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if user has any questions
        const count = await require('../models/QuestionBank').countByUserId(userId);
        
        // If no questions, trigger extraction on-demand
        if (count === 0) {
            try {
                await questionBankService.extractAllQuestions(userId);
            } catch (extractError) {
                console.error('Error during on-demand extraction:', extractError);
                // Continue even if extraction fails - return empty result
            }
        }
        
        // Parse filters from query params
        const filters = {
            topic: req.query.topic || null,
            category: req.query.category || null,
            difficulty: req.query.difficulty 
                ? (Array.isArray(req.query.difficulty) ? req.query.difficulty : [req.query.difficulty])
                : [],
            type: req.query.type
                ? (Array.isArray(req.query.type) ? req.query.type : [req.query.type])
                : [],
            search: req.query.search || null
        };
        
        // Parse pagination
        const pagination = {
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 20, 100) // Max 100 per page
        };
        
        const result = await questionBankService.getUserQuestions(userId, filters, pagination);
        
        return res.json(result);
    } catch (error) {
        console.error('Error getting questions:', error);
        return res.status(500).json({ error: error.message || 'Failed to get questions' });
    }
});

/**
 * POST /api/question-bank/extract
 * Manually trigger extraction from all user's quizzes
 */
router.post('/extract', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await questionBankService.extractAllQuestions(userId);
        
        return res.json({
            extracted: result.extracted,
            skipped: result.skipped,
            processed: result.processed,
            message: `Successfully extracted ${result.extracted} questions from ${result.processed} quizzes.`
        });
    } catch (error) {
        console.error('Error extracting questions:', error);
        return res.status(500).json({ error: error.message || 'Failed to extract questions' });
    }
});

/**
 * POST /api/question-bank/custom-quiz
 * Create custom quiz from selected questions
 * Body: { title, description, questionIds: [] }
 */
router.post('/custom-quiz', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, questionIds } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Quiz title is required' });
        }
        
        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({ error: 'At least one question is required' });
        }
        
        const result = await questionBankService.createCustomQuiz(userId, {
            title,
            description,
            questionIds
        });
        
        return res.json(result);
    } catch (error) {
        console.error('Error creating custom quiz:', error);
        return res.status(500).json({ error: error.message || 'Failed to create custom quiz' });
    }
});

/**
 * GET /api/question-bank/stats
 * Get question bank statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const stats = await questionBankService.getStats(userId);
        
        return res.json({ stats });
    } catch (error) {
        console.error('Error getting stats:', error);
        return res.status(500).json({ error: error.message || 'Failed to get statistics' });
    }
});

module.exports = router;

