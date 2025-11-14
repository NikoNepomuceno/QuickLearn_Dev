const QuestionBank = require('../models/QuestionBank');
const Quiz = require('../models/Quiz');
const deepSeekService = require('./deepseekService');

class QuestionBankService {

    /**
     * Extract questions from a quiz and categorize them using AI
     * @param {number|Object} quizIdOrQuiz - Quiz ID or Quiz object
     * @param {number} userId - User ID
     * @returns {Promise<{extracted: number, skipped: number}>}
     */
    async extractQuestionsFromQuiz(quizIdOrQuiz, userId) {
        try {
            // Accept either quiz ID or quiz object
            let quiz;
            let needsUserIdCheck = false;
            
            if (typeof quizIdOrQuiz === 'object' && quizIdOrQuiz !== null && !Array.isArray(quizIdOrQuiz)) {
                // Already have quiz object (from findByUserId - already filtered by userId)
                quiz = quizIdOrQuiz;
                needsUserIdCheck = false; // Trust that findByUserId already filtered correctly
            } else {
                // Fetch quiz by ID - need to verify userId
                quiz = await Quiz.findById(quizIdOrQuiz);
                needsUserIdCheck = true;
            }

            // Check if quiz exists
            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Check if quiz is soft-deleted (in trash)
            if (quiz.metadata && quiz.metadata.deletedAt) {
                // Skip quizzes that are in trash
                return { extracted: 0, skipped: 0 };
            }

            // Only check userId if we fetched by ID (not from findByUserId)
            if (needsUserIdCheck) {
                const quizUserId = Number(quiz.userId);
                const requestUserId = Number(userId);
                
                if (isNaN(quizUserId) || isNaN(requestUserId) || quizUserId !== requestUserId) {
                    console.error(`[QuestionBank] UserId mismatch - Quiz ID: ${quiz.id}, Quiz userId: ${quiz.userId}, Request userId: ${userId}`);
                    throw new Error(`Quiz access denied: quiz userId (${quiz.userId}) does not match request userId (${userId})`);
                }
            }

            if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
                return { extracted: 0, skipped: 0 };
            }

            const questionsToInsert = [];
            let skipped = 0;

            // Process each question
            for (const question of quiz.questions) {
                // Check if question already exists (avoid duplicates)
                const exists = await QuestionBank.existsByQuestionData(userId, question);
                if (exists) {
                    skipped++;
                    continue;
                }

                // Categorize question using AI
                const categorization = await this.categorizeQuestion(question);

                questionsToInsert.push({
                    userId,
                    originalQuizId: quiz.id,
                    questionData: question,
                    topic: categorization.topic,
                    category: categorization.category,
                    subject: categorization.subject,
                    difficulty: categorization.difficulty || quiz.difficulty || 'medium',
                    questionType: question.type || 'multiple_choice',
                    keywords: categorization.keywords || [],
                    aiCategorized: true
                });
            }

            // Bulk insert categorized questions
            if (questionsToInsert.length > 0) {
                await QuestionBank.bulkCreate(questionsToInsert);
            }

            return {
                extracted: questionsToInsert.length,
                skipped
            };
        } catch (error) {
            console.error('Error extracting questions from quiz:', error);
            throw error;
        }
    }

    /**
     * Extract questions from all user's quizzes
     * @param {number} userId - User ID
     * @returns {Promise<{extracted: number, skipped: number, processed: number}>}
     */
    async extractAllQuestions(userId) {
        try {
            // Get all user's quizzes
            const quizzes = await Quiz.findByUserId(userId, 1000, 0); // Get up to 1000 quizzes
            
            let totalExtracted = 0;
            let totalSkipped = 0;
            let processed = 0;

            for (const quiz of quizzes) {
                try {
                    // Skip quizzes that are soft-deleted (in trash)
                    if (quiz.metadata && quiz.metadata.deletedAt) {
                        continue;
                    }

                    // Pass quiz object directly instead of re-fetching by ID
                    // This avoids errors if quiz was deleted between queries
                    const result = await this.extractQuestionsFromQuiz(quiz, userId);
                    totalExtracted += result.extracted;
                    totalSkipped += result.skipped;
                    processed++;
                } catch (error) {
                    // Log error but continue with next quiz
                    // This handles cases where quiz might have been deleted or has access issues
                    const quizIdentifier = quiz.id || quiz.uuid || 'unknown';
                    console.error(`Error extracting from quiz ${quizIdentifier}:`, error.message || error);
                    // Continue with next quiz - don't throw, just skip
                }
            }

            return {
                extracted: totalExtracted,
                skipped: totalSkipped,
                processed
            };
        } catch (error) {
            console.error('Error extracting all questions:', error);
            throw error;
        }
    }

    /**
     * Use AI to categorize a single question
     * @param {Object} question - Question object
     * @returns {Promise<{topic: string, category: string, subject: string, keywords: Array, difficulty: string}>}
     */
    async categorizeQuestion(question) {
        try {
            return await deepSeekService.categorizeQuestion(question);
        } catch (error) {
            console.error('Error categorizing question:', error);
            // Return default categorization on error
            return {
                topic: 'General',
                category: null,
                subject: null,
                keywords: [],
                difficulty: question.difficulty || 'medium'
            };
        }
    }

    /**
     * Get user's questions with filters
     * @param {number} userId - User ID
     * @param {Object} filters - Filter options
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>}
     */
    async getUserQuestions(userId, filters = {}, pagination = {}) {
        try {
            const result = await QuestionBank.findByUserId(userId, filters, pagination);
            
            // Get stats if needed
            const stats = await QuestionBank.getStats(userId);
            
            return {
                questions: result.questions.map(q => q.toJSON()),
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                stats
            };
        } catch (error) {
            console.error('Error getting user questions:', error);
            throw error;
        }
    }

    /**
     * Create custom quiz from selected questions
     * @param {number} userId - User ID
     * @param {Object} quizData - Quiz data {title, description, questionIds}
     * @returns {Promise<Object>}
     */
    async createCustomQuiz(userId, quizData) {
        try {
            const { title, description, questionIds } = quizData;

            if (!title || !title.trim()) {
                throw new Error('Quiz title is required');
            }

            if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
                throw new Error('At least one question is required');
            }

            // Fetch questions from question bank
            const questions = [];
            for (const questionId of questionIds) {
                // Try to find by UUID first, then by ID
                let question = await QuestionBank.findByUuid(questionId);
                if (!question) {
                    const id = parseInt(questionId);
                    if (!isNaN(id)) {
                        question = await QuestionBank.findById(id);
                    }
                }

                if (question && question.userId === userId) {
                    questions.push(question.questionData);
                }
            }

            if (questions.length === 0) {
                throw new Error('No valid questions found');
            }

            // Create quiz using Quiz model
            const quiz = await Quiz.create({
                userId,
                title: title.trim(),
                description: description?.trim() || '',
                questions,
                difficulty: 'custom',
                generatedWithAi: false,
                metadata: {
                    isCustomQuiz: true,
                    source: 'question_bank',
                    questionCount: questions.length
                }
            });

            return { quiz: quiz.toJSON() };
        } catch (error) {
            console.error('Error creating custom quiz:', error);
            throw error;
        }
    }

    /**
     * Get question bank statistics
     * @param {number} userId - User ID
     * @returns {Promise<Object>}
     */
    async getStats(userId) {
        try {
            return await QuestionBank.getStats(userId);
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
}

module.exports = new QuestionBankService();

