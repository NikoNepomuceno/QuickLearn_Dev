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
                // Note: We skip duplicate check when clearing question bank first
                // This ensures all questions from the latest quiz are extracted
                
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

            console.log(`[createCustomQuiz] User ${userId} creating quiz with ${questionIds?.length || 0} questions`);
            console.log(`[createCustomQuiz] Question IDs:`, questionIds);

            if (!title || !title.trim()) {
                throw new Error('Quiz title is required');
            }

            if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
                throw new Error('At least one question is required');
            }

            // Fetch questions from question bank
            const questions = [];
            const notFoundIds = [];
            
            // Debug: Check what question IDs exist for this user
            const userQuestions = await QuestionBank.findByUserId(userId, {}, { page: 1, limit: 1000 });
            const existingIds = userQuestions.questions.map(q => q.id);
            const existingUuids = userQuestions.questions.map(q => q.uuid);
            console.log(`[createCustomQuiz] User ${userId} has ${userQuestions.questions.length} questions in bank`);
            console.log(`[createCustomQuiz] Existing IDs: ${existingIds.slice(0, 10).join(', ')}... (showing first 10)`);
            console.log(`[createCustomQuiz] Existing UUIDs: ${existingUuids.slice(0, 5).join(', ')}... (showing first 5)`);
            console.log(`[createCustomQuiz] Requested UUIDs: ${questionIds.join(', ')}`);
            
            // Check if any requested UUIDs match existing ones
            const requestedUuids = questionIds.filter(id => typeof id === 'string' && (id.length === 36 || id.length === 32));
            const matchingUuids = requestedUuids.filter(reqUuid => {
                const normalized = reqUuid.trim();
                return existingUuids.some(existing => existing === normalized || existing.toLowerCase() === normalized.toLowerCase());
            });
            console.log(`[createCustomQuiz] Matching UUIDs found: ${matchingUuids.length} of ${requestedUuids.length}`);
            
            for (const questionId of questionIds) {
                let question = null;
                
                // Try to find by UUID first (if it looks like a UUID)
                // UUID format: 36 characters with hyphens (e.g., "550e8400-e29b-41d4-a716-446655440000")
                const isUuidFormat = typeof questionId === 'string' && 
                                     (questionId.length === 36 || questionId.length === 32) && 
                                     (questionId.includes('-') || /^[0-9a-f]{32}$/i.test(questionId));
                
                if (isUuidFormat) {
                    // Trim and normalize UUID (remove whitespace, ensure proper format)
                    const normalizedUuid = String(questionId).trim();
                    question = await QuestionBank.findByUuid(normalizedUuid);
                    if (!question && normalizedUuid.length === 32) {
                        // Try with hyphens if it's a 32-char hex string
                        const withHyphens = `${normalizedUuid.slice(0,8)}-${normalizedUuid.slice(8,12)}-${normalizedUuid.slice(12,16)}-${normalizedUuid.slice(16,20)}-${normalizedUuid.slice(20)}`;
                        question = await QuestionBank.findByUuid(withHyphens);
                    }
                }
                
                // If not found by UUID, try by numeric ID
                if (!question) {
                    const id = typeof questionId === 'number' ? questionId : parseInt(questionId);
                    if (!isNaN(id) && id > 0) {
                        question = await QuestionBank.findById(id);
                    }
                }

                if (question) {
                    // Check if question belongs to user
                    // Normalize both to numbers for comparison (database returns BIGINT, userId might be number or string)
                    const questionUserId = Number(question.userId);
                    const requestUserId = Number(userId);
                    
                    if (!isNaN(questionUserId) && !isNaN(requestUserId) && questionUserId === requestUserId) {
                        questions.push(question.questionData);
                        console.log(`[createCustomQuiz] Found question ${questionId} -> ID: ${question.id}, UUID: ${question.uuid}`);
                    } else {
                        console.warn(`Question ${questionId} belongs to different user (${question.userId} [${typeof question.userId}] vs ${userId} [${typeof userId}])`);
                        notFoundIds.push(questionId);
                    }
                } else {
                    console.warn(`Question not found: ${questionId} (type: ${typeof questionId}, isUUID: ${isUuidFormat})`);
                    notFoundIds.push(questionId);
                }
            }

            if (questions.length === 0) {
                const errorMsg = `No valid questions found. Requested: ${questionIds.length}, Found: ${questions.length}, Not found: ${notFoundIds.join(', ')}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            // Log if some questions were not found
            if (notFoundIds.length > 0) {
                console.warn(`Some questions were not found or don't belong to user: ${notFoundIds.join(', ')}`);
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

    /**
     * Clear all questions from user's question bank
     * @param {number} userId - User ID
     * @returns {Promise<{deleted: number}>}
     */
    async clearAllQuestions(userId) {
        try {
            const deletedCount = await QuestionBank.deleteAllByUserId(userId);
            return { deleted: deletedCount };
        } catch (error) {
            console.error('Error clearing all questions:', error);
            throw error;
        }
    }
}

module.exports = new QuestionBankService();

