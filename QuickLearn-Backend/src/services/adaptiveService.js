const { v4: uuidv4 } = require('uuid');
const AdaptiveSession = require('../models/AdaptiveSession');
const AdaptiveQuestion = require('../models/AdaptiveQuestion');
const AdaptiveAnswer = require('../models/AdaptiveAnswer');
const deepSeekService = require('./deepseekService');
const { parseUploadedFile } = require('../utils/parseFile');

function mapAiQuestionToAdaptive(aiQuestion) {
    const type = aiQuestion.type || 'multiple_choice';
    const stem = aiQuestion.question || '';
    const difficulty = aiQuestion.difficulty || 'medium';
    const topic = aiQuestion.topic || null;
    let choices = null;
    let correctAnswer = null;

    if (type === 'multiple_choice' || type === 'true_false') {
        const letter = ['a', 'b', 'c', 'd', 'e'];
        choices = (aiQuestion.choices || []).slice(0, 5).map((text, idx) => ({ id: letter[idx], text }));
        const idx = (aiQuestion.choices || []).findIndex(c => c === aiQuestion.answer);
        correctAnswer = idx >= 0 ? [letter[idx]] : [];
    } else if (type === 'enumeration') {
        correctAnswer = Array.isArray(aiQuestion.answer) ? aiQuestion.answer : [];
    } else {
        // identification
        correctAnswer = String(aiQuestion.answer || '');
    }

    return { type, stem, difficulty, topic, choices, correctAnswer, explanation: aiQuestion.explanation || null };
}

function selectContentFromPagesOrText(parseResult, selectedPages) {
    if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
        const texts = selectedPages.map(p => p.content).filter(Boolean);
        if (texts.length > 0) return texts.join('\n\n');
    }
    return parseResult?.text || '';
}

function computeNextDifficulty(currentDifficulty, isCorrect, consecutiveCorrect) {
    const order = ['easy', 'medium', 'hard'];
    const idx = order.indexOf(currentDifficulty);
    if (isCorrect) {
        if (consecutiveCorrect >= 2 && idx < order.length - 1) return order[idx + 1];
        return currentDifficulty;
    }
    if (!isCorrect && idx > 0) return order[idx - 1];
    return currentDifficulty;
}

async function generateQuestionFromText(text, difficulty) {
    const quiz = await deepSeekService.generateQuizFromText(text, {
        numQuestions: 1,
        difficulty,
        questionTypes: ['multiple_choice']
    });
    const q = quiz.questions[0];
    return mapAiQuestionToAdaptive(q);
}

async function createSessionFromFile(file, userId, options = {}) {
    const parseResult = await parseUploadedFile(file);
    const content = selectContentFromPagesOrText(parseResult, options.selectedPages);

    // Create session row
    const session = await AdaptiveSession.create({
        userId,
        currentDifficulty: 'medium',
        maxQuestions: Math.min(50, Number(options.maxQuestions) || 20),
        preferences: {},
        sourceFileId: null,
        textLength: content.length,
        content
    });

    // Generate first question
    const qData = await generateQuestionFromText(content, session.currentDifficulty);
    const question = await AdaptiveQuestion.create({
        sessionId: session.id,
        uuid: uuidv4(),
        difficulty: qData.difficulty,
        type: qData.type,
        stem: qData.stem,
        choices: qData.choices,
        correctAnswer: qData.correctAnswer,
        explanation: qData.explanation,
        topic: qData.topic
    });

    return { session, question };
}

async function getSessionSnapshot(sessionUuid, userId) {
    const session = await AdaptiveSession.findActiveByUuidForUser(sessionUuid, userId);
    if (!session) return null;
    const pending = await AdaptiveQuestion.findPendingForSession(session.id);
    return { session, pendingQuestion: pending };
}

async function getNextQuestion(sessionUuid, userId) {
    const session = await AdaptiveSession.findActiveByUuidForUser(sessionUuid, userId);
    if (!session) throw new Error('Session not found');
    if (session.asked >= session.maxQuestions) return { session, question: null };

    const pending = await AdaptiveQuestion.findPendingForSession(session.id);
    if (pending) return { session, question: pending };

    // Generate next from stored content
    const content = await AdaptiveSession.getContentById(session.id);
    const qData = await generateQuestionFromText(content, session.currentDifficulty);
    const question = await AdaptiveQuestion.create({
        sessionId: session.id,
        uuid: uuidv4(),
        difficulty: qData.difficulty,
        type: qData.type,
        stem: qData.stem,
        choices: qData.choices,
        correctAnswer: qData.correctAnswer,
        explanation: qData.explanation,
        topic: qData.topic
    });
    return { session, question };
}

async function submitAnswer(sessionUuid, userId, { questionId, answer }) {
    const session = await AdaptiveSession.findActiveByUuidForUser(sessionUuid, userId);
    if (!session) throw new Error('Session not found');

    const question = await AdaptiveQuestion.findById(questionId);
    if (!question || question.sessionId !== session.id) throw new Error('Question not found');
    if (question.answeredAt) throw new Error('Question already answered');

    // Determine correctness
    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
        const choice = Array.isArray(answer) ? answer[0] : answer;
        isCorrect = Array.isArray(question.correctAnswer) && question.correctAnswer.includes(choice);
    } else if (question.type === 'enumeration') {
        const userList = Array.isArray(answer) ? answer : [];
        const correctList = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
        
        if (userList.length === 0 || correctList.length === 0) {
            isCorrect = false;
        } else {
            // Normalize both lists: trim and lowercase for case-insensitive comparison
            const normalizedUser = userList
                .map(item => String(item).trim().toLowerCase())
                .filter(item => item.length > 0);
            const normalizedCorrect = correctList
                .map(item => String(item).trim().toLowerCase())
                .filter(item => item.length > 0);
            
            // Check that ALL correct items are present in user's answer (order doesn't matter)
            isCorrect = normalizedCorrect.every(correctItem => normalizedUser.includes(correctItem));
        }
    } else {
        // identification - string compare (case-insensitive trimmed)
        const a = String(answer || '').trim().toLowerCase();
        const b = String(question.correctAnswer || '').trim().toLowerCase();
        isCorrect = a.length > 0 && a === b;
    }

    // Save answer
    await AdaptiveAnswer.create({ sessionId: session.id, questionId: question.id, userAnswer: answer, isCorrect });
    await question.markAnswered();

    // Update session stats
    const asked = session.asked + 1;
    const correct = session.correct + (isCorrect ? 1 : 0);
    const wrongStreak = isCorrect ? 0 : (session.wrongStreak + 1);

    // Compute consecutive correct (simplified: if isCorrect and prev wrongStreak == 0 and prev asked>0, assume 1; else if last answer also correct we'd need answers list – keeping simple: step-up on isCorrect and previous wrongStreak==0 AND a separate heuristic could be added later)
    const consecutiveCorrect = isCorrect && session.wrongStreak === 0 ? 2 : 0; // triggers step-up only when already on a correct streak
    let nextDifficulty = computeNextDifficulty(session.currentDifficulty, isCorrect, consecutiveCorrect);

    // Respect difficulty cap
    const cap = session.preferences?.difficultyCap;
    if (cap) {
        const order = ['easy', 'medium', 'hard'];
        if (order.indexOf(nextDifficulty) > order.indexOf(cap)) nextDifficulty = cap;
    }

    const updated = await session.update({ asked, correct, wrongStreak, currentDifficulty: nextDifficulty });

    // Update user stats for achievement tracking
    try {
        const UserStats = require('../models/UserStats');
        const AchievementService = require('./achievementService');
        const stats = await UserStats.findByUserId(userId);
        
        // Calculate consecutive correct answers
        // If correct and previous wrongStreak was 0, we're continuing a streak
        let consecutiveCorrect = stats.consecutiveCorrectAnswers;
        if (isCorrect) {
            consecutiveCorrect = (session.wrongStreak === 0 && session.asked > 1) 
                ? consecutiveCorrect + 1 
                : 1; // Start new streak or continue
        } else {
            consecutiveCorrect = 0; // Reset streak
        }

        // Update stats
        const statsUpdates = {
            totalQuestionsAnswered: stats.totalQuestionsAnswered + 1,
            totalCorrectAnswers: stats.totalCorrectAnswers + (isCorrect ? 1 : 0),
            consecutiveCorrectAnswers: consecutiveCorrect
        };

        if (consecutiveCorrect > stats.longestStreak) {
            statsUpdates.longestStreak = consecutiveCorrect;
        }

        await stats.update(statsUpdates);

        // Check for streak achievements
        const newAchievements = [];
        if (consecutiveCorrect >= 5 && !(await require('../models/UserAchievement').hasAchievement(userId, 'five_streak'))) {
            const achievement = await require('../models/Achievement').findByCode('five_streak');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id, { streak: consecutiveCorrect });
                newAchievements.push(achievement);
            }
        }

        if (consecutiveCorrect >= 10 && !(await require('../models/UserAchievement').hasAchievement(userId, 'ten_streak'))) {
            const achievement = await require('../models/Achievement').findByCode('ten_streak');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id, { streak: consecutiveCorrect });
                newAchievements.push(achievement);
            }
        }

        // Broadcast new achievements via WebSocket if any were earned
        if (newAchievements.length > 0 && global.__io) {
            global.__io.to(`user:${userId}`).emit('achievement_earned', {
                achievements: newAchievements.map(a => a.toJSON())
            });
        }
    } catch (e) {
        console.error('Error updating user stats for achievements:', e);
        // Don't fail the answer submission if achievement tracking fails
    }

    // Review suggestion on 4 wrong in a row
    let reviewSuggestion = null;
    if (updated.wrongStreak >= 4) {
        reviewSuggestion = { trigger: 'wrong_streak', streak: updated.wrongStreak, suggestions: { easeTo: updated.currentDifficulty === 'hard' ? 'medium' : 'easy' } };
    }

    // Prefetch/generate next question (optional)
    let nextQuestion = null;
    if (updated.asked < updated.maxQuestions) {
        const content = await AdaptiveSession.getContentById(updated.id);
        const qData = await generateQuestionFromText(content, updated.currentDifficulty);
        const q = await AdaptiveQuestion.create({
            sessionId: updated.id,
            uuid: uuidv4(),
            difficulty: qData.difficulty,
            type: qData.type,
            stem: qData.stem,
            choices: qData.choices,
            correctAnswer: qData.correctAnswer,
            explanation: qData.explanation,
            topic: qData.topic
        });
        nextQuestion = q;
    }

    return { correct: isCorrect, explanation: question.explanation, updated, reviewSuggestion, nextQuestion };
}

async function setPreferences(sessionUuid, userId, preferences) {
    const session = await AdaptiveSession.findActiveByUuidForUser(sessionUuid, userId);
    if (!session) throw new Error('Session not found');
    const merged = { ...(session.preferences || {}), ...(preferences || {}) };
    const updated = await session.update({ preferences: merged });
    return updated.preferences;
}

async function finishSession(sessionUuid, userId) {
    const session = await AdaptiveSession.findActiveByUuidForUser(sessionUuid, userId);
    if (!session) throw new Error('Session not found');
    const updated = await session.update({ status: 'completed' });
    
    // Update user stats for quiz completion
    try {
        const UserStats = require('../models/UserStats');
        const stats = await UserStats.findByUserId(userId);
        const accuracy = updated.asked > 0 ? Math.round((updated.correct / updated.asked) * 100) : 0;
        
        const statsUpdates = {
            totalQuizzesTaken: stats.totalQuizzesTaken + 1
        };

        // Check for perfect score (100% accuracy)
        if (accuracy === 100 && updated.asked > 0) {
            statsUpdates.totalPerfectScores = stats.totalPerfectScores + 1;
        }

        // Check for 90%+ accuracy
        if (accuracy >= 90) {
            statsUpdates.quizzes90PlusCount = (stats.quizzes90PlusCount || 0) + 1;
        }

        await stats.update(statsUpdates);

        // Check for milestone achievements
        const newAchievements = [];
        const AchievementService = require('./achievementService');
        const updatedStats = await UserStats.findByUserId(userId);

        if (updatedStats.totalQuizzesTaken === 1 && !(await require('../models/UserAchievement').hasAchievement(userId, 'first_quiz'))) {
            const achievement = await require('../models/Achievement').findByCode('first_quiz');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        if (updatedStats.totalQuizzesTaken === 10 && !(await require('../models/UserAchievement').hasAchievement(userId, 'quiz_master'))) {
            const achievement = await require('../models/Achievement').findByCode('quiz_master');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        if (updatedStats.totalQuizzesTaken === 25 && !(await require('../models/UserAchievement').hasAchievement(userId, 'dedicated'))) {
            const achievement = await require('../models/Achievement').findByCode('dedicated');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        // Check for accuracy_king
        if (updatedStats.quizzes90PlusCount === 5 && !(await require('../models/UserAchievement').hasAchievement(userId, 'accuracy_king'))) {
            const achievement = await require('../models/Achievement').findByCode('accuracy_king');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        // Check for unbeatable (3 perfect scores)
        if (updatedStats.totalPerfectScores === 3 && !(await require('../models/UserAchievement').hasAchievement(userId, 'unbeatable'))) {
            const achievement = await require('../models/Achievement').findByCode('unbeatable');
            if (achievement) {
                await require('../models/UserAchievement').create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        // Broadcast new achievements via WebSocket if any were earned
        if (newAchievements.length > 0 && global.__io) {
            global.__io.to(`user:${userId}`).emit('achievement_earned', {
                achievements: newAchievements.map(a => a.toJSON())
            });
        }
    } catch (e) {
        console.error('Error checking achievements on session finish:', e);
        // Don't fail the session finish if achievement checking fails
    }

    // For simplicity, trajectory is not stored here; can be added later
    return { asked: updated.asked, correct: updated.correct, wrongStreakMax: updated.wrongStreak, trajectory: [], finishedAt: new Date(), durationMs: 0 };
}

async function getUserSessions(userId, limit = 20, offset = 0) {
    const { getPool } = require('../config/db');
    const pool = await getPool();
    const [rows] = await pool.execute(
        `SELECT * FROM adaptive_sessions 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    
    return rows.map(row => {
        const session = new AdaptiveSession(row);
        const accuracy = session.asked > 0 ? Math.round((session.correct / session.asked) * 100) : 0;
        return {
            id: session.uuid,
            title: `Adaptive Session ${session.asked}/${session.maxQuestions}`,
            description: `${accuracy}% accuracy • ${session.currentDifficulty} difficulty`,
            type: 'adaptive',
            status: session.status,
            stats: {
                asked: session.asked,
                correct: session.correct,
                accuracy,
                currentDifficulty: session.currentDifficulty,
                wrongStreak: session.wrongStreak
            },
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        };
    });
}

module.exports = {
    createSessionFromFile,
    getSessionSnapshot,
    getNextQuestion,
    submitAnswer,
    setPreferences,
    finishSession,
    getUserSessions,
    selectContentFromPagesOrText
};


