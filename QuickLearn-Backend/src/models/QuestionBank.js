const { getPool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class QuestionBank {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.uuid = data.uuid;
        this.originalQuizId = data.original_quiz_id;
        this.questionData = data.question_data;
        this.topic = data.topic;
        this.category = data.category;
        this.subject = data.subject;
        this.difficulty = data.difficulty;
        this.questionType = data.question_type;
        this.keywords = data.keywords;
        this.aiCategorized = data.ai_categorized;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(questionData) {
        const pool = await getPool();
        const uuid = uuidv4();
        
        const [result] = await pool.execute(
            `INSERT INTO question_bank (
                user_id, uuid, original_quiz_id, question_data,
                topic, category, subject, difficulty, question_type,
                keywords, ai_categorized
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                questionData.userId,
                uuid,
                questionData.originalQuizId || null,
                JSON.stringify(questionData.questionData),
                questionData.topic || null,
                questionData.category || null,
                questionData.subject || null,
                questionData.difficulty || null,
                questionData.questionType,
                JSON.stringify(questionData.keywords || []),
                questionData.aiCategorized ? 1 : 0
            ]
        );

        return await QuestionBank.findById(result.insertId);
    }

    static async bulkCreate(questions) {
        if (!questions || questions.length === 0) return [];
        
        const pool = await getPool();
        const values = [];
        const placeholders = [];
        
        for (const q of questions) {
            const uuid = uuidv4();
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(
                q.userId,
                uuid,
                q.originalQuizId || null,
                JSON.stringify(q.questionData),
                q.topic || null,
                q.category || null,
                q.subject || null,
                q.difficulty || null,
                q.questionType,
                JSON.stringify(q.keywords || []),
                q.aiCategorized ? 1 : 0
            );
        }
        
        const [result] = await pool.execute(
            `INSERT INTO question_bank (
                user_id, uuid, original_quiz_id, question_data,
                topic, category, subject, difficulty, question_type,
                keywords, ai_categorized
            ) VALUES ${placeholders.join(', ')}`,
            values
        );
        
        // Return created questions
        const createdIds = [];
        for (let i = 0; i < questions.length; i++) {
            createdIds.push(result.insertId + i);
        }
        
        const created = [];
        for (const id of createdIds) {
            const question = await QuestionBank.findById(id);
            if (question) created.push(question);
        }
        
        return created;
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM question_bank WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        
        const question = new QuestionBank(rows[0]);
        question.questionData = JSON.parse(question.questionData);
        question.keywords = JSON.parse(question.keywords || '[]');
        return question;
    }

    static async findByUuid(uuid) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM question_bank WHERE uuid = ?',
            [uuid]
        );
        
        if (rows.length === 0) return null;
        
        const question = new QuestionBank(rows[0]);
        question.questionData = JSON.parse(question.questionData);
        question.keywords = JSON.parse(question.keywords || '[]');
        return question;
    }

    static async findByUserId(userId, filters = {}, pagination = {}) {
        const pool = await getPool();
        const page = parseInt(pagination.page, 10) || 1;
        const limit = parseInt(pagination.limit, 10) || 20;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM question_bank WHERE user_id = ?';
        const params = [userId];
        
        // Apply filters
        if (filters.topic) {
            query += ' AND topic = ?';
            params.push(filters.topic);
        }
        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }
        if (filters.difficulty && filters.difficulty.length > 0) {
            if (Array.isArray(filters.difficulty)) {
                query += ` AND difficulty IN (${filters.difficulty.map(() => '?').join(', ')})`;
                params.push(...filters.difficulty);
            } else {
                query += ' AND difficulty = ?';
                params.push(filters.difficulty);
            }
        }
        if (filters.type && filters.type.length > 0) {
            if (Array.isArray(filters.type)) {
                query += ` AND question_type IN (${filters.type.map(() => '?').join(', ')})`;
                params.push(...filters.type);
            } else {
                query += ' AND question_type = ?';
                params.push(filters.type);
            }
        }
        if (filters.search) {
            query += ' AND (question_data LIKE ? OR topic LIKE ? OR category LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [rows] = await pool.execute(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM question_bank WHERE user_id = ?';
        const countParams = [userId];
        
        if (filters.topic) {
            countQuery += ' AND topic = ?';
            countParams.push(filters.topic);
        }
        if (filters.category) {
            countQuery += ' AND category = ?';
            countParams.push(filters.category);
        }
        if (filters.difficulty && filters.difficulty.length > 0) {
            if (Array.isArray(filters.difficulty)) {
                countQuery += ` AND difficulty IN (${filters.difficulty.map(() => '?').join(', ')})`;
                countParams.push(...filters.difficulty);
            } else {
                countQuery += ' AND difficulty = ?';
                countParams.push(filters.difficulty);
            }
        }
        if (filters.type && filters.type.length > 0) {
            if (Array.isArray(filters.type)) {
                countQuery += ` AND question_type IN (${filters.type.map(() => '?').join(', ')})`;
                countParams.push(...filters.type);
            } else {
                countQuery += ' AND question_type = ?';
                countParams.push(filters.type);
            }
        }
        if (filters.search) {
            countQuery += ' AND (question_data LIKE ? OR topic LIKE ? OR category LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        const [countRows] = await pool.execute(countQuery, countParams);
        const total = countRows[0].total;
        
        return {
            questions: rows.map(row => {
                const question = new QuestionBank(row);
                question.questionData = JSON.parse(question.questionData);
                question.keywords = JSON.parse(question.keywords || '[]');
                return question;
            }),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    static async countByUserId(userId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM question_bank WHERE user_id = ?',
            [userId]
        );
        return rows[0].count;
    }

    static async getStats(userId) {
        const pool = await getPool();
        
        // Total count
        const [totalRows] = await pool.execute(
            'SELECT COUNT(*) as total FROM question_bank WHERE user_id = ?',
            [userId]
        );
        const total = totalRows[0].total;
        
        // By difficulty
        const [difficultyRows] = await pool.execute(
            `SELECT difficulty, COUNT(*) as count 
             FROM question_bank 
             WHERE user_id = ? AND difficulty IS NOT NULL
             GROUP BY difficulty`,
            [userId]
        );
        const byDifficulty = {
            easy: 0,
            medium: 0,
            hard: 0
        };
        difficultyRows.forEach(row => {
            byDifficulty[row.difficulty] = row.count;
        });
        
        // By type
        const [typeRows] = await pool.execute(
            `SELECT question_type, COUNT(*) as count 
             FROM question_bank 
             WHERE user_id = ?
             GROUP BY question_type`,
            [userId]
        );
        const byType = {};
        typeRows.forEach(row => {
            byType[row.question_type] = row.count;
        });
        
        // Unique topics and categories
        const [topicRows] = await pool.execute(
            `SELECT DISTINCT topic FROM question_bank 
             WHERE user_id = ? AND topic IS NOT NULL`,
            [userId]
        );
        const [categoryRows] = await pool.execute(
            `SELECT DISTINCT category FROM question_bank 
             WHERE user_id = ? AND category IS NOT NULL`,
            [userId]
        );
        
        return {
            total,
            byDifficulty,
            byType,
            topics: topicRows.length,
            categories: categoryRows.length,
            topicsList: topicRows.map(r => r.topic),
            categoriesList: categoryRows.map(r => r.category)
        };
    }

    static async updateCategorization(id, categorizationData) {
        const pool = await getPool();
        const fields = [];
        const values = [];
        
        if (categorizationData.topic !== undefined) {
            fields.push('topic = ?');
            values.push(categorizationData.topic);
        }
        if (categorizationData.category !== undefined) {
            fields.push('category = ?');
            values.push(categorizationData.category);
        }
        if (categorizationData.subject !== undefined) {
            fields.push('subject = ?');
            values.push(categorizationData.subject);
        }
        if (categorizationData.difficulty !== undefined) {
            fields.push('difficulty = ?');
            values.push(categorizationData.difficulty);
        }
        if (categorizationData.keywords !== undefined) {
            fields.push('keywords = ?');
            values.push(JSON.stringify(categorizationData.keywords));
        }
        if (categorizationData.aiCategorized !== undefined) {
            fields.push('ai_categorized = ?');
            values.push(categorizationData.aiCategorized ? 1 : 0);
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        
        await pool.execute(
            `UPDATE question_bank SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return await QuestionBank.findById(id);
    }

    static async delete(id, userId) {
        const pool = await getPool();
        const [result] = await pool.execute(
            'DELETE FROM question_bank WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        return result.affectedRows > 0;
    }

    static async existsByQuestionData(userId, questionData) {
        const pool = await getPool();
        // Check if a question with the same stem already exists
        const questionDataStr = JSON.stringify(questionData);
        const [rows] = await pool.execute(
            `SELECT id FROM question_bank 
             WHERE user_id = ? AND question_data = ? 
             LIMIT 1`,
            [userId, questionDataStr]
        );
        return rows.length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            uuid: this.uuid,
            originalQuizId: this.originalQuizId,
            questionData: this.questionData,
            topic: this.topic,
            category: this.category,
            subject: this.subject,
            difficulty: this.difficulty,
            questionType: this.questionType,
            keywords: this.keywords,
            aiCategorized: this.aiCategorized,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = QuestionBank;

