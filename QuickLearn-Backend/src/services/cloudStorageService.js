const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const File = require('../models/File');
const UserCategoryStat = require('../models/UserCategoryStat');
const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz, generateAdvancedQuiz, generateAIPoweredSummary, generateAIPoweredFlashcards } = require('./quizService');
const questionBankService = require('./questionBankService');
const { computeHashFromFiles } = require('./backgroundQuizService');
const { getCachedQuestions, filterQuestionsFromCache } = require('./quizCacheService');
const { generateFullQuizSetInBackground } = require('./backgroundQuizService');

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

const QUESTION_TYPE_MULTIPLIERS = {
    identification: Number(process.env.POINTS_MULT_IDENTIFICATION || 1.25),
    enumeration: Number(process.env.POINTS_MULT_ENUMERATION || 1.4),
    multiple_choice: Number(process.env.POINTS_MULT_MULTIPLE_CHOICE || 1),
    true_false: Number(process.env.POINTS_MULT_TRUE_FALSE || 0.9)
};

function getTypeMultiplier(type) {
    if (!type) return 1;
    return QUESTION_TYPE_MULTIPLIERS[type] ?? 1;
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
        const multiplier = getTypeMultiplier(q?.type);
        total += Math.round(pts * multiplier);
    }
    return { pointsEarned: total, usedTimes: times };
}

function buildCategoryStatIncrements(quiz, totalPoints) {
    const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    if (!questions.length || !Number.isFinite(totalPoints) || totalPoints <= 0) {
        return [];
    }

    const buckets = new Map();
    let totalWeight = 0;

    for (const question of questions) {
        const label = (question?.category && String(question.category).trim())
            || (question?.topic && String(question.topic).trim())
            || (question?.subject && String(question.subject).trim())
            || 'General';

        const key = UserCategoryStat.normalizeCategoryKey(label);
        const weight = getTypeMultiplier(question?.type) || 1;
        totalWeight += weight;

        const bucket = buckets.get(key) || {
            categoryKey: key,
            categoryLabel: label,
            topic: question?.topic || label,
            subject: question?.subject || null,
            weightSum: 0,
            attempts: 0
        };

        bucket.weightSum += weight;
        bucket.attempts += 1;
        buckets.set(key, bucket);
    }

    if (!totalWeight) {
        totalWeight = questions.length || 1;
    }

    return Array.from(buckets.values()).map(bucket => ({
        categoryKey: bucket.categoryKey,
        categoryLabel: bucket.categoryLabel,
        topic: bucket.topic,
        subject: bucket.subject,
        attempts: bucket.attempts,
        points: (totalPoints * bucket.weightSum) / totalWeight
    }));
}

class CloudStorageService {
    static normalizeUploadArgs(fileOrFiles, secondArg, thirdArg, fourthArg) {
        if (Array.isArray(fileOrFiles)) {
            return {
                files: fileOrFiles,
                userId: secondArg,
                options: thirdArg || {}
            };
        }

        return {
            files: [{
                buffer: fileOrFiles,
                originalname: secondArg,
                mimetype: this.getMimeTypeFromFilename(secondArg)
            }],
            userId: thirdArg,
            options: fourthArg || {}
        };
    }

    static getContentFromSelection(defaultText, selectedPages) {
        if (Array.isArray(selectedPages) && selectedPages.length > 0) {
            const selected = selectedPages
                .map((page) => page?.content)
                .filter(Boolean);
            if (selected.length > 0) {
                return selected.join('\n\n');
            }
        }
        return defaultText;
    }

    static async prepareFilesForGeneration(files, userId) {
        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('No files uploaded. Please attach at least one file.');
        }
        if (files.length > 3) {
            throw new Error('You can upload up to 3 files per request.');
        }

        const uploadedFiles = [];
        const textSections = [];
        const pages = [];
        let totalTextLength = 0;

        try {
            for (const file of files) {
                const originalName = file.originalname || file.name || `Document ${uploadedFiles.length + 1}`;
                const buffer = file.buffer;

                if (!buffer) {
                    throw new Error(`Uploaded file "${originalName}" is empty or unreadable.`);
                }

                const { file: storedFile, cloudinaryResult } = await File.uploadAndSave(
                    buffer,
                    originalName,
                    userId,
                    {
                        quality: 'auto:good',
                        flags: 'attachment'
                    }
                );

                const parseResult = await parseUploadedFile({
                    originalname: originalName,
                    mimetype: file.mimetype || this.getMimeTypeFromFilename(originalName),
                    buffer
                });

                const text = parseResult.text || '';
                const parsedPages = parseResult.pages || [text];

                textSections.push(`### Source: ${originalName}\n\n${text}`);
                pages.push(...parsedPages);
                totalTextLength += text.length;

                uploadedFiles.push({
                    id: storedFile.id,
                    originalName,
                    bytes: storedFile.bytes,
                    format: storedFile.format,
                    url: cloudinaryResult.secure_url || cloudinaryResult.url,
                    cloudinaryPublicId: cloudinaryResult.public_id
                });
            }

            const combinedText = textSections.join('\n\n').trim();
            if (!combinedText) {
                throw new Error('Unable to extract text from the uploaded files.');
            }

            return {
                uploadedFiles,
                combinedText,
                pages,
                pageCount: pages.length,
                totalTextLength
            };
        } catch (error) {
            await Promise.all(
                uploadedFiles.map(async (fileMeta) => {
                    try {
                        await File.delete(fileMeta.id, userId);
                    } catch (cleanupErr) {
                        console.error('Error cleaning up uploaded file:', cleanupErr);
                    }
                })
            );
            throw error;
        }
    }

    /**
     * Create a quiz with file upload to Cloudinary
     */
    static async createQuizWithFile(fileBuffer, originalFilename, userId, quizOptions = {}) {
        const { files, userId: resolvedUserId, options } = this.normalizeUploadArgs(
            fileBuffer,
            originalFilename,
            userId,
            quizOptions
        );

        try {
            const prepared = await this.prepareFilesForGeneration(files, resolvedUserId);
            const {
                uploadedFiles,
                combinedText,
                pages,
                pageCount,
                totalTextLength
            } = prepared;

            const {
                numQuestions = 5,
                difficulty = 'medium',
                questionTypes = ['multiple_choice'],
                focusAreas = [],
                isAdvanced = false,
                includeReasoning = true,
                customInstructions = '',
                selectedPages = []
            } = options;

            // Compute file hash for caching
            const fileHash = computeHashFromFiles(files);
            console.log(`[Quiz] File hash: ${fileHash.substring(0, 8)}...`);

            // Check cache first
            const cached = await getCachedQuestions(fileHash);
            let generatedQuiz;

            if (cached && cached.questions && cached.questions.length > 0) {
                console.log(`[Quiz] Cache hit! Found ${cached.questions.length} cached questions`);
                
                // Filter cached questions based on user config
                const filteredQuestions = filterQuestionsFromCache(cached.questions, {
                    count: numQuestions,
                    questionTypes,
                    selectedPages,
                    pages: pages
                });
                
                if (filteredQuestions.length >= numQuestions) {
                    // Use cached questions
                    generatedQuiz = {
                        title: `Quiz from ${uploadedFiles[0]?.originalName || 'document'}`,
                        description: 'Quiz generated from cached questions',
                        questions: filteredQuestions
                    };
                    console.log(`[Quiz] Using ${filteredQuestions.length} questions from cache`);
                } else {
                    // Not enough cached questions match config, generate on-demand
                    console.log(`[Quiz] Cache has questions but not enough match config, generating on-demand`);
                    const contentToUse = this.getContentFromSelection(combinedText, selectedPages);
                    
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
                }
            } else {
                // Cache miss - generate on-demand for user
                console.log(`[Quiz] Cache miss, generating on-demand`);
                const contentToUse = this.getContentFromSelection(combinedText, selectedPages);
                
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
                
                // Trigger background generation of full 50-question set
                // Don't await - let it run in background
                generateFullQuizSetInBackground(files, fileHash)
                    .catch(err => {
                        console.error('[Quiz] Background generation failed:', err);
                    });
            }

            // Step 4: Save quiz to database
            const quizData = {
                userId: resolvedUserId,
                title: generatedQuiz.title,
                description: generatedQuiz.description,
                questions: generatedQuiz.questions,
                sourceFileId: uploadedFiles[0]?.id || null,
                sourceFileName: uploadedFiles[0]?.originalName || null,
                sourceFileType: uploadedFiles[0]?.format || null,
                sourceFileSize: uploadedFiles[0]?.bytes || null,
                textLength: totalTextLength,
                difficulty: difficulty,
                generatedWithAi: true,
                processingTime: new Date(),
                metadata: {
                    generatedWithAI: true,
                    textLength: totalTextLength,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: uploadedFiles[0]?.cloudinaryPublicId || null,
                    cloudinaryUrl: uploadedFiles[0]?.url || null,
                    options: options,
                    pages,
                    pageCount,
                    sourceFiles: uploadedFiles
                }
            };

            const quiz = await Quiz.create(quizData);
            
            // Clear question bank and extract questions from this new quiz only
            // This ensures question bank only contains questions from the latest quiz
            try {
                // First, clear all existing questions
                await questionBankService.clearAllQuestions(resolvedUserId);
                console.log(`[Auto-extract] Cleared existing question bank for user ${resolvedUserId}`);
                
                // Then, extract questions from the newly created quiz
                const extractionResult = await questionBankService.extractQuestionsFromQuiz(quiz, resolvedUserId);
                console.log(`[Auto-extract] Extracted ${extractionResult.extracted} questions from newly created quiz ${quiz.id}`);
            } catch (extractionError) {
                console.error('Error auto-extracting questions to question bank:', extractionError);
                // Continue - quiz creation was successful even if extraction fails
            }
            
            return {
                quiz: quiz,
                file: uploadedFiles[0] || null,
                metadata: {
                    generatedWithAI: true,
                    textLength: totalTextLength,
                    processingTime: new Date().toISOString(),
                    fileUploaded: true,
                    cloudinaryUrl: uploadedFiles[0]?.url || null,
                    pages: pages,
                    pageCount: pageCount,
                    sourceFiles: uploadedFiles
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

            // Update per-category stats for leaderboards
            try {
                const effectivePoints = Number.isFinite(pointsEarned) && pointsEarned > 0
                    ? pointsEarned
                    : Math.max(0, Number(attemptData.score) || 0);
                const categoryIncrements = buildCategoryStatIncrements(quiz, effectivePoints);
                if (categoryIncrements.length > 0) {
                    await UserCategoryStat.incrementStats(userId, categoryIncrements);
                }
            } catch (categoryErr) {
                console.error('Failed to update category stats:', categoryErr);
            }

            // Check and award achievements
            try {
                const AchievementService = require('./achievementService');
                const newAchievements = await AchievementService.checkQuizAttemptAchievements(
                    userId,
                    {
                        quizId: quiz.id,
                        score: attemptData.score,
                        timeSeconds: attemptData.timeSeconds,
                        userAnswers: attemptData.userAnswers,
                        quiz: quiz // Pass the full quiz object
                    }
                );
                
                // Broadcast new achievements via WebSocket if any were earned
                if (newAchievements.length > 0 && global.__io) {
                    global.__io.to(`user:${userId}`).emit('achievement_earned', {
                        achievements: newAchievements.map(a => a.toJSON())
                    });
                }
            } catch (e) {
                console.error('Error checking achievements:', e);
                // Don't fail the quiz attempt if achievement checking fails
            }

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

            // Delete associated files if they exist
            const meta = quiz.metadata || {};
            if (quiz.sourceFileId) {
                await File.delete(quiz.sourceFileId, Number(userId));
            }
            if (Array.isArray(meta.sourceFiles)) {
                for (const fileMeta of meta.sourceFiles) {
                    if (fileMeta.id && fileMeta.id !== quiz.sourceFileId) {
                        await File.delete(fileMeta.id, Number(userId));
                    }
                }
            }
            if (Array.isArray(meta.sourceFiles)) {
                for (const fileMeta of meta.sourceFiles) {
                    if (fileMeta.id && fileMeta.id !== quiz.sourceFileId) {
                        await File.delete(fileMeta.id, Number(userId));
                    }
                }
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
        const { files, userId: resolvedUserId, options } = this.normalizeUploadArgs(
            fileBuffer,
            originalFilename,
            userId,
            summaryOptions
        );
        try {
            console.log('Starting createSummaryWithFile with options:', options);

            const prepared = await this.prepareFilesForGeneration(files, resolvedUserId);
            const {
                uploadedFiles,
                combinedText,
                pages,
                pageCount,
                totalTextLength
            } = prepared;

            const {
                customInstructions = '',
                focusAreas = [],
                selectedPages = []
            } = options;

            const contentToUse = this.getContentFromSelection(combinedText, selectedPages);

            const generatedSummary = await generateAIPoweredSummary(contentToUse, {
                customInstructions,
                focusAreas
            });

            const summaryData = {
                userId: resolvedUserId,
                title: generatedSummary.title,
                description: generatedSummary.description,
                questions: [], // Empty for summaries
                sourceFileId: uploadedFiles[0]?.id || null,
                sourceFileName: uploadedFiles[0]?.originalName || null,
                sourceFileType: uploadedFiles[0]?.format || null,
                sourceFileSize: uploadedFiles[0]?.bytes || null,
                textLength: totalTextLength,
                difficulty: 'medium', // Default for summaries
                generatedWithAi: true,
                processingTime: new Date(),
                metadata: {
                    generatedWithAI: true,
                    textLength: totalTextLength,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: uploadedFiles[0]?.cloudinaryPublicId || null,
                    cloudinaryUrl: uploadedFiles[0]?.url || null,
                    options: options,
                    type: 'summary', // Mark as summary type
                    summaryContent: generatedSummary,
                    pages,
                    pageCount,
                    sourceFiles: uploadedFiles
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
                file: uploadedFiles[0] || null,
                metadata: {
                    generatedWithAI: true,
                    textLength: totalTextLength,
                    processingTime: new Date().toISOString(),
                    fileUploaded: true,
                    cloudinaryUrl: uploadedFiles[0]?.url || null,
                    pages: pages,
                    pageCount: pageCount,
                    sourceFiles: uploadedFiles,
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
        const { files, userId: resolvedUserId, options: normalizedOptions } = this.normalizeUploadArgs(
            fileBuffer,
            originalFilename,
            userId,
            options
        );
        try {
            const prepared = await this.prepareFilesForGeneration(files, resolvedUserId);
            const {
                uploadedFiles,
                combinedText,
                pages,
                pageCount,
                totalTextLength
            } = prepared;

            const { customInstructions = '', selectedPages = [] } = normalizedOptions;
            const contentToUse = this.getContentFromSelection(combinedText, selectedPages);

            // Generate flashcards
            const generated = await generateAIPoweredFlashcards(contentToUse, { customInstructions });

            // Persist in quizzes table with metadata.type='flashcards'
            const quizData = {
                userId: resolvedUserId,
                title: generated.title || 'Flashcards',
                description: 'Flashcards generated from uploaded content',
                questions: [], // none
                sourceFileId: uploadedFiles[0]?.id || null,
                sourceFileName: uploadedFiles[0]?.originalName || null,
                sourceFileType: uploadedFiles[0]?.format || null,
                sourceFileSize: uploadedFiles[0]?.bytes || null,
                textLength: totalTextLength,
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
                    textLength: totalTextLength,
                    processingTime: new Date().toISOString(),
                    cloudinaryPublicId: uploadedFiles[0]?.cloudinaryPublicId || null,
                    cloudinaryUrl: uploadedFiles[0]?.url || null,
                    options: normalizedOptions,
                    pages,
                    pageCount,
                    sourceFiles: uploadedFiles
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
