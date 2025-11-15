const { getPool } = require('../config/db');

class UserStats {
    constructor(data) {
        this.userId = data.user_id;
        this.consecutiveCorrectAnswers = data.consecutive_correct_answers || 0;
        this.totalQuizzesTaken = data.total_quizzes_taken || 0;
        this.totalPerfectScores = data.total_perfect_scores || 0;
        this.totalQuestionsAnswered = data.total_questions_answered || 0;
        this.totalCorrectAnswers = data.total_correct_answers || 0;
        this.longestStreak = data.longest_streak || 0;
        this.quizzes90PlusCount = data.quizzes_90_plus_count || 0;
        this.updatedAt = data.updated_at;
    }

    static async findByUserId(userId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM user_stats WHERE user_id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            // Create default stats if doesn't exist
            return await UserStats.create(userId);
        }
        
        return new UserStats(rows[0]);
    }

    static async create(userId) {
        const pool = await getPool();
        await pool.execute(
            'INSERT INTO user_stats (user_id) VALUES (?)',
            [userId]
        );
        return await UserStats.findByUserId(userId);
    }

    async update(updates) {
        const pool = await getPool();
        const fields = [];
        const values = [];

        if (updates.consecutiveCorrectAnswers !== undefined) {
            fields.push('consecutive_correct_answers = ?');
            values.push(updates.consecutiveCorrectAnswers);
        }
        if (updates.totalQuizzesTaken !== undefined) {
            fields.push('total_quizzes_taken = ?');
            values.push(updates.totalQuizzesTaken);
        }
        if (updates.totalPerfectScores !== undefined) {
            fields.push('total_perfect_scores = ?');
            values.push(updates.totalPerfectScores);
        }
        if (updates.totalQuestionsAnswered !== undefined) {
            fields.push('total_questions_answered = ?');
            values.push(updates.totalQuestionsAnswered);
        }
        if (updates.totalCorrectAnswers !== undefined) {
            fields.push('total_correct_answers = ?');
            values.push(updates.totalCorrectAnswers);
        }
        if (updates.longestStreak !== undefined) {
            fields.push('longest_streak = ?');
            values.push(updates.longestStreak);
        }
        if (updates.quizzes90PlusCount !== undefined) {
            fields.push('quizzes_90_plus_count = ?');
            values.push(updates.quizzes90PlusCount);
        }

        if (fields.length === 0) return this;

        values.push(this.userId);
        await pool.execute(
            `UPDATE user_stats SET ${fields.join(', ')} WHERE user_id = ?`,
            values
        );

        return await UserStats.findByUserId(this.userId);
    }

    toJSON() {
        return {
            userId: this.userId,
            consecutiveCorrectAnswers: this.consecutiveCorrectAnswers,
            totalQuizzesTaken: this.totalQuizzesTaken,
            totalPerfectScores: this.totalPerfectScores,
            totalQuestionsAnswered: this.totalQuestionsAnswered,
            totalCorrectAnswers: this.totalCorrectAnswers,
            longestStreak: this.longestStreak,
            quizzes90PlusCount: this.quizzes90PlusCount,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = UserStats;

