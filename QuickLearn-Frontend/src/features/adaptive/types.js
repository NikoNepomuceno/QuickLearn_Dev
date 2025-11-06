/**
 * @typedef {Object} AdaptiveQuestion
 * @property {string} id - Question UUID
 * @property {'multiple_choice' | 'true_false' | 'identification' | 'enumeration'} type - Question type
 * @property {string} stem - Question text
 * @property {Array<{id: string, text: string}>} [choices] - Answer choices (for multiple_choice, true_false)
 * @property {'easy' | 'medium' | 'hard'} difficulty - Question difficulty
 * @property {string} [topic] - Optional topic/category
 */

/**
 * @typedef {Object} AdaptiveStats
 * @property {number} asked - Number of questions asked
 * @property {number} correct - Number of correct answers
 * @property {number} wrongStreak - Current consecutive wrong answers
 * @property {'easy' | 'medium' | 'hard'} currentDifficulty - Current difficulty level
 */

/**
 * @typedef {Object} ReviewSuggestion
 * @property {'wrong_streak'} trigger - Why the suggestion was triggered
 * @property {number} streak - Current wrong streak count
 * @property {Object} [suggestions] - Optional suggestions
 * @property {string[]} [suggestions.topics] - Topics to review
 * @property {'easy' | 'medium'} [suggestions.easeTo] - Suggested difficulty cap
 */

/**
 * @typedef {Object} AdaptiveAnswer
 * @property {string} questionId - Question being answered
 * @property {string[] | string} answer - User's answer (choice IDs or text)
 */

/**
 * @typedef {Object} AnswerResponse
 * @property {boolean} correct - Whether the answer was correct
 * @property {string} [explanation] - Explanation of the answer
 * @property {AdaptiveStats} updatedStats - Updated session stats
 * @property {ReviewSuggestion} [reviewSuggestion] - Review suggestion if triggered
 * @property {AdaptiveQuestion} [nextQuestion] - Next question if available
 */

/**
 * @typedef {Object} AdaptiveSessionSnapshot
 * @property {string} sessionId - Session UUID
 * @property {'active' | 'completed' | 'abandoned'} status - Session status
 * @property {AdaptiveStats} stats - Current stats
 * @property {AdaptiveQuestion} [pendingQuestion] - Current/pending question
 * @property {number} [maxQuestions] - Maximum questions for this session
 * @property {Date} createdAt - Session creation timestamp
 */

/**
 * @typedef {Object} AdaptiveSessionSummary
 * @property {number} asked - Total questions asked
 * @property {number} correct - Total correct answers
 * @property {number} wrongStreakMax - Maximum wrong streak during session
 * @property {Array<{questionNumber: number, difficulty: string}>} trajectory - Difficulty progression
 * @property {Date} finishedAt - Session completion timestamp
 * @property {number} durationMs - Session duration in milliseconds
 */

export {}

