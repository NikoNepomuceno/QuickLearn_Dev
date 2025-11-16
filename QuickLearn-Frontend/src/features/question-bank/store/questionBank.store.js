import { defineStore } from 'pinia'
import { questionBankApi } from '../services/questionBank.api'

export const useQuestionBankStore = defineStore('questionBank', {
  state: () => ({
    questions: [],
    selectedQuestionIds: new Set(),
    filters: {
      topic: null,
      category: null,
      difficulty: [],
      type: [],
      search: ''
    },
    isLoading: false,
    isExtracting: false,
    isClearing: false,
    error: null,
    stats: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  }),

  getters: {
    /**
     * Get filtered questions based on current filters
     */
    filteredQuestions(state) {
      return state.questions
    },

    /**
     * Get selected questions
     */
    selectedQuestions(state) {
      return state.questions.filter(q => {
        // Check both UUID and ID since selection might use either
        const uuid = q.uuid || q.id
        const id = q.id || q.uuid
        return state.selectedQuestionIds.has(uuid) || state.selectedQuestionIds.has(id)
      })
    },

    /**
     * Get selected questions count
     */
    selectedCount(state) {
      return state.selectedQuestionIds.size
    },

    /**
     * Check if question is selected
     */
    isQuestionSelected: (state) => (questionId) => {
      return state.selectedQuestionIds.has(questionId)
    },

    /**
     * Get unique topics from questions
     */
    availableTopics(state) {
      const topics = new Set()
      state.questions.forEach(q => {
        if (q.topic) topics.add(q.topic)
      })
      return Array.from(topics).sort()
    },

    /**
     * Get unique categories from questions
     */
    availableCategories(state) {
      const categories = new Set()
      state.questions.forEach(q => {
        if (q.category) categories.add(q.category)
      })
      return Array.from(categories).sort()
    }
  },

  actions: {
    /**
     * Fetch questions from the question bank
     * Triggers extraction if no questions exist (on-demand)
     */
    async fetchQuestions(_resetFilters = false) {
      this.isLoading = true
      this.error = null

      try {
        const response = await questionBankApi.getQuestions({
          ...this.filters,
          page: this.pagination.page,
          limit: this.pagination.limit
        })

        this.questions = response.questions || []
        this.pagination = {
          page: response.page || 1,
          limit: response.limit || 20,
          total: response.total || 0,
          totalPages: response.totalPages || 0
        }

        if (response.stats) {
          this.stats = response.stats
        }

        return response
      } catch (error) {
        this.error = error.message
        console.error('Error fetching questions:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Toggle question selection
     */
    toggleQuestionSelection(questionId) {
      if (this.selectedQuestionIds.has(questionId)) {
        this.selectedQuestionIds.delete(questionId)
      } else {
        this.selectedQuestionIds.add(questionId)
      }
    },

    /**
     * Select all visible questions
     */
    selectAll() {
      this.questions.forEach(q => {
        // Prefer UUID over ID for consistency
        this.selectedQuestionIds.add(q.uuid || q.id)
      })
    },

    /**
     * Clear all selections
     */
    clearSelection() {
      this.selectedQuestionIds.clear()
    },

    /**
     * Apply filters and refetch questions
     */
    async applyFilters(newFilters) {
      this.filters = { ...this.filters, ...newFilters }
      this.pagination.page = 1 // Reset to first page
      await this.fetchQuestions()
    },

    /**
     * Set pagination page
     */
    async setPage(page) {
      this.pagination.page = page
      await this.fetchQuestions()
    },

    /**
     * Manually trigger question extraction
     */
    async extractQuestions() {
      this.isExtracting = true
      this.error = null

      try {
        const response = await questionBankApi.extractQuestions()
        
        // After extraction, fetch questions
        await this.fetchQuestions()
        
        return response
      } catch (error) {
        this.error = error.message
        console.error('Error extracting questions:', error)
        throw error
      } finally {
        this.isExtracting = false
      }
    },

    /**
     * Create custom quiz from selected questions
     */
    async createCustomQuiz(quizData) {
      this.isLoading = true
      this.error = null

      try {
        // Use questionIds from quizData if provided (respects order from builder),
        // otherwise fall back to selectedQuestionIds
        const questionIds = quizData.questionIds && quizData.questionIds.length > 0
          ? quizData.questionIds
          : Array.from(this.selectedQuestionIds)
        
        const response = await questionBankApi.createCustomQuiz({
          ...quizData,
          questionIds
        })

        // Clear selection after successful creation
        this.clearSelection()

        return response
      } catch (error) {
        this.error = error.message
        console.error('Error creating custom quiz:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Get statistics
     */
    async fetchStats() {
      try {
        const response = await questionBankApi.getStats()
        this.stats = response.stats
        return response
      } catch (error) {
        console.error('Error fetching stats:', error)
        throw error
      }
    },

    /**
     * Clear all questions from the question bank
     */
    async clearAllQuestions() {
      this.isClearing = true
      this.error = null

      try {
        const response = await questionBankApi.clearAllQuestions()
        
        // Reset store state after successful clearing
        this.questions = []
        this.selectedQuestionIds.clear()
        this.pagination = {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
        this.stats = null

        return response
      } catch (error) {
        this.error = error.message
        console.error('Error clearing question bank:', error)
        throw error
      } finally {
        this.isClearing = false
      }
    },

    /**
     * Reset store state
     */
    reset() {
      this.questions = []
      this.selectedQuestionIds.clear()
      this.filters = {
        topic: null,
        category: null,
        difficulty: [],
        type: [],
        search: ''
      }
      this.isLoading = false
      this.isExtracting = false
      this.isClearing = false
      this.error = null
      this.stats = null
      this.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    }
  }
})

