/**
 * SpeechService - Handles Text-to-Speech and Speech Recognition
 * Provides clean API for voice interactions in quiz
 */

class SpeechService {
  constructor() {
    this.synthesis = window.speechSynthesis
    this.recognition = null
    this.isSupported = this.checkSupport()
    this.currentUtterance = null
    this.isListening = false
    this.isSpeaking = false
  }

  checkSupport() {
    return !!(this.synthesis && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
  }

  /**
   * Speak text with options
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   * @returns {Promise} - Resolves when speech completes
   */
  async speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech synthesis not supported'))
        return
      }

      // Cancel any current speech
      this.synthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Set voice options
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1
      utterance.lang = options.lang || 'en-US'

      // Try to use a pleasant voice
      const voices = this.synthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Google') || voice.name.includes('Microsoft'))
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.onend = () => {
        this.isSpeaking = false
        resolve()
      }

      utterance.onerror = (event) => {
        this.isSpeaking = false
        reject(new Error(`Speech error: ${event.error}`))
      }

      this.currentUtterance = utterance
      this.isSpeaking = true
      this.synthesis.speak(utterance)
    })
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (this.isSpeaking) {
      this.synthesis.cancel()
      this.isSpeaking = false
    }
  }

  /**
   * Start listening for speech input
   * @param {Object} options - Recognition options
   * @returns {Promise} - Resolves with transcript
   */
  async startListening(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech recognition not supported'))
        return
      }

      // Set up timeout
      const timeout = options.timeout || 10000 // 10 seconds default
      const timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.recognition.stop()
          reject(new Error('Speech recognition timeout'))
        }
      }, timeout)

      // Initialize recognition if needed
      if (!this.recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        this.recognition = new SpeechRecognition()
        
        // Optimized settings for better responsiveness
        this.recognition.continuous = false
        this.recognition.interimResults = options.interimResults || true // Enable interim results
        this.recognition.lang = options.lang || 'en-US'
        this.recognition.maxAlternatives = 5 // More alternatives for better accuracy
      }

      // Configure recognition
      this.recognition.continuous = options.continuous || false
      this.recognition.interimResults = options.interimResults !== false // Default to true
      this.recognition.lang = options.lang || 'en-US'

      let finalTranscript = ''
      let bestConfidence = 0
      let interimTranscript = ''

      this.recognition.onstart = () => {
        this.isListening = true
        console.log('Speech recognition started')
      }

      this.recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript.trim()
          const confidence = result[0].confidence
          
          if (result.isFinal) {
            final += transcript
            if (confidence > bestConfidence) {
              bestConfidence = confidence
              finalTranscript = transcript
            }
          } else {
            interim += transcript
            interimTranscript = transcript
          }
        }

        // If we have interim results, provide feedback
        if (interim && options.onInterimResult) {
          options.onInterimResult(interimTranscript)
        }

        // If we have final results, resolve
        if (final) {
          clearTimeout(timeoutId)
          this.isListening = false
          
          // Use the best result or the final result
          const bestTranscript = finalTranscript || final
          const finalConfidence = bestConfidence || (event.results[event.results.length - 1][0].confidence)
          
          console.log('Speech recognition result:', { transcript: bestTranscript, confidence: finalConfidence })
          resolve({ transcript: bestTranscript, confidence: finalConfidence })
        }
      }

      this.recognition.onerror = (event) => {
        clearTimeout(timeoutId)
        this.isListening = false
        let errorMessage = 'Speech recognition error'
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.'
            break
          case 'audio-capture':
            errorMessage = 'Microphone not found. Please check your microphone.'
            break
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.'
            break
          case 'network':
            errorMessage = 'Network error. Please check your connection.'
            break
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.'
            break
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.'
            break
          default:
            errorMessage = `Recognition error: ${event.error}`
        }
        
        console.error('Speech recognition error:', event.error, errorMessage)
        reject(new Error(errorMessage))
      }

      this.recognition.onend = () => {
        clearTimeout(timeoutId)
        this.isListening = false
        console.log('Speech recognition ended')
      }

      try {
        this.recognition.start()
      } catch (error) {
        clearTimeout(timeoutId)
        this.isListening = false
        console.error('Failed to start speech recognition:', error)
        reject(new Error('Failed to start speech recognition'))
      }
    })
  }

  /**
   * Stop current listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  /**
   * Stop all speech and listening
   */
  stopAll() {
    this.stopSpeaking()
    this.stopListening()
  }

  /**
   * Get available voices
   * @returns {Array} - Available voices
   */
  getVoices() {
    return this.synthesis.getVoices()
  }

  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  getSpeaking() {
    return this.isSpeaking
  }

  /**
   * Check if currently listening
   * @returns {boolean}
   */
  getListening() {
    return this.isListening
  }

  /**
   * Get support status
   * @returns {boolean}
   */
  getSupported() {
    return this.isSupported
  }

  /**
   * Start listening with confidence threshold and retry logic
   * @param {Object} options - Recognition options
   * @returns {Promise} - Resolves with transcript
   */
  async startListeningWithRetry(options = {}) {
    const maxRetries = options.maxRetries || 3
    const confidenceThreshold = options.confidenceThreshold || 0.6
    let attempts = 0

    while (attempts < maxRetries) {
      try {
        const result = await this.startListening({
          ...options,
          timeout: options.timeout || 8000, // Shorter timeout for retries
          onInterimResult: options.onInterimResult
        })

        // Check confidence threshold
        if (result.confidence >= confidenceThreshold) {
          console.log(`Speech recognized with confidence ${result.confidence}`)
          return result
        } else {
          console.log(`Low confidence (${result.confidence}), retrying...`)
          attempts++
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        }
      } catch (error) {
        attempts++
        if (attempts >= maxRetries) {
          throw error
        }
        console.log(`Recognition attempt ${attempts} failed, retrying...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    throw new Error('Speech recognition failed after maximum retries')
  }
}

// Export singleton instance
export default new SpeechService()
