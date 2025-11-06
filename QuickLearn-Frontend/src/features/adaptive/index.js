/**
 * Adaptive quiz feature module
 * 
 * This module provides a self-contained adaptive quiz system with:
 * - Session-based quiz flow
 * - Dynamic difficulty adjustment
 * - Review suggestions after wrong streaks
 * - Progress tracking and resumption
 */

// Export routes
export { adaptiveRoutes } from './routes'

// Export store
export { useAdaptiveSessionStore } from './store/adaptiveSession.store'

// Export API service
export { adaptiveApi } from './services/adaptive.api'

// Export components (if needed elsewhere)
export { default as ProgressHeader } from './components/ProgressHeader.vue'
export { default as AdaptiveQuestionCard } from './components/AdaptiveQuestionCard.vue'
export { default as FeedbackBanner } from './components/FeedbackBanner.vue'
export { default as ReviewSuggestionModal } from './components/ReviewSuggestionModal.vue'

