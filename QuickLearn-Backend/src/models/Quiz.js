const { getPool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Quiz {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.uuid = data.uuid;
        this.title = data.title;
        this.description = data.description;
        this.questions = data.questions;
        this.sourceFileId = data.source_file_id;
        this.sourceFileName = data.source_file_name;
        this.sourceFileType = data.source_file_type;
        this.sourceFileSize = data.source_file_size;
        this.textLength = data.text_length;
        this.difficulty = data.difficulty;
        this.questionCount = data.question_count;
        this.generatedWithAi = data.generated_with_ai;
        this.processingTime = data.processing_time;
        this.metadata = data.metadata;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(quizData) {
        const pool = await getPool();
        const uuid = uuidv4();
        
        const [result] = await pool.execute(
            `INSERT INTO quizzes (
                user_id, uuid, title, description, questions, 
                source_file_id, source_file_name, source_file_type, source_file_size,
                text_length, difficulty, question_count, generated_with_ai, 
                processing_time, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                quizData.userId,
                uuid,
                quizData.title,
                quizData.description,
                JSON.stringify(quizData.questions),
                quizData.sourceFileId || null,
                quizData.sourceFileName || null,
                quizData.sourceFileType || null,
                quizData.sourceFileSize || null,
                quizData.textLength || null,
                quizData.difficulty || 'medium',
                quizData.questions?.length || 0,
                quizData.generatedWithAi !== false,
                quizData.processingTime || new Date(),
                JSON.stringify(quizData.metadata || {})
            ]
        );

        return await Quiz.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM quizzes WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        
        const quiz = new Quiz(rows[0]);
        quiz.questions = JSON.parse(quiz.questions);
        quiz.metadata = JSON.parse(quiz.metadata || '{}');
        return quiz;
    }

    static async findByUuid(uuid) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM quizzes WHERE uuid = ?',
            [uuid]
        );
        
        if (rows.length === 0) return null;
        
        const quiz = new Quiz(rows[0]);
        quiz.questions = JSON.parse(quiz.questions);
        quiz.metadata = JSON.parse(quiz.metadata || '{}');
        return quiz;
    }

    static async findByUserId(userId, limit = 20, offset = 0) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT q.*, f.secure_url as file_url, f.original_filename as file_original_name
             FROM quizzes q 
             LEFT JOIN files f ON q.source_file_id = f.id 
             WHERE q.user_id = ? 
             ORDER BY q.created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        
        return rows.map(row => {
            const quiz = new Quiz(row);
            quiz.questions = JSON.parse(quiz.questions);
            quiz.metadata = JSON.parse(quiz.metadata || '{}');
            quiz.fileUrl = row.file_url;
            quiz.fileOriginalName = row.file_original_name;
            return quiz;
        });
    }

    static async delete(id, userId) {
        const pool = await getPool();
        const [result] = await pool.execute(
            'DELETE FROM quizzes WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        return result.affectedRows > 0;
    }

    async update(updateData) {
        const pool = await getPool();
        const fields = [];
        const values = [];
        
        if (updateData.title !== undefined) {
            fields.push('title = ?');
            values.push(updateData.title);
        }
        if (updateData.description !== undefined) {
            fields.push('description = ?');
            values.push(updateData.description);
        }
        if (updateData.questions !== undefined) {
            fields.push('questions = ?');
            values.push(JSON.stringify(updateData.questions));
        }
        if (updateData.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(updateData.metadata));
        }
        
        if (fields.length === 0) return this;
        
        values.push(this.id);
        
        await pool.execute(
            `UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return await Quiz.findById(this.id);
    }

    toJSON() {
        return {
            id: this.uuid, // Use UUID for external API
            title: this.title,
            description: this.description,
            questions: this.questions,
            sourceFile: {
                name: this.sourceFileName,
                type: this.sourceFileType,
                size: this.sourceFileSize,
                url: this.fileUrl,
                originalName: this.fileOriginalName
            },
            textLength: this.textLength,
            difficulty: this.difficulty,
            questionCount: this.questionCount,
            generatedWithAi: this.generatedWithAi,
            processingTime: this.processingTime,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Quiz;
