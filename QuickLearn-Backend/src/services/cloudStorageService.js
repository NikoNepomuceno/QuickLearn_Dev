const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const File = require('../models/File');
const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz, generateAdvancedQuiz } = require('./quizService');

class CloudStorageService {
    /**
     * Create a quiz with file upload to Cloudinary
     */
    static async createQuizWithFile(fileBuffer, originalFilename, userId, quizOptions = {}) {
        try {
            // Step 1: Upload file to Cloudinary and save metadata
            const { file, cloudinaryResult } = await File.uploadAndSave(
                fileBuffer,
                originalFilename,
                userId,
                {
                    // Compression options
                    quality: 'auto:good',
                    flags: 'attachment'
                }
            );

            // Step 2: Extract text from the uploaded file
            const mockFile = {
                originalname: originalFilename,
                mimetype: this.getMimeTypeFromFilename(originalFilename),
                buffer: fileBuffer
            };
            
            const textContent = await parseUploadedFile(mockFile);
            
            if (!textContent || !textContent.trim()) {
                throw new Error('Unable to extract text from the uploaded file.');
            }

            // Step 3: Generate quiz using AI
            const {
                numQuestions = 5,
                difficulty = 'medium',
                questionTypes = ['multiple_choice'],
                focusAreas = [],
                isAdvanced = false,
                includeReasoning = true,
                customInstructions = ''
            } = quizOptions;

            let generatedQuiz;
            if (isAdvanced) {
                generatedQuiz = await generateAdvancedQuiz(textContent, {
                    numQuestions,
                    difficulty,
                    includeReasoning,
                    customInstructions
                });
            } else {
                generatedQuiz = await generateAIPoweredQuiz(textContent, {
                    numQuestions,
                    difficulty,
                    questionTypes,
                    focusAreas
                });
            }

            // Step 4: Save quiz to database
            const quizData = {
                userId: userId,
                title: generatedQuiz.title,
                description: generatedQuiz.description,
                questions: generatedQuiz.questions,
                sourceFileId: file.id,
                sourceFileName: originalFilename,
                sourceFileType: file.format,
                sourceFileSize: file.bytes,
                textLength: textContent.length,
                difficulty: difficulty,
                generatedWithAi: true,
                processingTime: new Date(),
                metadata: {
                    generatedWithAI: true,
                    textLength: textContent.length,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    options: quizOptions
                }
            };

            const quiz = await Quiz.create(quizData);
            
            return {
                quiz: quiz,
                file: file,
                metadata: {
                    generatedWithAI: true,
                    textLength: textContent.length,
                    processingTime: new Date().toISOString(),
                    fileUploaded: true,
                    cloudinaryUrl: cloudinaryResult.secure_url
                }
            };

        } catch (error) {
            console.error('Error creating quiz with file:', error);
            throw error;
        }
    }

    /**
     * Get user's quizzes with file information
     */
    static async getUserQuizzes(userId, limit = 20, offset = 0) {
        try {
            const quizzes = await Quiz.findByUserId(userId, limit, offset);
            
            // Enhance each quiz with attempt summary
            const enhancedQuizzes = await Promise.all(
                quizzes.map(async (quiz) => {
                    const summary = await QuizAttempt.getQuizSummary(quiz.id, userId);
                    const quizJson = quiz.toJSON();
                    quizJson.summary = summary;
                    return quizJson;
                })
            );

            return enhancedQuizzes;
        } catch (error) {
            console.error('Error getting user quizzes:', error);
            throw error;
        }
    }

    /**
     * Get a specific quiz by UUID
     */
    static async getQuizByUuid(uuid, userId = null) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz) return null;

            // If userId is provided, check ownership or make it public access
            if (userId && quiz.userId !== userId) {
                // For now, allow access to any quiz (public sharing)
                // In production, you might want to implement proper sharing permissions
            }

            const summary = await QuizAttempt.getQuizSummary(quiz.id, userId);
            const quizJson = quiz.toJSON();
            quizJson.summary = summary;

            return quizJson;
        } catch (error) {
            console.error('Error getting quiz by UUID:', error);
            throw error;
        }
    }

    /**
     * Save a quiz attempt
     */
    static async saveQuizAttempt(quizUuid, userId, attemptData) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz) {
                throw new Error('Quiz not found');
            }

            const attempt = await QuizAttempt.create({
                quizId: quiz.id,
                userId: userId,
                score: attemptData.score,
                timeSeconds: attemptData.timeSeconds,
                userAnswers: attemptData.userAnswers
            });

            return attempt.toJSON();
        } catch (error) {
            console.error('Error saving quiz attempt:', error);
            throw error;
        }
    }

    /**
     * Get quiz attempts
     */
    static async getQuizAttempts(quizUuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz) {
                throw new Error('Quiz not found');
            }

            const attempts = await QuizAttempt.findByUserAndQuiz(userId, quiz.id);
            return attempts.map(attempt => attempt.toJSON());
        } catch (error) {
            console.error('Error getting quiz attempts:', error);
            throw error;
        }
    }

    /**
     * Delete a quiz and its associated file
     */
    static async deleteQuiz(quizUuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz || quiz.userId !== userId) {
                return false;
            }

            // Delete associated file if exists
            if (quiz.sourceFileId) {
                await File.delete(quiz.sourceFileId, userId);
            }

            // Delete quiz (attempts will be cascade deleted)
            const deleted = await Quiz.delete(quiz.id, userId);
            return deleted;
        } catch (error) {
            console.error('Error deleting quiz:', error);
            throw error;
        }
    }

    /**
     * Helper method to determine MIME type from filename
     */
    static getMimeTypeFromFilename(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'doc': 'application/msword'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Get file information by quiz UUID
     */
    static async getQuizFile(quizUuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz || quiz.userId !== userId) {
                return null;
            }

            if (!quiz.sourceFileId) {
                return null;
            }

            const file = await File.findById(quiz.sourceFileId);
            return file ? file.toJSON() : null;
        } catch (error) {
            console.error('Error getting quiz file:', error);
            throw error;
        }
    }
}

module.exports = CloudStorageService;
