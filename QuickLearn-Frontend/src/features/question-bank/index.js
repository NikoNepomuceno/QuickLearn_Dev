/**
 * Question Bank feature module
 * 
 * This module provides a self-contained question bank system with:
 * - Question extraction and categorization
 * - Question browsing and filtering
 * - Custom quiz building from selected questions
 */

// Export routes
export { questionBankRoutes } from './routes'

// Export store
export { useQuestionBankStore } from './store/questionBank.store'

// Export API service
export { questionBankApi } from './services/questionBank.api'

