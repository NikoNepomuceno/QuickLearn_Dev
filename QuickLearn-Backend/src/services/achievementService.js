const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const UserStats = require('../models/UserStats');

// Helper function to check if answer is correct (reused from cloudStorageService)
function normalizeValue(v) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.map(x => String(x).trim().toLowerCase()).filter(Boolean);
    return String(v).trim().toLowerCase();
}

function isAnswerCorrect(userAnswer, correctAnswer, questionType) {
    if (questionType === 'enumeration') {
        const u = normalizeValue(userAnswer);
        const c = normalizeValue(correctAnswer);
        if (!Array.isArray(u) || !Array.isArray(c) || c.length === 0) return false;
        return c.every(item => u.includes(item));
    } else {
        const u = normalizeValue(userAnswer);
        const c = normalizeValue(correctAnswer);
        if (!u || !c) return false;
        return u === c;
    }
}

class AchievementService {
    /**
     * Check and award achievements after a quiz attempt
     */
    static async checkQuizAttemptAchievements(userId, quizAttempt) {
        const stats = await UserStats.findByUserId(userId);
        const newAchievements = [];

        // Update stats based on quiz attempt
        const quiz = quizAttempt.quiz || {};
        const questions = quiz.questions || [];
        const userAnswers = quizAttempt.userAnswers || [];
        const score = quizAttempt.score || 0;

        // Calculate correct answers in this attempt
        let correctInAttempt = 0;
        let consecutiveCorrect = stats.consecutiveCorrectAnswers;

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const userAnswer = userAnswers[i];
            const isCorrect = isAnswerCorrect(userAnswer, question.answer, question.type);
            
            if (isCorrect) {
                correctInAttempt++;
                consecutiveCorrect++;
            } else {
                consecutiveCorrect = 0; // Reset streak on wrong answer
            }
        }

        // Update stats
        const updates = {
            totalQuizzesTaken: stats.totalQuizzesTaken + 1,
            totalQuestionsAnswered: stats.totalQuestionsAnswered + questions.length,
            totalCorrectAnswers: stats.totalCorrectAnswers + correctInAttempt,
            consecutiveCorrectAnswers: consecutiveCorrect
        };

        // Check for perfect score
        if (score === 100) {
            updates.totalPerfectScores = stats.totalPerfectScores + 1;
            
            // Award: Perfect Score
            if (!(await UserAchievement.hasAchievement(userId, 'perfect_score'))) {
                const achievement = await Achievement.findByCode('perfect_score');
                if (achievement) {
                    await UserAchievement.create(userId, achievement.id, { quizId: quizAttempt.quizId, score });
                    newAchievements.push(achievement);
                }
            }

            // Award: Unbeatable (3 perfect scores)
            if (updates.totalPerfectScores === 3) {
                const achievement = await Achievement.findByCode('unbeatable');
                if (achievement && !(await UserAchievement.hasAchievement(userId, 'unbeatable'))) {
                    await UserAchievement.create(userId, achievement.id);
                    newAchievements.push(achievement);
                }
            }
        }

        // Check for 90%+ score (for accuracy_king)
        if (score >= 90) {
            updates.quizzes90PlusCount = (stats.quizzes90PlusCount || 0) + 1;
            
            // Award: Accuracy King (5 quizzes with 90%+)
            if (updates.quizzes90PlusCount === 5) {
                const achievement = await Achievement.findByCode('accuracy_king');
                if (achievement && !(await UserAchievement.hasAchievement(userId, 'accuracy_king'))) {
                    await UserAchievement.create(userId, achievement.id);
                    newAchievements.push(achievement);
                }
            }
        }

        // Check for streaks
        if (consecutiveCorrect >= 5 && !(await UserAchievement.hasAchievement(userId, 'five_streak'))) {
            const achievement = await Achievement.findByCode('five_streak');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id, { streak: consecutiveCorrect });
                newAchievements.push(achievement);
            }
        }

        if (consecutiveCorrect >= 10 && !(await UserAchievement.hasAchievement(userId, 'ten_streak'))) {
            const achievement = await Achievement.findByCode('ten_streak');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id, { streak: consecutiveCorrect });
                newAchievements.push(achievement);
            }
        }

        // Update longest streak
        if (consecutiveCorrect > stats.longestStreak) {
            updates.longestStreak = consecutiveCorrect;
        }

        // Check milestone achievements
        if (updates.totalQuizzesTaken === 1 && !(await UserAchievement.hasAchievement(userId, 'first_quiz'))) {
            const achievement = await Achievement.findByCode('first_quiz');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        if (updates.totalQuizzesTaken === 10 && !(await UserAchievement.hasAchievement(userId, 'quiz_master'))) {
            const achievement = await Achievement.findByCode('quiz_master');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        if (updates.totalQuizzesTaken === 25 && !(await UserAchievement.hasAchievement(userId, 'dedicated'))) {
            const achievement = await Achievement.findByCode('dedicated');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id);
                newAchievements.push(achievement);
            }
        }

        // Check for speed achievement (under 2 minutes)
        if (quizAttempt.timeSeconds && quizAttempt.timeSeconds < 120) {
            if (!(await UserAchievement.hasAchievement(userId, 'speed_demon'))) {
                const achievement = await Achievement.findByCode('speed_demon');
                if (achievement) {
                    await UserAchievement.create(userId, achievement.id, { timeSeconds: quizAttempt.timeSeconds });
                    newAchievements.push(achievement);
                }
            }
        }

        // Check for centurion (100 correct answers)
        if (updates.totalCorrectAnswers >= 100 && !(await UserAchievement.hasAchievement(userId, 'centurion'))) {
            const achievement = await Achievement.findByCode('centurion');
            if (achievement) {
                await UserAchievement.create(userId, achievement.id, { totalCorrect: updates.totalCorrectAnswers });
                newAchievements.push(achievement);
            }
        }

        // Save updated stats
        await stats.update(updates);

        return newAchievements;
    }

    /**
     * Get achievement progress for a user
     */
    static async getAchievementProgress(userId, achievementCode) {
        const achievement = await Achievement.findByCode(achievementCode);
        if (!achievement) return null;

        const stats = await UserStats.findByUserId(userId);
        const hasAchievement = await UserAchievement.hasAchievement(userId, achievementCode);

        let progress = 0;
        let current = 0;
        let target = 0;

        switch (achievementCode) {
            case 'perfect_score':
                progress = hasAchievement ? 100 : 0;
                current = stats.totalPerfectScores;
                target = 1;
                break;
            case 'five_streak':
                current = stats.consecutiveCorrectAnswers;
                target = 5;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'ten_streak':
                current = stats.consecutiveCorrectAnswers;
                target = 10;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'first_quiz':
                current = stats.totalQuizzesTaken;
                target = 1;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'quiz_master':
                current = stats.totalQuizzesTaken;
                target = 10;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'dedicated':
                current = stats.totalQuizzesTaken;
                target = 25;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'centurion':
                current = stats.totalCorrectAnswers;
                target = 100;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'unbeatable':
                current = stats.totalPerfectScores;
                target = 3;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            case 'speed_demon':
                // This would need to be tracked per attempt - for now, just check if earned
                progress = hasAchievement ? 100 : 0;
                break;
            case 'accuracy_king':
                current = stats.quizzes90PlusCount || 0;
                target = 5;
                progress = Math.min(100, Math.round((current / target) * 100));
                break;
            default:
                progress = hasAchievement ? 100 : 0;
        }

        return {
            achievement: achievement.toJSON(),
            progress,
            current,
            target,
            earned: hasAchievement
        };
    }

    /**
     * Get all achievements with progress for a user
     */
    static async getAllAchievementsWithProgress(userId) {
        const allAchievements = await Achievement.findAll();
        const userAchievements = await UserAchievement.findByUserId(userId);
        const userAchievementCodes = new Set(userAchievements.map(ua => ua.code));
        const stats = await UserStats.findByUserId(userId);

        return await Promise.all(allAchievements.map(async (achievement) => {
            const earned = userAchievementCodes.has(achievement.code);
            const userAchievement = userAchievements.find(ua => ua.code === achievement.code);
            const progress = await this.getAchievementProgress(userId, achievement.code);

            return {
                ...achievement.toJSON(),
                earned,
                earnedAt: userAchievement?.earnedAt || null,
                pointsEarned: userAchievement?.pointsEarned || 0,
                progress: progress?.progress || 0,
                current: progress?.current || 0,
                target: progress?.target || 0
            };
        }));
    }

    /**
     * Get all achievements for a user
     */
    static async getUserAchievements(userId) {
        return await UserAchievement.findByUserId(userId);
    }

    /**
     * Get all available achievements
     */
    static async getAllAchievements() {
        return await Achievement.findAll();
    }
}

module.exports = AchievementService;

