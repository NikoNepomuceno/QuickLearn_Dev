import { defineStore } from 'pinia'
import { adaptiveApi } from '../services/adaptive.api'

export const useAdaptiveSessionStore = defineStore('adaptiveSession', {
  state: () => ({
    sessionId: null,
    status: null,
    currentQuestion: null,
    stats: {
      asked: 0,
      correct: 0,
      wrongStreak: 0,
      currentDifficulty: 'medium'
    },
    reviewSuggestion: null,
    reviewSuggestionShownAt: null,
    maxQuestions: 20,
    isLoading: false,
    error: null,
    showFeedback: false,
    feedbackData: null,
    createdAt: null
  }),

  getters: {
    /**
     * Calculate accuracy percentage
     */
    accuracy(state) {
      if (state.stats.asked === 0) return 0
      return Math.round((state.stats.correct / state.stats.asked) * 100)
    },

    /**
     * Calculate progress percentage
     */
    progressPercent(state) {
      if (!state.maxQuestions) return 0
      return Math.round((state.stats.asked / state.maxQuestions) * 100)
    },

    /**
     * Check if review suggestion can be shown
     */
    canShowReviewSuggestion(state) {
      if (!state.reviewSuggestion) return false
      if (state.reviewSuggestionShownAt) return false
      return state.reviewSuggestion.trigger === 'wrong_streak'
    },

    /**
     * Check if session is active
     */
    isActive(state) {
      return state.status === 'active'
    },

    /**
     * Check if session is completed
     */
    isCompleted(state) {
      return state.status === 'completed' || state.stats.asked >= state.maxQuestions
    }
  },

  actions: {
    /**
     * Start a new adaptive session
     */
    async startSession(file, options = {}) {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.createSession(file, options)
        
        this.sessionId = response.sessionId
        this.currentQuestion = response.question
        this.status = 'active'
        this.maxQuestions = options.maxQuestions || 20
        this.createdAt = new Date()
        
        // Store session ID in localStorage for resume
        localStorage.setItem('adaptiveSessionId', this.sessionId)
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Resume an existing session
     */
    async resumeSession(sessionId) {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.getSession(sessionId)
        
        this.sessionId = response.sessionId
        this.status = response.status
        this.stats = response.stats
        this.currentQuestion = response.pendingQuestion
        this.maxQuestions = response.maxQuestions
        this.createdAt = response.createdAt
        
        return response
      } catch (error) {
        this.error = error.message
        // Clear invalid session from localStorage
        localStorage.removeItem('adaptiveSessionId')
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Submit an answer
     */
    async submitAnswer(questionId, answer) {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.submitAnswer(
          this.sessionId,
          questionId,
          answer
        )
        
        // Update stats
        this.stats = response.updatedStats
        
        // Show feedback
        this.feedbackData = {
          correct: response.correct,
          explanation: response.explanation
        }
        this.showFeedback = true
        
        // Check for review suggestion
        if (response.reviewSuggestion && !this.reviewSuggestionShownAt) {
          this.reviewSuggestion = response.reviewSuggestion
        }
        
        // Set next question if provided
        if (response.nextQuestion) {
          this.currentQuestion = response.nextQuestion
        } else {
          this.currentQuestion = null
        }
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Load next question
     */
    async loadNext() {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.getNextQuestion(this.sessionId)
        
        if (response.question) {
          this.currentQuestion = response.question
        } else {
          this.currentQuestion = null
        }
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set session preferences
     */
    async setPreferences(preferences) {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.setPreferences(
          this.sessionId,
          preferences
        )
        
        // If difficulty cap was set, update current difficulty if needed
        if (preferences.difficultyCap) {
          const capLevels = { easy: 0, medium: 1, hard: 2 }
          const currentLevels = { easy: 0, medium: 1, hard: 2 }
          if (currentLevels[this.stats.currentDifficulty] > capLevels[preferences.difficultyCap]) {
            this.stats.currentDifficulty = preferences.difficultyCap
          }
        }
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Finish the session
     */
    async finishSession() {
      this.isLoading = true
      this.error = null

      try {
        const response = await adaptiveApi.finishSession(this.sessionId)
        
        this.status = 'completed'
        
        // Clear from localStorage
        localStorage.removeItem('adaptiveSessionId')
        
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Dismiss feedback banner
     */
    dismissFeedback() {
      this.showFeedback = false
      this.feedbackData = null
    },

    /**
     * Mark review suggestion as shown
     */
    markReviewSuggestionShown() {
      this.reviewSuggestionShownAt = new Date()
    },

    /**
     * Clear review suggestion
     */
    clearReviewSuggestion() {
      this.reviewSuggestion = null
    },

    /**
     * Reset store state
     */
    reset() {
      this.sessionId = null
      this.status = null
      this.currentQuestion = null
      this.stats = {
        asked: 0,
        correct: 0,
        wrongStreak: 0,
        currentDifficulty: 'medium'
      }
      this.reviewSuggestion = null
      this.reviewSuggestionShownAt = null
      this.maxQuestions = 20
      this.isLoading = false
      this.error = null
      this.showFeedback = false
      this.feedbackData = null
      this.createdAt = null
      
      localStorage.removeItem('adaptiveSessionId')
    }
  }
})

