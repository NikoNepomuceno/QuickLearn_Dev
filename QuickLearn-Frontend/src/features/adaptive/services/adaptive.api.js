import { authService } from '../../../services/authService'
import { adaptiveMock } from './adaptive.mock'
import { API_BASE } from '../../../config/api.config'

const USE_MOCK = import.meta.env.VITE_MOCK_ADAPTIVE === 'true'

function toFileArray(fileInput) {
  if (!fileInput) return []
  if (Array.isArray(fileInput)) return fileInput
  if (typeof FileList !== 'undefined' && fileInput instanceof FileList) {
    return Array.from(fileInput)
  }
  return [fileInput]
}

/**
 * Get authorization headers
 */
function getAuthHeaders() {
  const token = authService.getToken()
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

/**
 * Adaptive quiz API service
 */
export const adaptiveApi = {
  /**
   * Create a new adaptive session
   * @param {File} file - The file to generate quiz from
   * @param {Object} options - Session options
   * @returns {Promise<{sessionId: string, question: Object}>}
   */
  async createSession(fileInput, options = {}) {
    if (USE_MOCK) {
      return adaptiveMock.createSession(fileInput, options)
    }

    try {
      const files = toFileArray(fileInput)
      if (!files.length) {
        throw new Error('Please select at least one file to start an adaptive session.')
      }
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      if (options.selectedPages && options.selectedPages.length > 0) {
        formData.append('selectedPages', JSON.stringify(options.selectedPages))
      }
      if (options.customInstructions) {
        formData.append('customInstructions', options.customInstructions)
      }
      if (options.maxQuestions) {
        formData.append('maxQuestions', options.maxQuestions)
      }

      const response = await fetch(`${API_BASE}/api/adaptive/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to create session: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating adaptive session:', error)
      throw error
    }
  },

  /**
   * Get session snapshot
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>}
   */
  async getSession(sessionId) {
    if (USE_MOCK) {
      return adaptiveMock.getSession(sessionId)
    }

    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${sessionId}`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found')
        }
        throw new Error(`Failed to get session: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting adaptive session:', error)
      throw error
    }
  },

  /**
   * Submit an answer
   * @param {string} sessionId - Session UUID
   * @param {string} questionId - Question UUID
   * @param {string[]|string} answer - User's answer
   * @returns {Promise<Object>}
   */
  async submitAnswer(sessionId, questionId, answer) {
    if (USE_MOCK) {
      return adaptiveMock.submitAnswer(sessionId, questionId, answer)
    }

    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${sessionId}/answers`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionId, answer }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Failed to submit answer: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting answer:', error)
      throw error
    }
  },

  /**
   * Get next question
   * @param {string} sessionId - Session UUID
   * @returns {Promise<{question: Object}>}
   */
  async getNextQuestion(sessionId) {
    if (USE_MOCK) {
      return adaptiveMock.getNextQuestion(sessionId)
    }

    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${sessionId}/next`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to get next question: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting next question:', error)
      throw error
    }
  },

  /**
   * Set session preferences
   * @param {string} sessionId - Session UUID
   * @param {Object} preferences - Preferences to set
   * @returns {Promise<{preferences: Object}>}
   */
  async setPreferences(sessionId, preferences) {
    if (USE_MOCK) {
      return adaptiveMock.setPreferences(sessionId, preferences)
    }

    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${sessionId}/preferences`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to set preferences: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error setting preferences:', error)
      throw error
    }
  },

  /**
   * Finish session
   * @param {string} sessionId - Session UUID
   * @returns {Promise<{summary: Object}>}
   */
  async finishSession(sessionId) {
    if (USE_MOCK) {
      return adaptiveMock.finishSession(sessionId)
    }

    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${sessionId}/finish`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to finish session: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error finishing session:', error)
      throw error
    }
  }
}

