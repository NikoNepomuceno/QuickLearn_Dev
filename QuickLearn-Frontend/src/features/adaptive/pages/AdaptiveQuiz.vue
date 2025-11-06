<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdaptiveSessionStore } from '../store/adaptiveSession.store'
import ProgressHeader from '../components/ProgressHeader.vue'
import AdaptiveQuestionCard from '../components/AdaptiveQuestionCard.vue'
import ReviewSuggestionModal from '../components/ReviewSuggestionModal.vue'
import Sidebar from '../../../components/Sidebar.vue'
import { Pause, Flag } from 'lucide-vue-next'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const route = useRoute()
const router = useRouter()
const store = useAdaptiveSessionStore()

const showReviewModal = ref(false)
const showTopicsPanel = ref(false)

const isSubmitting = computed(() => store.isLoading)

onMounted(async () => {
  const sessionId = route.params.sessionId
  
  if (!sessionId) {
    window.$toast?.error('No session ID provided')
    router.push('/upload')
    return
  }

  // Try to resume the session
  try {
    await store.resumeSession(sessionId)
    
    // If no pending question, try to load next
    if (!store.currentQuestion) {
      await store.loadNext()
    }
  } catch (error) {
    console.error('Failed to resume session:', error)
    window.$toast?.error('Session not found or expired')
    router.push('/upload')
  }
})

// Watch for review suggestion
watch(() => store.canShowReviewSuggestion, (canShow) => {
  if (canShow) {
    showReviewModal.value = true
    store.markReviewSuggestionShown()
  }
})

// Show SweetAlert2 feedback popup for 3 seconds
watch(() => store.showFeedback, async (show) => {
  if (!show) return
  const isCorrect = !!store.feedbackData?.correct
  const title = isCorrect ? 'Correct!' : 'Incorrect'
  const icon = isCorrect ? 'success' : 'error'
  const text = store.feedbackData?.explanation || (isCorrect ? 'Nice work!' : 'Keep practicing!')
  try {
    await Swal.fire({
      title,
      text,
      icon,
      iconColor: isCorrect ? '#16a34a' : '#ef4444',
      color: '#111827',
      background: '#ffffff',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      backdrop: true,
      position: 'center',
      didOpen: () => {
        const titleEl = Swal.getTitle()
        if (titleEl) {
          titleEl.style.opacity = '1'
          titleEl.style.fontWeight = '800'
          titleEl.style.color = isCorrect ? '#16a34a' : '#ef4444'
        }
      }
    })
  } finally {
    store.dismissFeedback()
  }
})

// Check if session is completed
watch(() => store.isCompleted, (completed) => {
  if (completed) {
    // Navigate to summary after a short delay
    setTimeout(() => {
      router.push(`/adaptive/${store.sessionId}/summary`)
    }, 1500)
  }
})

async function handleSubmitAnswer(answer) {
  if (!store.currentQuestion) return
  
  try {
    await store.submitAnswer(store.currentQuestion.id, answer)
    
    // If no next question returned, load it
    if (!store.currentQuestion && !store.isCompleted) {
      setTimeout(async () => {
        try {
          await store.loadNext()
        } catch (error) {
          console.error('Failed to load next question:', error)
        }
      }, 3500) // Wait for feedback to show
    }
  } catch (error) {
    console.error('Failed to submit answer:', error)
    window.$toast?.error('Failed to submit answer. Please try again.')
  }
}

function handlePause() {
  window.$toast?.info('Progress saved. You can resume anytime!')
  router.push('/upload')
}

async function handleFinish() {
  try {
    await store.finishSession()
    router.push(`/adaptive/${store.sessionId}/summary`)
  } catch (error) {
    console.error('Failed to finish session:', error)
    window.$toast?.error('Failed to finish session')
  }
}

function handleLowerCap() {
  const easeTo = store.reviewSuggestion?.suggestions?.easeTo || 'easy'
  store.setPreferences({ difficultyCap: easeTo })
  window.$toast?.success(`Difficulty capped at ${easeTo}`)
}

function handleSeeTopics() {
  showTopicsPanel.value = true
  showReviewModal.value = false
}

function handleContinue() {
  showReviewModal.value = false
  store.clearReviewSuggestion()
}

function handleCloseReviewModal() {
  showReviewModal.value = false
}
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="adaptive-quiz-page">
      <div class="page-header">
        <h1>Adaptive Quiz</h1>
        <div class="header-actions">
          <button class="action-btn pause-btn" @click="handlePause">
            <Pause :size="18" />
            Pause
          </button>
          <button class="action-btn finish-btn" @click="handleFinish">
            <Flag :size="18" />
            Finish
          </button>
        </div>
      </div>

      <div class="quiz-container">
        <ProgressHeader
          :asked="store.stats.asked"
          :correct="store.stats.correct"
          :max-questions="store.maxQuestions"
          :current-difficulty="store.stats.currentDifficulty"
          :wrong-streak="store.stats.wrongStreak"
        />

        <div v-if="store.currentQuestion" class="question-container">
          <AdaptiveQuestionCard
            :question="store.currentQuestion"
            :disabled="isSubmitting"
            @submit="handleSubmitAnswer"
          />
        </div>

        <div v-else-if="store.isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading next question...</p>
        </div>

        <div v-else-if="store.isCompleted" class="completion-state">
          <div class="completion-icon">🎉</div>
          <h2>Quiz Complete!</h2>
          <p>Redirecting to summary...</p>
        </div>

        <div v-else-if="store.error" class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>{{ store.error }}</p>
          <button class="retry-btn" @click="store.loadNext()">
            Retry
          </button>
        </div>

        <!-- Topics Panel (shown when user clicks "See Topics") -->
        <div v-if="showTopicsPanel" class="topics-panel">
          <h3>Topics to Review</h3>
          <ul v-if="store.reviewSuggestion?.suggestions?.topics">
            <li v-for="(topic, idx) in store.reviewSuggestion.suggestions.topics" :key="idx">
              {{ topic }}
            </li>
          </ul>
          <p v-else>Keep practicing! You're doing great.</p>
          <button class="close-topics-btn" @click="showTopicsPanel = false">
            Close
          </button>
        </div>
      </div>

      

      <!-- Review Suggestion Modal -->
      <ReviewSuggestionModal
        :visible="showReviewModal"
        :suggestion="store.reviewSuggestion"
        @close="handleCloseReviewModal"
        @lower-cap="handleLowerCap"
        @see-topics="handleSeeTopics"
        @continue="handleContinue"
      />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.adaptive-quiz-page {
  flex: 1;
  padding: 24px;
  background:
    radial-gradient(1000px 600px at 20% -10%, rgba(102, 126, 234, 0.12), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118, 75, 162, 0.1), transparent 60%);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pause-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.pause-btn:hover {
  background: #e5e7eb;
}

.finish-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.finish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.quiz-container {
  max-width: 800px;
  margin: 0 auto;
}

.question-container {
  margin-bottom: 24px;
}

.loading-state,
.completion-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e6e8ec;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p,
.completion-state p,
.error-state p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.completion-icon,
.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.completion-state h2,
.error-state h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
}

.retry-btn {
  margin-top: 20px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.topics-panel {
  margin-top: 24px;
  padding: 24px;
  background: #f8faff;
  border: 2px solid #667eea;
  border-radius: 12px;
}

.topics-panel h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.topics-panel ul {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.topics-panel li {
  padding: 10px;
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  margin-bottom: 8px;
  color: #374151;
}

.close-topics-btn {
  padding: 10px 20px;
  background: #667eea;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-topics-btn:hover {
  background: #5a67d8;
}

@media (max-width: 1024px) {
  .adaptive-quiz-page {
    padding-bottom: 120px;
  }
}

@media (max-width: 768px) {
  .adaptive-quiz-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
  }

  .action-btn {
    flex: 1;
  }
}

/* Dark mode */
body.dark .page-header h1 {
  color: #e5e7eb;
}

body.dark .pause-btn {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .pause-btn:hover {
  background: #334155;
}

body.dark .loading-state,
body.dark .completion-state,
body.dark .error-state {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .loading-state p,
body.dark .completion-state p,
body.dark .error-state p {
  color: #9ca3af;
}

body.dark .completion-state h2,
body.dark .error-state h2 {
  color: #e5e7eb;
}

body.dark .spinner {
  border-color: #1f2a44;
  border-top-color: #667eea;
}

body.dark .topics-panel {
  background: #1f2a44;
  border-color: #667eea;
}

body.dark .topics-panel h3 {
  color: #e5e7eb;
}

body.dark .topics-panel li {
  background: #0f172a;
  border-color: #334155;
  color: #e5e7eb;
}
</style>

