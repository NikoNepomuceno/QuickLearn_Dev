const { parseUploadedFile } = require('../utils/parseFile');
const { generateAIPoweredQuiz } = require('./quizService');
const { setCachedQuestions } = require('./quizCacheService');
const { computeFileHash, computeMultiFileHash } = require('../utils/fileHash');

/**
 * Generate full 50-question set in background and cache it
 * This runs asynchronously after user gets their immediate quiz
 * @param {Array} files - Array of file objects with buffer
 * @param {string} fileHash - Pre-computed file hash
 */
async function generateFullQuizSetInBackground(files, fileHash) {
    try {
        console.log(`[Background] Starting full quiz generation for hash: ${fileHash.substring(0, 8)}...`);
        
        // Parse all files to get full text
        const allPages = [];
        let fullText = '';
        
        for (const file of files) {
            const parseResult = await parseUploadedFile({
                originalname: file.originalname || 'document',
                mimetype: file.mimetype,
                buffer: file.buffer
            });
            
            const pages = parseResult.pages || [parseResult.text];
            allPages.push(...pages);
            fullText += `\n\n### Source: ${file.originalname || 'document'}\n\n${parseResult.text}`;
        }
        
        // Generate full 50-question set with all types
        const allQuestionTypes = ['multiple_choice', 'true_false', 'identification', 'enumeration'];
        
        const fullQuiz = await generateAIPoweredQuiz(fullText.trim(), {
            numQuestions: 50,
            difficulty: 'medium',
            questionTypes: allQuestionTypes,
            focusAreas: []
        });
        
        // Add page metadata to questions if available
        const questionsWithPages = (fullQuiz.questions || []).map((q, idx) => {
            // Try to infer page from question content or distribute evenly
            const pageIndex = allPages.length > 0 
                ? Math.floor((idx / fullQuiz.questions.length) * allPages.length)
                : 0;
            
            return {
                ...q,
                page: pageIndex,
                pageIndex: pageIndex
            };
        });
        
        // Cache the full set
        await setCachedQuestions(fileHash, questionsWithPages);
        
        console.log(`[Background] Successfully cached ${questionsWithPages.length} questions for hash: ${fileHash.substring(0, 8)}...`);
        
    } catch (error) {
        console.error('[Background] Error generating full quiz set:', error);
        // Don't throw - this is background, fail silently
    }
}

/**
 * Helper to compute file hash from file(s)
 */
function computeHashFromFiles(files) {
    if (Array.isArray(files) && files.length > 1) {
        const buffers = files.map(f => f.buffer || Buffer.from([]));
        return computeMultiFileHash(buffers);
    } else {
        const file = Array.isArray(files) ? files[0] : files;
        return computeFileHash(file.buffer);
    }
}

module.exports = {
    generateFullQuizSetInBackground,
    computeHashFromFiles
};

