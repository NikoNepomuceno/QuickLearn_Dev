const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const File = require('../models/File');
const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz, generateAdvancedQuiz, generateAIPoweredSummary } = require('./quizService');

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

            // Step 2: Extract text and pages from the uploaded file
            const mockFile = {
                originalname: originalFilename,
                mimetype: this.getMimeTypeFromFilename(originalFilename),
                buffer: fileBuffer
            };
            
            const parseResult = await parseUploadedFile(mockFile);
            const textContent = parseResult.text;
            const pages = parseResult.pages || [textContent];
            const pageCount = parseResult.pageCount || 1;
            
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
                customInstructions = '',
                selectedPages = []
            } = quizOptions;

            // Use selected pages if provided, otherwise use full text
            let contentToUse = textContent;
            console.log('Selected pages received:', {
                selectedPages: selectedPages,
                type: typeof selectedPages,
                isArray: Array.isArray(selectedPages),
                length: selectedPages?.length
            });
            
            if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
                // Filter pages based on selected page indices
                const selectedPageContents = selectedPages.map(page => page.content).filter(Boolean);
                console.log('Selected page contents:', selectedPageContents.length);
                if (selectedPageContents.length > 0) {
                    contentToUse = selectedPageContents.join('\n\n');
                    console.log('Using selected pages content, length:', contentToUse.length);
                }
            } else {
                console.log('Using full text content, length:', contentToUse.length);
            }

            let generatedQuiz;
            if (isAdvanced) {
                generatedQuiz = await generateAdvancedQuiz(contentToUse, {
                    numQuestions,
                    difficulty,
                    includeReasoning,
                    customInstructions
                });
            } else {
                generatedQuiz = await generateAIPoweredQuiz(contentToUse, {
                    numQuestions,
                    difficulty,
                    questionTypes,
                    focusAreas,
                    customInstructions
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
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    pages: pages,
                    pageCount: pageCount
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

            // Exclude trashed quizzes
            const filtered = enhancedQuizzes.filter(q => !q.metadata?.deletedAt);
            return filtered;
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

            // Realtime: broadcast leaderboard updates for this user
            try {
                const { broadcastLeaderboardFor } = require('../realtime/leaderboard');
                // Access the shared IO instance via process global if set by index.js
                if (global.__io) {
                    await broadcastLeaderboardFor(global.__io, Number(userId));
                }
            } catch (e) {
                // Ignore realtime errors
            }

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
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }

            // Soft delete: mark metadata.deletedAt
            const meta = quiz.metadata || {};
            meta.deletedAt = new Date().toISOString();
            await quiz.update({ metadata: meta });
            return true;
        } catch (error) {
            console.error('Error deleting quiz:', error);
            throw error;
        }
    }

    /**
     * Permanently delete a quiz and its associated file
     */
    static async deleteQuizPermanently(quizUuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }

            // Delete associated file if exists
            if (quiz.sourceFileId) {
                await File.delete(quiz.sourceFileId, Number(userId));
            }

            // Delete quiz (attempts will be cascade deleted)
            const deleted = await Quiz.delete(quiz.id, Number(userId));
            return deleted;
        } catch (error) {
            console.error('Error permanently deleting quiz:', error);
            throw error;
        }
    }

    /**
     * Get trashed quizzes for a user
     */
    static async getTrashedQuizzes(userId, limit = 50, offset = 0) {
        try {
            const quizzes = await Quiz.findByUserId(userId, limit, offset);
            const trashed = quizzes
                .map(q => q.toJSON())
                .filter(q => !!q.metadata?.deletedAt);
            return trashed;
        } catch (error) {
            console.error('Error getting trashed quizzes:', error);
            throw error;
        }
    }

    /**
     * Get user's summaries (stored in quizzes with metadata.type === 'summary')
     */
    static async getUserSummaries(userId, limit = 20, offset = 0) {
        try {
            const items = await Quiz.findByUserId(userId, limit, offset);
            const summaries = items
                .map(q => q.toJSON())
                .filter(q => q.metadata?.type === 'summary' && !q.metadata?.deletedAt)
                .map(q => {
                    const s = q.metadata?.summaryContent || {};
                    return {
                        id: q.id, // uuid from toJSON
                        title: s.title || q.title,
                        description: s.description || q.description || '',
                        keyPoints: s.keyPoints || [],
                        sections: s.sections || [],
                        conclusions: s.conclusions || [],
                        createdAt: q.createdAt,
                        sourceFile: q.sourceFile,
                        metadata: q.metadata
                    };
                });
            return summaries;
        } catch (error) {
            console.error('Error getting user summaries:', error);
            throw error;
        }
    }

    /**
     * Soft delete a summary (set metadata.deletedAt)
     */
    static async deleteSummary(uuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }
            const meta = quiz.metadata || {};
            if (meta.type !== 'summary') {
                return false;
            }
            meta.deletedAt = new Date().toISOString();
            await quiz.update({ metadata: meta });
            return true;
        } catch (error) {
            console.error('Error deleting summary:', error);
            throw error;
        }
    }

    /**
     * Get trashed summaries
     */
    static async getTrashedSummaries(userId, limit = 50, offset = 0) {
        try {
            const items = await Quiz.findByUserId(userId, limit, offset);
            const trashed = items
                .map(q => q.toJSON())
                .filter(q => q.metadata?.type === 'summary' && !!q.metadata?.deletedAt)
                .map(q => ({ id: q.id, title: q.title, metadata: q.metadata, createdAt: q.createdAt }));
            return trashed;
        } catch (error) {
            console.error('Error getting trashed summaries:', error);
            throw error;
        }
    }

    /**
     * Restore a trashed summary
     */
    static async restoreSummary(uuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }
            const meta = quiz.metadata || {};
            if (meta.type !== 'summary') return false;
            if (!meta.deletedAt) return true;
            delete meta.deletedAt;
            await quiz.update({ metadata: meta });
            return true;
        } catch (error) {
            console.error('Error restoring summary:', error);
            throw error;
        }
    }

    /**
     * Permanently delete a trashed summary
     */
    static async deleteSummaryPermanently(uuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }
            const meta = quiz.metadata || {};
            if (meta.type !== 'summary') return false;
            if (quiz.sourceFileId) {
                await File.delete(quiz.sourceFileId, Number(userId));
            }
            const deleted = await Quiz.delete(quiz.id, Number(userId));
            return deleted;
        } catch (error) {
            console.error('Error permanently deleting summary:', error);
            throw error;
        }
    }
    /**
     * Restore a trashed quiz
     */
    static async restoreQuiz(quizUuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(quizUuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return false;
            }
            const meta = quiz.metadata || {};
            if (!meta.deletedAt) return true;
            delete meta.deletedAt;
            await quiz.update({ metadata: meta });
            return true;
        } catch (error) {
            console.error('Error restoring quiz:', error);
            throw error;
        }
    }

    /**
     * Purge trashed quizzes older than thresholdDays (default 30)
     */
    static async purgeTrashedQuizzes(userId, thresholdDays = 30) {
        try {
            const list = await this.getTrashedQuizzes(userId, 200, 0);
            const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
            let purged = 0;
            for (const q of list) {
                const deletedAt = Date.parse(q.metadata?.deletedAt || '');
                if (!isNaN(deletedAt) && deletedAt < cutoff) {
                    const ok = await this.deleteQuizPermanently(q.id, userId);
                    if (ok) purged++;
                }
            }
            return { purged };
        } catch (error) {
            console.error('Error purging trashed quizzes:', error);
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
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

    /**
     * Create a summary with file upload to Cloudinary
     */
    static async createSummaryWithFile(fileBuffer, originalFilename, userId, summaryOptions = {}) {
        try {
            console.log('Starting createSummaryWithFile with options:', summaryOptions);
            
            // Step 1: Upload file to Cloudinary and save metadata
            console.log('Uploading file to Cloudinary...');
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
            console.log('File uploaded successfully to Cloudinary');

            // Step 2: Extract text and pages from the uploaded file
            const mockFile = {
                originalname: originalFilename,
                mimetype: this.getMimeTypeFromFilename(originalFilename),
                buffer: fileBuffer
            };
            
            const parseResult = await parseUploadedFile(mockFile);
            const textContent = parseResult.text;
            const pages = parseResult.pages || [textContent];
            const pageCount = parseResult.pageCount || 1;
            
            if (!textContent || !textContent.trim()) {
                throw new Error('Unable to extract text from the uploaded file.');
            }

            // Step 3: Generate summary using AI
            const {
                customInstructions = '',
                focusAreas = [],
                selectedPages = []
            } = summaryOptions;

            // Use selected pages if provided, otherwise use full text
            let contentToUse = textContent;
            console.log('Selected pages for summary:', {
                selectedPages: selectedPages,
                type: typeof selectedPages,
                isArray: Array.isArray(selectedPages),
                length: selectedPages?.length
            });
            
            if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
                // Filter pages based on selected page indices
                const selectedPageContents = selectedPages.map(page => page.content).filter(Boolean);
                console.log('Selected page contents for summary:', selectedPageContents.length);
                if (selectedPageContents.length > 0) {
                    contentToUse = selectedPageContents.join('\n\n');
                    console.log('Using selected pages content for summary, length:', contentToUse.length);
                }
            } else {
                console.log('Using full text content for summary, length:', contentToUse.length);
            }

            const generatedSummary = await generateAIPoweredSummary(contentToUse, {
                customInstructions,
                focusAreas
            });

            // Step 4: Save summary to database (we'll use Quiz model for now, but with a different type)
            const summaryData = {
                userId: userId,
                title: generatedSummary.title,
                description: generatedSummary.description,
                questions: [], // Empty for summaries
                sourceFileId: file.id,
                sourceFileName: originalFilename,
                sourceFileType: file.format,
                sourceFileSize: file.bytes,
                textLength: textContent.length,
                difficulty: 'medium', // Default for summaries
                generatedWithAi: true,
                processingTime: new Date(),
                metadata: {
                    generatedWithAI: true,
                    textLength: textContent.length,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    options: summaryOptions,
                    type: 'summary', // Mark as summary type
                    summaryContent: generatedSummary
                }
            };

            const summary = await Quiz.create(summaryData);
            
            return {
                summary: {
                    id: summary.id,
                    uuid: summary.uuid,
                    title: generatedSummary.title,
                    description: generatedSummary.description,
                    keyPoints: generatedSummary.keyPoints,
                    sections: generatedSummary.sections,
                    conclusions: generatedSummary.conclusions,
                    createdAt: summary.createdAt,
                    metadata: summary.metadata
                },
                file: file,
                metadata: {
                    generatedWithAI: true,
                    textLength: textContent.length,
                    processingTime: new Date().toISOString(),
                    fileUploaded: true,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    pages: pages,
                    pageCount: pageCount,
                    type: 'summary'
                }
            };

        } catch (error) {
            console.error('Error creating summary with file:', error);
            throw error;
        }
    }
}

module.exports = CloudStorageService;
