const { getPool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AdaptiveSession {
    constructor(row) {
        this.id = row.id;
        this.uuid = row.uuid;
        this.userId = row.user_id;
        this.status = row.status;
        this.currentDifficulty = row.current_difficulty;
        this.asked = row.asked;
        this.correct = row.correct;
        this.wrongStreak = row.wrong_streak;
        this.maxQuestions = row.max_questions;
        this.preferences = row.preferences ? JSON.parse(row.preferences) : {};
        this.sourceFileId = row.source_file_id;
        this.textLength = row.text_length;
        this.createdAt = row.created_at;
        this.updatedAt = row.updated_at;
    }

    static async create({ userId, currentDifficulty = 'medium', maxQuestions = 20, preferences = {}, sourceFileId = null, textLength = null, content = null }) {
        const pool = await getPool();
        const uuid = uuidv4();
        const [result] = await pool.execute(
            `INSERT INTO adaptive_sessions (
                user_id, uuid, status, current_difficulty, asked, correct, wrong_streak, max_questions, preferences, source_file_id, text_length, content
            ) VALUES (?, ?, 'active', ?, 0, 0, 0, ?, ?, ?, ?, ?)`,
            [userId, uuid, currentDifficulty, maxQuestions, JSON.stringify(preferences || {}), sourceFileId, textLength, content]
        );
        return await AdaptiveSession.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM adaptive_sessions WHERE id = ?', [id]);
        if (!rows.length) return null;
        return new AdaptiveSession(rows[0]);
    }

    static async findByUuid(uuid) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM adaptive_sessions WHERE uuid = ?', [uuid]);
        if (!rows.length) return null;
        return new AdaptiveSession(rows[0]);
    }

    static async findActiveByUuidForUser(uuid, userId) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM adaptive_sessions WHERE uuid = ? AND user_id = ?', [uuid, userId]);
        if (!rows.length) return null;
        return new AdaptiveSession(rows[0]);
    }

    async update(fields) {
        const pool = await getPool();
        const sets = [];
        const values = [];
        if (fields.status !== undefined) { sets.push('status = ?'); values.push(fields.status); }
        if (fields.currentDifficulty !== undefined) { sets.push('current_difficulty = ?'); values.push(fields.currentDifficulty); }
        if (fields.asked !== undefined) { sets.push('asked = ?'); values.push(fields.asked); }
        if (fields.correct !== undefined) { sets.push('correct = ?'); values.push(fields.correct); }
        if (fields.wrongStreak !== undefined) { sets.push('wrong_streak = ?'); values.push(fields.wrongStreak); }
        if (fields.maxQuestions !== undefined) { sets.push('max_questions = ?'); values.push(fields.maxQuestions); }
        if (fields.preferences !== undefined) { sets.push('preferences = ?'); values.push(JSON.stringify(fields.preferences)); }
        if (!sets.length) return this;
        values.push(this.id);
        await pool.execute(`UPDATE adaptive_sessions SET ${sets.join(', ')} WHERE id = ?`, values);
        return await AdaptiveSession.findById(this.id);
    }

    static async getContentById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT content FROM adaptive_sessions WHERE id = ?', [id]);
        if (!rows.length) return '';
        return rows[0].content || '';
    }
}

module.exports = AdaptiveSession;


