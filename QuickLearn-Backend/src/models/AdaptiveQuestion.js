const { getPool } = require('../config/db');

class AdaptiveQuestion {
    constructor(row) {
        this.id = row.id;
        this.sessionId = row.session_id;
        this.uuid = row.uuid;
        this.difficulty = row.difficulty;
        this.type = row.type;
        this.stem = row.stem;
        this.choices = row.choices ? JSON.parse(row.choices) : null;
        this.correctAnswer = row.correct_answer ? JSON.parse(row.correct_answer) : null;
        this.explanation = row.explanation;
        this.topic = row.topic;
        this.servedAt = row.served_at;
        this.answeredAt = row.answered_at;
        this.createdAt = row.created_at;
    }

    static async create({ sessionId, uuid, difficulty, type, stem, choices, correctAnswer, explanation, topic = null }) {
        const pool = await getPool();
        const [result] = await pool.execute(
            `INSERT INTO adaptive_questions (
                session_id, uuid, difficulty, type, stem, choices, correct_answer, explanation, topic, served_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [sessionId, uuid, difficulty, type, stem, choices ? JSON.stringify(choices) : null, correctAnswer ? JSON.stringify(correctAnswer) : null, explanation || null, topic]
        );
        return await AdaptiveQuestion.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM adaptive_questions WHERE id = ?', [id]);
        if (!rows.length) return null;
        return new AdaptiveQuestion(rows[0]);
    }

    static async findLastForSession(sessionId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM adaptive_questions WHERE session_id = ? ORDER BY id DESC LIMIT 1',
            [sessionId]
        );
        if (!rows.length) return null;
        return new AdaptiveQuestion(rows[0]);
    }

    static async findPendingForSession(sessionId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM adaptive_questions WHERE session_id = ? AND answered_at IS NULL ORDER BY id DESC LIMIT 1',
            [sessionId]
        );
        if (!rows.length) return null;
        return new AdaptiveQuestion(rows[0]);
    }

    async markAnswered() {
        const pool = await getPool();
        await pool.execute('UPDATE adaptive_questions SET answered_at = NOW() WHERE id = ?', [this.id]);
        return await AdaptiveQuestion.findById(this.id);
    }
}

module.exports = AdaptiveQuestion;


