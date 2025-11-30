const { getRedisClient } = require('../config/redis');

const CACHE_PREFIX = 'quiz:questions:';
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Get cache key for a file hash
 */
function getCacheKey(fileHash) {
    return `${CACHE_PREFIX}${fileHash}`;
}

/**
 * Retrieve cached questions for a file
 * @param {string} fileHash - SHA-256 hash of file
 * @returns {Promise<Object|null>} - Cached questions object or null
 */
async function getCachedQuestions(fileHash) {
    try {
        const client = getRedisClient();
        const key = getCacheKey(fileHash);
        const data = await client.get(key);
        
        if (!data) {
            return null;
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error('[QuizCache] Error getting cached questions:', error);
        return null; // Fail gracefully - return null so generation continues
    }
}

/**
 * Store questions in cache
 * @param {string} fileHash - SHA-256 hash of file
 * @param {Array} questions - Array of question objects
 * @returns {Promise<boolean>} - Success status
 */
async function setCachedQuestions(fileHash, questions) {
    try {
        const client = getRedisClient();
        const key = getCacheKey(fileHash);
        const payload = {
            maxQuestions: 50,
            questions: questions,
            cachedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        await client.setex(key, CACHE_TTL_SECONDS, JSON.stringify(payload));
        console.log(`[QuizCache] Cached ${questions.length} questions for file hash: ${fileHash.substring(0, 8)}...`);
        return true;
    } catch (error) {
        console.error('[QuizCache] Error caching questions:', error);
        return false; // Fail gracefully - don't throw
    }
}

/**
 * Filter questions from cache based on user config
 * @param {Array} cachedQuestions - All cached questions
 * @param {Object} config - User configuration
 * @param {number} config.count - Number of questions requested
 * @param {Array<string>} config.questionTypes - Question types to include
 * @param {Array} config.selectedPages - Selected page indices
 * @param {Array} config.pages - Full pages array for page filtering
 * @returns {Array} - Filtered and shuffled questions
 */
function filterQuestionsFromCache(cachedQuestions, config) {
    const {
        count = 20,
        questionTypes = ['multiple_choice'],
        selectedPages = [],
        pages = []
    } = config;

    // Normalize question types (handle 'mixed' sentinel)
    let normalizedTypes = questionTypes;
    const allTypes = ['multiple_choice', 'true_false', 'identification', 'enumeration'];
    if (Array.isArray(questionTypes)) {
        const set = new Set(questionTypes);
        const isMixed = questionTypes.length === 1 && questionTypes[0] === 'mixed';
        const isAllSelected = allTypes.every(t => set.has(t));
        if (isMixed || isAllSelected) {
            normalizedTypes = allTypes;
        }
    }

    // Filter by question type
    let filtered = cachedQuestions.filter(q => {
        const qType = q.type || 'multiple_choice';
        return normalizedTypes.includes(qType);
    });

    // Filter by page range if selectedPages provided
    if (Array.isArray(selectedPages) && selectedPages.length > 0 && pages.length > 0) {
        const selectedIndices = selectedPages
            .map((page, idx) => {
                // If page object has index property
                if (typeof page === 'object' && page.index !== undefined) {
                    return page.index;
                }
                // If it's just an index number
                if (typeof page === 'number') {
                    return page;
                }
                return idx;
            })
            .filter(idx => idx >= 0 && idx < pages.length);

        if (selectedIndices.length > 0) {
            filtered = filtered.filter(q => {
                const qPage = q.page || q.pageIndex || 0;
                return selectedIndices.includes(qPage);
            });
        }
    }

    // Shuffle and take requested count
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Check if cache exists for a file
 * @param {string} fileHash - SHA-256 hash of file
 * @returns {Promise<boolean>}
 */
async function hasCache(fileHash) {
    try {
        const client = getRedisClient();
        const key = getCacheKey(fileHash);
        const exists = await client.exists(key);
        return exists === 1;
    } catch (error) {
        console.error('[QuizCache] Error checking cache existence:', error);
        return false;
    }
}

module.exports = {
    getCachedQuestions,
    setCachedQuestions,
    filterQuestionsFromCache,
    hasCache
};

