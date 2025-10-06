const { getPool } = require('../config/db');

class QuizAttempt {
    constructor(data) {
        this.id = data.id;
        this.quizId = data.quiz_id;
        this.userId = data.user_id;
        this.score = data.score;
        this.timeSeconds = data.time_seconds;
        this.userAnswers = data.user_answers;
        this.takenAt = data.taken_at;
    }

    static async create(attemptData) {
        const pool = await getPool();
        
        const [result] = await pool.execute(
            `INSERT INTO quiz_attempts (
                quiz_id, user_id, score, time_seconds, user_answers
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                attemptData.quizId,
                attemptData.userId,
                attemptData.score || 0,
                attemptData.timeSeconds || null,
                JSON.stringify(attemptData.userAnswers || [])
            ]
        );

        return await QuizAttempt.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM quiz_attempts WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        
        const attempt = new QuizAttempt(rows[0]);
        attempt.userAnswers = JSON.parse(attempt.userAnswers || '[]');
        return attempt;
    }

    static async findByQuizId(quizId, limit = 50) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT * FROM quiz_attempts 
             WHERE quiz_id = ? 
             ORDER BY taken_at DESC 
             LIMIT ?`,
            [quizId, limit]
        );
        
        return rows.map(row => {
            const attempt = new QuizAttempt(row);
            attempt.userAnswers = JSON.parse(attempt.userAnswers || '[]');
            return attempt;
        });
    }

    static async findByUserAndQuiz(userId, quizId, limit = 50) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT * FROM quiz_attempts 
             WHERE user_id = ? AND quiz_id = ? 
             ORDER BY taken_at DESC 
             LIMIT ?`,
            [userId, quizId, limit]
        );
        
        return rows.map(row => {
            const attempt = new QuizAttempt(row);
            attempt.userAnswers = JSON.parse(attempt.userAnswers || '[]');
            return attempt;
        });
    }

    static async getQuizSummary(quizId, userId = null) {
        const pool = await getPool();
        let query = `
            SELECT 
                COUNT(*) as attemptsCount,
                MAX(score) as bestScore,
                AVG(score) as averageScore
            FROM quiz_attempts 
            WHERE quiz_id = ?
        `;
        let params = [quizId];
        
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        
        const [rows] = await pool.execute(query, params);
        const summary = rows[0];
        
        // Get the latest attempt
        let latestQuery = `
            SELECT score, taken_at 
            FROM quiz_attempts 
            WHERE quiz_id = ?
        `;
        let latestParams = [quizId];
        
        if (userId) {
            latestQuery += ' AND user_id = ?';
            latestParams.push(userId);
        }
        
        latestQuery += ' ORDER BY taken_at DESC LIMIT 1';
        
        const [latestRows] = await pool.execute(latestQuery, latestParams);
        const latestAttempt = latestRows[0];
        
        return {
            attemptsCount: parseInt(summary.attemptsCount) || 0,
            bestScore: summary.bestScore || null,
            averageScore: summary.averageScore ? Math.round(summary.averageScore) : null,
            lastScore: latestAttempt?.score || null,
            lastAttemptAt: latestAttempt?.taken_at || null
        };
    }

    toJSON() {
        return {
            id: this.id,
            score: this.score,
            timeSeconds: this.timeSeconds,
            userAnswers: this.userAnswers,
            takenAt: this.takenAt
        };
    }
}

module.exports = QuizAttempt;
