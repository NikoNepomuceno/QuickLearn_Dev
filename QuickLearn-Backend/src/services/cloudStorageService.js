const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const File = require('../models/File');
const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz, generateAdvancedQuiz, generateAIPoweredSummary, generateAIPoweredFlashcards } = require('./quizService');

// ----- Scoring helpers -----
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function normalizeValue(v) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.map(x => String(x).trim().toLowerCase()).filter(Boolean);
    return String(v).trim().toLowerCase();
}
function isAnswerCorrectBackend(userAnswer, correctAnswer, questionType) {
    if (questionType === 'enumeration') {
        const u = normalizeValue(userAnswer);
        const c = normalizeValue(correctAnswer);
        if (!Array.isArray(u) || !Array.isArray(c) || c.length === 0) return false;
        // require every correct item to appear in user list
        const variations = {
            javascript: ['js', 'javascript', 'ecmascript'],
            js: ['javascript', 'js', 'ecmascript'],
            html: ['hypertext markup language', 'html'],
            css: ['cascading style sheets', 'css'],
            dom: ['document object model', 'dom'],
            api: ['application programming interface', 'api']
        };
        return c.every(item => {
            if (u.includes(item)) return true;
            if (variations[item]) return variations[item].some(alt => u.includes(alt));
            return false;
        });
    } else {
        const u = normalizeValue(userAnswer);
        const c = normalizeValue(correctAnswer);
        if (!u || !c) return false;
        if (u === c) return true;
        const variations = {
            dom: ['document object model', 'dom'],
            'document object model': ['dom', 'document object model'],
            javascript: ['js', 'javascript', 'ecmascript'],
            js: ['javascript', 'js', 'ecmascript'],
            ecmascript: ['javascript', 'js', 'ecmascript'],
            html: ['hypertext markup language', 'html'],
            'hypertext markup language': ['html', 'hypertext markup language'],
            css: ['cascading style sheets', 'css'],
            'cascading style sheets': ['css', 'cascading style sheets'],
            api: ['application programming interface', 'api'],
            'application programming interface': ['api', 'application programming interface'],
            url: ['uniform resource locator', 'url'],
            'uniform resource locator': ['url', 'uniform resource locator'],
            http: ['hypertext transfer protocol', 'http'],
            'hypertext transfer protocol': ['http', 'hypertext transfer protocol'],
            https: ['hypertext transfer protocol secure', 'https'],
            'hypertext transfer protocol secure': ['https', 'hypertext transfer protocol secure'],
            json: ['javascript object notation', 'json'],
            'javascript object notation': ['json', 'javascript object notation'],
            xml: ['extensible markup language', 'xml'],
            'extensible markup language': ['xml', 'extensible markup language'],
            sql: ['structured query language', 'sql'],
            'structured query language': ['sql', 'structured query language'],
            true: ['yes', 'correct', 'true', '1'],
            false: ['no', 'incorrect', 'false', '0']
        };
        if (variations[c]?.includes(u)) return true;
        if (variations[u]?.includes(c)) return true;
        return false;
    }
}

function computeSpeedPoints({ questions, userAnswers, questionTimesMs, totalTimeSeconds }) {
    const qCount = Array.isArray(questions) ? questions.length : 0;
    if (qCount === 0) return { pointsEarned: 0, usedTimes: [] };
    // Config
    const MAX = Number(process.env.POINTS_MAX_PER_CORRECT || 100);
    const MIN = Number(process.env.POINTS_MIN_PER_CORRECT || 20);
    const FULL_MS = Number(process.env.SPEED_FULL_POINTS_MS || 3000);
    const MIN_MS = Number(process.env.SPEED_MIN_POINTS_MS || 30000);

    // Build per-question times
    let times = Array.isArray(questionTimesMs) && questionTimesMs.length === qCount
        ? questionTimesMs.map(t => Number(t) || 0)
        : null;
    if (!times) {
        const totalMs = Math.max(0, Number(totalTimeSeconds || 0) * 1000);
        const even = Math.floor(totalMs / qCount);
        times = Array.from({ length: qCount }, () => even);
    }

    let total = 0;
    for (let i = 0; i < qCount; i++) {
        const q = questions[i];
        const userAns = Array.isArray(userAnswers) ? userAnswers[i] : null;
        const correct = isAnswerCorrectBackend(userAns, q?.answer, q?.type || 'multiple_choice');
        if (!correct) continue;
        const t = clamp(Number(times[i]) || 0, FULL_MS, MIN_MS);
        const weight = 1 - ((t - FULL_MS) / (MIN_MS - FULL_MS)); // 1 at FULL_MS, 0 at MIN_MS
        const pts = MIN + weight * (MAX - MIN);
        total += Math.round(pts);
    }
    return { pointsEarned: total, usedTimes: times };
}

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

            const { pointsEarned, usedTimes } = computeSpeedPoints({
                questions: quiz.questions || [],
                userAnswers: attemptData.userAnswers || [],
                questionTimesMs: attemptData.questionTimesMs || null,
                totalTimeSeconds: attemptData.timeSeconds
            });

            const attempt = await QuizAttempt.create({
                quizId: quiz.id,
                userId: userId,
                score: attemptData.score,
                timeSeconds: attemptData.timeSeconds,
                userAnswers: attemptData.userAnswers,
                pointsEarned,
                questionTimesMs: usedTimes
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
     * Get user's flashcards
     */
    static async getUserFlashcards(userId, limit = 20, offset = 0) {
        try {
            const items = await Quiz.findByUserId(userId, limit, offset);
            const flashcards = items
                .map(q => q.toJSON())
                .filter(q => q.metadata?.type === 'flashcards' && !q.metadata?.deletedAt)
                .map(q => {
                    const fc = q.metadata?.flashcards || {};
                    return {
                        id: q.id,
                        title: fc.title || q.title || 'Flashcards',
                        description: q.description || '',
                        cardsCount: Array.isArray(fc.cards) ? fc.cards.length : 0,
                        createdAt: q.createdAt,
                        sourceFile: q.sourceFile,
                        metadata: q.metadata
                    };
                });
            return flashcards;
        } catch (error) {
            console.error('Error getting user flashcards:', error);
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

    /**
     * Create flashcards with file upload to Cloudinary
     */
    static async createFlashcardsWithFile(fileBuffer, originalFilename, userId, options = {}) {
        try {
            // Upload file
            const { file, cloudinaryResult } = await File.uploadAndSave(
                fileBuffer,
                originalFilename,
                userId,
                {
                    quality: 'auto:good',
                    flags: 'attachment'
                }
            );

            // Extract text and pages
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

            // Use selected pages if provided
            const { customInstructions = '', selectedPages = [] } = options;
            let contentToUse = textContent;
            if (Array.isArray(selectedPages) && selectedPages.length > 0) {
                const selectedPageContents = selectedPages.map(p => p.content).filter(Boolean);
                if (selectedPageContents.length > 0) {
                    contentToUse = selectedPageContents.join('\n\n');
                }
            }

            // Generate flashcards
            const generated = await generateAIPoweredFlashcards(contentToUse, { customInstructions });

            // Persist in quizzes table with metadata.type='flashcards'
            const quizData = {
                userId: userId,
                title: generated.title || 'Flashcards',
                description: 'Flashcards generated from uploaded content',
                questions: [], // none
                sourceFileId: file.id,
                sourceFileName: originalFilename,
                sourceFileType: file.format,
                sourceFileSize: file.bytes,
                textLength: textContent.length,
                difficulty: 'medium',
                generatedWithAi: true,
                processingTime: new Date(),
                metadata: {
                    type: 'flashcards',
                    flashcards: {
                        title: generated.title || 'Flashcards',
                        cards: Array.isArray(generated.cards) ? generated.cards : []
                    },
                    generatedWithAI: true,
                    textLength: textContent.length,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: cloudinaryResult.public_id,
                    cloudinaryUrl: cloudinaryResult.secure_url,
                    options: options,
                    pages,
                    pageCount
                }
            };

            const quiz = await Quiz.create(quizData);
            const out = {
                flashcards: {
                    id: quiz.uuid,
                    title: quizData.metadata.flashcards.title,
                    cards: quizData.metadata.flashcards.cards
                }
            };
            return out;
        } catch (error) {
            console.error('Error creating flashcards with file:', error);
            throw error;
        }
    }

    /**
     * Get flashcards by UUID
     */
    static async getFlashcards(uuid, userId) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz) return null;
            const meta = quiz.metadata || {};
            if (meta.type !== 'flashcards') return null;
            const fc = meta.flashcards || { title: quiz.title || 'Flashcards', cards: [] };
            return {
                id: quiz.uuid,
                title: fc.title || quiz.title || 'Flashcards',
                cards: Array.isArray(fc.cards) ? fc.cards : []
            };
        } catch (error) {
            console.error('Error getting flashcards:', error);
            throw error;
        }
    }

    /**
     * Update flashcards by UUID (title/cards)
     */
    static async updateFlashcards(uuid, userId, payload) {
        try {
            const quiz = await Quiz.findByUuid(uuid);
            if (!quiz || Number(quiz.userId) !== Number(userId)) {
                return null;
            }
            const meta = quiz.metadata || {};
            if (meta.type !== 'flashcards') return null;
            meta.flashcards = {
                title: payload.title ?? (meta.flashcards?.title || quiz.title || 'Flashcards'),
                cards: Array.isArray(payload.cards) ? payload.cards : (meta.flashcards?.cards || [])
            };
            const updated = await quiz.update({
                title: payload.title !== undefined ? payload.title : quiz.title,
                metadata: meta
            });
            return {
                id: updated.uuid,
                title: meta.flashcards.title,
                cards: meta.flashcards.cards
            };
        } catch (error) {
            console.error('Error updating flashcards:', error);
            throw error;
        }
    }
}

module.exports = CloudStorageService;
