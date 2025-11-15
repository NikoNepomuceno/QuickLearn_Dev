import { authService } from '../../../services/authService'
import { questionBankMock } from './questionBank.mock'
import { API_BASE } from '../../../config/api.config'

const USE_MOCK = import.meta.env.VITE_MOCK_QUESTION_BANK === 'true'

/**
 * Get authorization headers
 */
function getAuthHeaders() {
  const token = authService.getToken()
  return {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'Content-Type': 'application/json'
  }
}

/**
 * Question Bank API service
 */
export const questionBankApi = {
  /**
   * Get user's questions from the question bank
   * @param {Object} filters - Filter options
   * @returns {Promise<{questions: Array, total: number, stats: Object}>}
   */
  async getQuestions(filters = {}) {
    if (USE_MOCK) {
      return questionBankMock.getQuestions(filters)
    }

    try {
      const params = new URLSearchParams()
      
      if (filters.topic) params.append('topic', filters.topic)
      if (filters.category) params.append('category', filters.category)
      if (filters.difficulty) {
        if (Array.isArray(filters.difficulty)) {
          filters.difficulty.forEach(d => params.append('difficulty', d))
        } else {
          params.append('difficulty', filters.difficulty)
        }
      }
      if (filters.type) {
        if (Array.isArray(filters.type)) {
          filters.type.forEach(t => params.append('type', t))
        } else {
          params.append('type', filters.type)
        }
      }
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)

      const response = await fetch(`${API_BASE}/api/question-bank?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to get questions: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting questions:', error)
      throw error
    }
  },

  /**
   * Manually trigger extraction from all quizzes
   * @returns {Promise<{extracted: number, message: string}>}
   */
  async extractQuestions() {
    if (USE_MOCK) {
      return questionBankMock.extractQuestions()
    }

    try {
      const response = await fetch(`${API_BASE}/api/question-bank/extract`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to extract questions: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error extracting questions:', error)
      throw error
    }
  },

  /**
   * Create custom quiz from selected questions
   * @param {Object} quizData - Quiz data
   * @returns {Promise<{quiz: Object}>}
   */
  async createCustomQuiz(quizData) {
    if (USE_MOCK) {
      return questionBankMock.createCustomQuiz(quizData)
    }

    try {
      const response = await fetch(`${API_BASE}/api/question-bank/custom-quiz`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(quizData),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to create custom quiz: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating custom quiz:', error)
      throw error
    }
  },

  /**
   * Get question bank statistics
   * @returns {Promise<{stats: Object}>}
   */
  async getStats() {
    if (USE_MOCK) {
      return questionBankMock.getStats()
    }

    try {
      const response = await fetch(`${API_BASE}/api/question-bank/stats`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting stats:', error)
      throw error
    }
  }
}

