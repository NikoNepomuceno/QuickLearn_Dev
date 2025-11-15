const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const AdaptiveQuestion = require('../models/AdaptiveQuestion');
const adaptiveService = require('../services/adaptiveService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create adaptive session
router.post('/sessions', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Field name should be "file".' });
        }

        let selectedPages = [];
        if (req.body.selectedPages) {
            try { selectedPages = JSON.parse(req.body.selectedPages); } catch {}
        }

        const maxQuestions = Math.min(50, Number(req.body.maxQuestions) || 20);

        const { session, question } = await adaptiveService.createSessionFromFile(req.file, req.user.id, {
            selectedPages,
            maxQuestions
        });

        return res.json({
            sessionId: session.uuid,
            question: {
                id: question.id,
                type: question.type,
                stem: question.stem,
                choices: question.choices,
                difficulty: question.difficulty,
                topic: question.topic
            }
        });
    } catch (err) {
        console.error('Error creating adaptive session:', err);
        return res.status(500).json({ error: err.message || 'Failed to create session' });
    }
});

// Get session snapshot
router.get('/sessions/:uuid', authenticateToken, async (req, res) => {
    try {
        const snapshot = await adaptiveService.getSessionSnapshot(req.params.uuid, req.user.id);
        if (!snapshot) return res.status(404).json({ error: 'Session not found' });

        const { session, pendingQuestion } = snapshot;
        return res.json({
            sessionId: session.uuid,
            status: session.status,
            stats: {
                asked: session.asked,
                correct: session.correct,
                wrongStreak: session.wwrongStreak || session.wrongStreak,
                currentDifficulty: session.currentDifficulty
            },
            pendingQuestion: pendingQuestion ? {
                id: pendingQuestion.id,
                type: pendingQuestion.type,
                stem: pendingQuestion.stem,
                choices: pendingQuestion.choices,
                difficulty: pendingQuestion.difficulty,
                topic: pendingQuestion.topic
            } : null,
            maxQuestions: session.maxQuestions,
            createdAt: session.createdAt
        });
    } catch (err) {
        console.error('Error getting adaptive session:', err);
        return res.status(500).json({ error: 'Failed to get session' });
    }
});

// Get next question
router.get('/sessions/:uuid/next', authenticateToken, async (req, res) => {
    try {
        const { session, question } = await adaptiveService.getNextQuestion(req.params.uuid, req.user.id);
        if (!question) return res.json({ question: null });
        return res.json({
            question: {
                id: question.id,
                type: question.type,
                stem: question.stem,
                choices: question.choices,
                difficulty: question.difficulty,
                topic: question.topic
            }
        });
    } catch (err) {
        console.error('Error getting next question:', err);
        return res.status(500).json({ error: err.message || 'Failed to get next question' });
    }
});

// Submit an answer
router.post('/sessions/:uuid/answers', authenticateToken, async (req, res) => {
    try {
        const { questionId, answer } = req.body || {};
        if (!questionId) return res.status(400).json({ error: 'questionId is required' });

        // Ensure the question belongs to the session and user (basic validation)
        const result = await adaptiveService.submitAnswer(req.params.uuid, req.user.id, { questionId: Number(questionId), answer });

        const nextQuestion = result.nextQuestion ? {
            id: result.nextQuestion.id,
            type: result.nextQuestion.type,
            stem: result.nextQuestion.stem,
            choices: result.nextQuestion.choices,
            difficulty: result.nextQuestion.difficulty,
            topic: result.nextQuestion.topic
        } : null;

        return res.json({
            correct: result.correct,
            explanation: result.explanation,
            updatedStats: {
                asked: result.updated.asked,
                correct: result.updated.correct,
                wrongStreak: result.updated.wrongStreak,
                currentDifficulty: result.updated.currentDifficulty
            },
            reviewSuggestion: result.reviewSuggestion || null,
            nextQuestion
        });
    } catch (err) {
        console.error('Error submitting answer:', err);
        return res.status(500).json({ error: err.message || 'Failed to submit answer' });
    }
});

// Set preferences (e.g., difficulty cap)
router.post('/sessions/:uuid/preferences', authenticateToken, async (req, res) => {
    try {
        const prefs = await adaptiveService.setPreferences(req.params.uuid, req.user.id, req.body || {});
        return res.json({ preferences: prefs });
    } catch (err) {
        console.error('Error setting preferences:', err);
        return res.status(500).json({ error: 'Failed to set preferences' });
    }
});

// Finish session
router.post('/sessions/:uuid/finish', authenticateToken, async (req, res) => {
    try {
        const summary = await adaptiveService.finishSession(req.params.uuid, req.user.id);
        return res.json({ summary });
    } catch (err) {
        console.error('Error finishing session:', err);
        return res.status(500).json({ error: 'Failed to finish session' });
    }
});

// Get user's adaptive sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
        const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
        const sessions = await adaptiveService.getUserSessions(req.user.id, limit, offset);
        return res.json({ sessions, pagination: { limit, offset, hasMore: sessions.length === limit } });
    } catch (err) {
        console.error('Error getting user sessions:', err);
        return res.status(500).json({ error: 'Failed to get sessions' });
    }
});

module.exports = router;


