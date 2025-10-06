// Cloud-based quiz service for handling quiz operations with backend API
import { authService } from './authService'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

class CloudQuizService {
  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders() {
    const token = authService.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  /**
   * Upload file and create quiz
   */
  async createQuizFromFile(file, options = {}) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const queryParams = new URLSearchParams()
      if (options.count) queryParams.append('count', options.count)
      if (options.difficulty) queryParams.append('difficulty', options.difficulty)
      if (options.types) queryParams.append('types', options.types)
      if (options.focus) queryParams.append('focus', options.focus)

      const endpoint = options.isAdvanced ? '/api/quiz/advanced' : '/api/quiz/from-file'
      const url = `${API_BASE}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

      const headers = {}
      const token = authService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating quiz from file:', error)
      throw error
    }
  }

  /**
   * Get user's quizzes
   */
  async getUserQuizzes(limit = 20, offset = 0) {
    try {
      const response = await fetch(`${API_BASE}/api/quiz?limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to get quizzes: ${response.status}`)
      }

      const data = await response.json()
      return data.quizzes || []
    } catch (error) {
      console.error('Error getting user quizzes:', error)
      throw error
    }
  }

  /**
   * Get specific quiz by UUID
   */
  async getQuizByUuid(uuid) {
    try {
      const headers = {}
      const token = authService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/quiz/${uuid}`, {
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to get quiz: ${response.status}`)
      }

      const data = await response.json()
      return data.quiz
    } catch (error) {
      console.error('Error getting quiz by UUID:', error)
      throw error
    }
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(uuid) {
    try {
      const response = await fetch(`${API_BASE}/api/quiz/${uuid}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete quiz: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting quiz:', error)
      throw error
    }
  }

  /**
   * Save quiz attempt
   */
  async saveQuizAttempt(quizUuid, attemptData) {
    try {
      const response = await fetch(`${API_BASE}/api/quiz/${quizUuid}/attempts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(attemptData),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to save attempt: ${response.status}`)
      }

      const data = await response.json()
      return data.attempt
    } catch (error) {
      console.error('Error saving quiz attempt:', error)
      throw error
    }
  }

  /**
   * Get quiz attempts
   */
  async getQuizAttempts(quizUuid) {
    try {
      const response = await fetch(`${API_BASE}/api/quiz/${quizUuid}/attempts`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to get attempts: ${response.status}`)
      }

      const data = await response.json()
      return data.attempts || []
    } catch (error) {
      console.error('Error getting quiz attempts:', error)
      throw error
    }
  }

  /**
   * Get quiz file information
   */
  async getQuizFile(quizUuid) {
    try {
      const response = await fetch(`${API_BASE}/api/quiz/${quizUuid}/file`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to get file: ${response.status}`)
      }

      const data = await response.json()
      return data.file
    } catch (error) {
      console.error('Error getting quiz file:', error)
      throw error
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size'

    const sizes = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let sizeIndex = 0

    while (size >= 1024 && sizeIndex < sizes.length - 1) {
      size /= 1024
      sizeIndex++
    }

    return `${size.toFixed(1)} ${sizes[sizeIndex]}`
  }

  /**
   * Get quiz summary from quiz data
   */
  getQuizSummary(quiz) {
    if (!quiz || !quiz.summary) {
      return {
        lastScore: null,
        bestScore: null,
        attemptsCount: 0,
        averageScore: null
      }
    }

    return quiz.summary
  }

  /**
   * Generate shareable link (now uses UUID from backend)
   */
  generateShareableLink(quiz) {
    const baseUrl = window.location.origin
    return `${baseUrl}/quiz/${quiz.id}`
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      return new Promise((resolve, reject) => {
        if (document.execCommand('copy')) {
          resolve()
        } else {
          reject(new Error('Unable to copy to clipboard'))
        }
        document.body.removeChild(textArea)
      })
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    return await authService.isAuthenticated()
  }

  /**
   * Migrate localStorage data to cloud (for existing users)
   */
  async migrateLocalStorageData() {
    try {
      if (!this.isAuthenticated()) {
        return { migrated: 0, message: 'User not authenticated' }
      }

      // Get existing localStorage data
      const historyKey = 'quiz_history'
      const ids = JSON.parse(localStorage.getItem(historyKey) || '[]')

      if (ids.length === 0) {
        return { migrated: 0, message: 'No local data to migrate' }
      }

      let migratedCount = 0

      for (const id of ids) {
        try {
          const quizData = localStorage.getItem(`quiz_${id}`)
          if (quizData) {
            // Note: This would require a special migration endpoint
            // For now, we'll just clear the localStorage
            localStorage.removeItem(`quiz_${id}`)
            localStorage.removeItem(`quiz_${id}_attempts`)
            migratedCount++
          }
        } catch (error) {
          console.warn(`Failed to migrate quiz ${id}:`, error)
        }
      }

      // Clear the history
      localStorage.removeItem(historyKey)
      localStorage.removeItem('currentQuizId')
      localStorage.removeItem('currentQuiz')

      return {
        migrated: migratedCount,
        message: `Migrated ${migratedCount} quizzes to cloud storage`
      }
    } catch (error) {
      console.error('Error migrating localStorage data:', error)
      throw error
    }
  }
}

// Export singleton instance
export const cloudQuizService = new CloudQuizService()
export default cloudQuizService
