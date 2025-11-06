const { getPool } = require('../config/db');

class AdaptiveAnswer {
    constructor(row) {
        this.id = row.id;
        this.sessionId = row.session_id;
        this.questionId = row.question_id;
        this.userAnswer = row.user_answer ? JSON.parse(row.user_answer) : null;
        this.isCorrect = !!row.is_correct;
        this.latencyMs = row.latency_ms;
        this.createdAt = row.created_at;
    }

    static async create({ sessionId, questionId, userAnswer, isCorrect, latencyMs = null }) {
        const pool = await getPool();
        const [result] = await pool.execute(
            `INSERT INTO adaptive_answers (
                session_id, question_id, user_answer, is_correct, latency_ms
            ) VALUES (?, ?, ?, ?, ?)`,
            [sessionId, questionId, JSON.stringify(userAnswer), isCorrect ? 1 : 0, latencyMs]
        );
        return await AdaptiveAnswer.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM adaptive_answers WHERE id = ?', [id]);
        if (!rows.length) return null;
        return new AdaptiveAnswer(rows[0]);
    }
}

module.exports = AdaptiveAnswer;


