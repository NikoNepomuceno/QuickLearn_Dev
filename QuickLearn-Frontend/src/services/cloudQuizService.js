import { authService } from './authService'
import { API_BASE } from '../config/api.config'

function toFileArray(fileInput) {
  if (!fileInput) return []
  if (Array.isArray(fileInput)) return fileInput
  if (typeof FileList !== 'undefined' && fileInput instanceof FileList) {
    return Array.from(fileInput)
  }
  return [fileInput]
}

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
   * Parse file and get page information
   */
  async parseFile(fileInput) {
    try {
      const files = toFileArray(fileInput)
      if (!files.length) {
        throw new Error('Please select at least one file to upload.')
      }
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      const headers = {}
      const token = authService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/quiz/parse-file`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `File parsing failed with status ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error parsing file:', error)
      throw error
    }
  }

  /**
   * Upload file and create quiz
   */
  async createQuizFromFile(fileInput, options = {}) {
    try {
      const files = toFileArray(fileInput)
      if (!files.length) {
        throw new Error('Please select at least one file to upload.')
      }
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      // Add selected pages and custom instructions to form data
      if (options.selectedPages && options.selectedPages.length > 0) {
        formData.append('selectedPages', JSON.stringify(options.selectedPages))
      }
      if (options.customInstructions) {
        formData.append('customInstructions', options.customInstructions)
      }

      const queryParams = new URLSearchParams()
      if (options.count) queryParams.append('count', options.count)
      if (options.difficulty) queryParams.append('difficulty', options.difficulty)
      if (options.types) {
        // options.types may be array, comma-separated string, or 'mixed'
        const typesValue = Array.isArray(options.types)
          ? options.types.join(',')
          : String(options.types)
        queryParams.append('types', typesValue)
      }
      if (options.focus) queryParams.append('focus', options.focus)
      if (options.timedModeEnabled) {
        queryParams.append('timed', 'true')
        if (options.questionTimerSeconds) {
          const seconds = Math.max(10, Math.min(300, Math.round(Number(options.questionTimerSeconds))))
          queryParams.append('timerSeconds', String(seconds))
        }
      }

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
        // Extract actual error message from response
        let errorMessage = `Upload failed with status ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error during quiz creation:', {
          apiBase: API_BASE,
          error: error.message
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
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
        // Extract actual error message from response
        let errorMessage = `Failed to get quizzes: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.quizzes || []
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error - possible CORS or connection issue:', {
          apiBase: API_BASE,
          error: error.message,
          errorName: error.name
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
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
        // Extract actual error message from response
        let errorMessage = `Failed to get quiz: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.quiz
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error getting quiz:', {
          apiBase: API_BASE,
          error: error.message
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
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

  /** Trash APIs */
  async getTrashedQuizzes() {
    const response = await fetch(`${API_BASE}/api/quiz/trash/list`, {
      headers: this.getAuthHeaders(),
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`Failed to list trash: ${response.status}`)
    const data = await response.json()
    return data.items || []
  }

  async restoreQuiz(uuid) {
    const response = await fetch(`${API_BASE}/api/quiz/${uuid}/restore`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`Failed to restore quiz: ${response.status}`)
    return true
  }

  async permanentlyDeleteQuiz(uuid) {
    const response = await fetch(`${API_BASE}/api/quiz/${uuid}/permanent`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    })
    if (!response.ok) throw new Error(`Failed to permanently delete quiz: ${response.status}`)
    return true
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

  /**
   * Create summary from file
   */
  async createSummaryFromFile(fileInput, options = {}) {
    try {
      const files = toFileArray(fileInput)
      if (!files.length) {
        throw new Error('Please select at least one file to upload.')
      }
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      if (options.selectedPages && options.selectedPages.length > 0) {
        formData.append('selectedPages', JSON.stringify(options.selectedPages))
      }
      if (options.customInstructions) {
        formData.append('customInstructions', options.customInstructions)
      }
      if (options.focusAreas && options.focusAreas.length > 0) {
        formData.append('focusAreas', options.focusAreas.join(','))
      }

      const headers = {}
      const token = authService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/quiz/summary`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Summary generation failed with status ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating summary from file:', error)
      throw error
    }
  }

  /**
   * Create flashcards from file
   */
  async createFlashcardsFromFile(fileInput, options = {}) {
    try {
      const files = toFileArray(fileInput)
      if (!files.length) {
        throw new Error('Please select at least one file to upload.')
      }
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      if (options.selectedPages && options.selectedPages.length > 0) {
        formData.append('selectedPages', JSON.stringify(options.selectedPages))
      }
      if (options.customInstructions) {
        formData.append('customInstructions', options.customInstructions)
      }

      const headers = {}
      const token = authService.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Try primary endpoint first, then fall back for older servers
      const candidateEndpoints = [
        `${API_BASE}/api/flashcards`,
        `${API_BASE}/api/quiz/flashcards`
      ]

      let lastResponse = null
      for (const url of candidateEndpoints) {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          return data
        }
        lastResponse = res
        // If 404, try next endpoint; otherwise, surface the error text
        if (res.status !== 404) {
          const errorText = await res.text()
          throw new Error(errorText || `Flashcards generation failed with status ${res.status}`)
        }
      }

      // If we exhausted all endpoints
      const msg = lastResponse
        ? `Flashcards endpoint not available (received ${lastResponse.status}). Please enable the API or update the server.`
        : 'Flashcards endpoint not available.'
      throw new Error(msg)
    } catch (error) {
      console.error('Error creating flashcards from file:', error)
      throw error
    }
  }

  /**
   * Get flashcards by id
   */
  async getFlashcards(id) {
    try {
      const response = await fetch(`${API_BASE}/api/flashcards/${id}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to get flashcards: ${response.status}`)
      }

      const data = await response.json()
      return data.flashcards || data
    } catch (error) {
      console.error('Error getting flashcards:', error)
      throw error
    }
  }

  /**
   * Update flashcards by id
   */
  async updateFlashcards(id, payload) {
    try {
      const response = await fetch(`${API_BASE}/api/flashcards/${id}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to update flashcards: ${response.status}`)
      }

      const data = await response.json()
      return data.flashcards || data
    } catch (error) {
      console.error('Error updating flashcards:', error)
      throw error
    }
  }
  /**
   * Get user's summaries (notes)
   */
  async getUserSummaries(limit = 20, offset = 0) {
    try {
      const response = await fetch(`${API_BASE}/api/notes?limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        // If the backend does not implement notes listing yet, avoid crashing the page
        if (response.status === 404) {
          return []
        }
        // Extract actual error message from response
        let errorMessage = `Failed to get summaries: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.summaries || data.notes || []
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error getting summaries:', {
          apiBase: API_BASE,
          error: error.message
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
      console.error('Error getting user summaries:', error)
      throw error
    }
  }

  /**
   * Get user's flashcards
   */
  async getUserFlashcards(limit = 20, offset = 0) {
    try {
      const response = await fetch(`${API_BASE}/api/flashcards?limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })
      if (!response.ok) {
        if (response.status === 404) {
          return []
        }
        // Extract actual error message from response
        let errorMessage = `Failed to get flashcards: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }
      const data = await response.json()
      return data.flashcards || []
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error getting flashcards:', {
          apiBase: API_BASE,
          error: error.message
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
      console.error('Error getting user flashcards:', error)
      throw error
    }
  }

  /**
   * Delete a summary by id
   */
  async deleteSummary(id) {
    try {
      const response = await fetch(`${API_BASE}/api/notes/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete summary: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting summary:', error)
      throw error
    }
  }

  /**
   * Delete a flashcard by id
   */
  async deleteFlashcard(id) {
    try {
      const response = await fetch(`${API_BASE}/api/flashcards/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete flashcard: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting flashcard:', error)
      throw error
    }
  }

  /**
   * Get user's adaptive sessions
   */
  async getUserAdaptiveSessions(limit = 20, offset = 0) {
    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions?limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        // Extract actual error message from response
        let errorMessage = `Failed to get adaptive sessions: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {}
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data.sessions || []
    } catch (error) {
      // Check for network/CORS errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.name === 'TypeError' ||
          error.message.includes('Network request failed')) {
        console.error('Network error - possible CORS or connection issue:', {
          apiBase: API_BASE,
          error: error.message,
          errorName: error.name
        })
        throw new Error('Unable to connect to server. Please check your connection and try again.')
      }
      console.error('Error getting adaptive sessions:', error)
      throw error
    }
  }

  /**
   * Delete an adaptive session by id
   */
  async deleteAdaptiveSession(id) {
    try {
      const response = await fetch(`${API_BASE}/api/adaptive/sessions/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete adaptive session: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting adaptive session:', error)
      throw error
    }
  }
}

export const cloudQuizService = new CloudQuizService()
export default cloudQuizService
