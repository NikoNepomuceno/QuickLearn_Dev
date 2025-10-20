<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-vue-next'
import speechService from '../services/speechService'
import answerParserService from '../services/answerParserService'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['answer-selected', 'error', 'status-change'])

// State
const isActive = ref(false)
const isListening = ref(false)
const isSpeaking = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const isSupported = ref(false)
const interimTranscript = ref('')
const confidence = ref(0)
const retryCount = ref(0)

// Computed
const buttonIcon = computed(() => {
  if (isListening.value) return Loader2
  if (isSpeaking.value) return Volume2
  return isActive.value ? Mic : MicOff
})

const buttonText = computed(() => {
  if (isListening.value) {
    if (interimTranscript.value) {
      return `Hearing: "${interimTranscript.value}"`
    }
    return 'Listening...'
  }
  if (isSpeaking.value) return 'Speaking...'
  return isActive.value ? 'Voice On' : 'Voice Off'
})

const buttonClass = computed(() => {
  const base = 'voice-button'
  if (hasError.value) return `${base} error`
  if (isActive.value) return `${base} active`
  if (isListening.value) return `${base} listening`
  if (isSpeaking.value) return `${base} speaking`
  return base
})

// Methods
async function toggleVoice() {
  if (!isSupported.value) {
    showError('Voice features not supported in this browser')
    return
  }

  if (isActive.value) {
    await stopVoice()
  } else {
    await startVoice()
  }
}

async function startVoice() {
  try {
    hasError.value = false
    isActive.value = true
    emit('status-change', 'active')
    
    // First, read the question
    await readQuestion()
    
    // Then start listening
    await startListening()
    
  } catch (error) {
    showError(error.message)
  }
}

async function stopVoice() {
  try {
    speechService.stopAll()
    isActive.value = false
    isListening.value = false
    isSpeaking.value = false
    emit('status-change', 'inactive')
  } catch (error) {
    showError(error.message)
  }
}

async function readQuestion() {
  try {
    isSpeaking.value = true
    const speechText = answerParserService.generateQuestionSpeech(props.question, props.questionNumber)
    await speechService.speak(speechText)
    isSpeaking.value = false
  } catch (error) {
    isSpeaking.value = false
    throw error
  }
}

async function startListening() {
  try {
    isListening.value = true
    interimTranscript.value = ''
    confidence.value = 0
    
    const result = await speechService.startListeningWithRetry({
      continuous: false,
      interimResults: true,
      lang: 'en-US',
      timeout: 8000,
      maxRetries: 2,
      confidenceThreshold: 0.5,
      onInterimResult: (transcript) => {
        interimTranscript.value = transcript
        console.log('Interim result:', transcript)
      }
    })
    
    isListening.value = false
    interimTranscript.value = ''
    confidence.value = result.confidence
    
    console.log('Final result:', result)
    
    // Parse the answer
    const parsedAnswer = answerParserService.parseAnswer(result.transcript, props.question)
    
    if (parsedAnswer !== null) {
      console.log('Answer parsed successfully:', parsedAnswer)
      // Confirm the answer
      await confirmAnswer(parsedAnswer)
      
      // Emit the answer (parent will handle navigation)
      console.log('Emitting answer-selected event:', parsedAnswer)
      emit('answer-selected', parsedAnswer)
      
      // Stop voice after answer is submitted
      await stopVoice()
      
    } else {
      // Ask to repeat with more specific guidance
      const guidanceText = getGuidanceText(props.question)
      await speechService.speak(`I didn't understand that. ${guidanceText}`)
      retryCount.value++
      
      if (retryCount.value < 3) {
        await startListening()
      } else {
        await speechService.speak("Let's try a different approach. Please use the buttons to answer.")
        retryCount.value = 0
      }
    }
    
  } catch (error) {
    isListening.value = false
    interimTranscript.value = ''
    console.error('Speech recognition error:', error)
    
    if (error.message.includes('no-speech') || error.message.includes('timeout')) {
      await speechService.speak("I didn't hear anything. Please try again.")
      retryCount.value++
      if (retryCount.value < 3) {
        await startListening()
      } else {
        await speechService.speak("Let's try a different approach. Please use the buttons to answer.")
        retryCount.value = 0
      }
    } else {
      throw error
    }
  }
}

function getGuidanceText(question) {
  switch (question.type) {
    case 'multiple_choice':
      return 'Please say the letter of your choice (A, B, C, or D) or the full answer.'
    case 'true_false':
      return 'Please say "true" or "false".'
    case 'identification':
      return 'Please say your answer clearly.'
    case 'enumeration':
      return 'Please list your answers separated by commas.'
    default:
      return 'Please try again.'
  }
}

async function confirmAnswer(answer) {
  try {
    isSpeaking.value = true
    const confirmationText = answerParserService.generateConfirmationSpeech(answer, props.question)
    await speechService.speak(confirmationText)
    isSpeaking.value = false
  } catch (error) {
    isSpeaking.value = false
    // Don't throw here, just log the error
    console.warn('Failed to confirm answer:', error)
  }
}

function showError(message) {
  hasError.value = true
  errorMessage.value = message
  emit('error', message)
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    hasError.value = false
    errorMessage.value = ''
  }, 5000)
}

// Lifecycle
onMounted(() => {
  isSupported.value = speechService.getSupported()
  
  if (!isSupported.value) {
    showError('Voice features not supported in this browser')
  }
})

onUnmounted(() => {
  speechService.stopAll()
})

// Watch for question changes
watch(() => props.question, () => {
  // Reset retry count when question changes
  retryCount.value = 0
  
  if (isActive.value && !isSpeaking.value && !isListening.value) {
    // Auto-read new question when voice is active
    readQuestion().then(() => startListening()).catch(showError)
  }
})

// Watch for enabled prop changes
watch(() => props.isEnabled, (newValue) => {
  if (!newValue && isActive.value) {
    stopVoice()
  }
})
</script>

<template>
  <div class="voice-quiz-container">
    <button
      :class="buttonClass"
      :disabled="!isSupported || hasError"
      @click="toggleVoice"
      :aria-label="buttonText"
      :title="errorMessage || buttonText"
    >
      <component :is="buttonIcon" :size="20" :class="{ 'animate-spin': isListening }" />
      <span class="button-text">{{ buttonText }}</span>
    </button>
    
    <!-- Visual feedback for listening state -->
    <div v-if="isListening" class="listening-feedback">
      <div class="sound-waves">
        <div class="wave"></div>
        <div class="wave"></div>
        <div class="wave"></div>
      </div>
      <div v-if="interimTranscript" class="interim-text">
        "{{ interimTranscript }}"
      </div>
    </div>
    
    <!-- Confidence indicator -->
    <div v-if="confidence > 0 && !isListening" class="confidence-indicator">
      Confidence: {{ Math.round(confidence * 100) }}%
    </div>
    
    <div v-if="hasError" class="error-message" role="alert">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.voice-quiz-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.voice-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  color: #374151;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-width: 140px;
  justify-content: center;
}

.voice-button:hover:not(:disabled) {
  border-color: #667eea;
  background: #f8faff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.voice-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.voice-button.active {
  border-color: #10b981;
  background: #f0fdf4;
  color: #059669;
}

.voice-button.active:hover {
  border-color: #059669;
  background: #dcfce7;
}

.voice-button.listening {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  animation: pulse 2s infinite;
}

.voice-button.speaking {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #d97706;
}

.voice-button.error {
  border-color: #ef4444;
  background: #fef2f2;
  color: #dc2626;
}

.button-text {
  font-size: 13px;
  font-weight: 600;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  max-width: 200px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Dark mode support */
body.dark .voice-button {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

body.dark .voice-button:hover:not(:disabled) {
  border-color: #667eea;
  background: #1f2937;
}

body.dark .voice-button.active {
  border-color: #10b981;
  background: #064e3b;
  color: #6ee7b7;
}

body.dark .voice-button.listening {
  border-color: #3b82f6;
  background: #1e3a8a;
  color: #93c5fd;
}

body.dark .voice-button.speaking {
  border-color: #f59e0b;
  background: #451a03;
  color: #fbbf24;
}

body.dark .voice-button.error {
  border-color: #ef4444;
  background: #7f1d1d;
  color: #fca5a5;
}

body.dark .error-message {
  background: #7f1d1d;
  border-color: #dc2626;
  color: #fca5a5;
}

/* Listening feedback styles */
.listening-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.sound-waves {
  display: flex;
  gap: 3px;
  align-items: center;
}

.wave {
  width: 4px;
  height: 20px;
  background: #3b82f6;
  border-radius: 2px;
  animation: wave 1.5s ease-in-out infinite;
}

.wave:nth-child(2) {
  animation-delay: 0.2s;
}

.wave:nth-child(3) {
  animation-delay: 0.4s;
}

.interim-text {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0369a1;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-style: italic;
  max-width: 200px;
  text-align: center;
}

.confidence-indicator {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-top: 4px;
}

@keyframes wave {
  0%, 100% { height: 20px; }
  50% { height: 8px; }
}

/* Dark mode for new elements */
body.dark .interim-text {
  background: #1e3a8a;
  border-color: #3b82f6;
  color: #93c5fd;
}

body.dark .confidence-indicator {
  background: #064e3b;
  border-color: #10b981;
  color: #6ee7b7;
}

body.dark .wave {
  background: #60a5fa;
}
</style>
