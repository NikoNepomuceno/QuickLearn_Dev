<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdaptiveSessionStore } from '../store/adaptiveSession.store'
import ProgressHeader from '../components/ProgressHeader.vue'
import AdaptiveQuestionCard from '../components/AdaptiveQuestionCard.vue'
import ReviewSuggestionModal from '../components/ReviewSuggestionModal.vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'
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
let isActive = true
onUnmounted(() => {
  isActive = false
  try { Swal.close() } catch {}
})

watch(() => store.showFeedback, async (show) => {
  if (!show) return
  if (!isActive) return
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
    if (!isActive) return
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
  <AppShell
    title="Adaptive quiz"
    subtitle="Answer questions tailored to your performance and keep building momentum."
    content-width="narrow"
  >
    <template #header-actions>
      <div class="page-toolbar">
        <BaseButton variant="ghost" size="sm" @click="handlePause">
          <Pause :size="16" />
          Pause
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="handleFinish">
          <Flag :size="16" />
          Finish
        </BaseButton>
      </div>
    </template>

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
        <BeatLoader :loading="true" text="Loading next question..." color="#667eea" size="18px" />
      </div>

      <div v-else-if="store.isCompleted" class="completion-state">
        <div class="completion-icon" aria-hidden="true">🎉</div>
        <h2>Quiz complete!</h2>
        <p>Redirecting to summary…</p>
      </div>

      <div v-else-if="store.error" class="error-state">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <h2>Something went wrong</h2>
        <p>{{ store.error }}</p>
        <BaseButton variant="primary" size="sm" @click="store.loadNext()">
          Retry
        </BaseButton>
      </div>

      <section v-if="showTopicsPanel" class="topics-panel" aria-live="polite">
        <h3>Topics to review</h3>
        <ul v-if="store.reviewSuggestion?.suggestions?.topics?.length">
          <li v-for="(topic, idx) in store.reviewSuggestion.suggestions.topics" :key="idx">
            {{ topic }}
          </li>
        </ul>
        <p v-else>Keep practicing! You're doing great.</p>
        <BaseButton variant="ghost" size="sm" @click="showTopicsPanel = false">
          Close
        </BaseButton>
      </section>
    </div>

    <ReviewSuggestionModal
      :visible="showReviewModal"
      :suggestion="store.reviewSuggestion"
      @close="handleCloseReviewModal"
      @lower-cap="handleLowerCap"
      @see-topics="handleSeeTopics"
      @continue="handleContinue"
    />
  </AppShell>
</template>

<style scoped>
.page-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.quiz-container {
  display: grid;
  gap: var(--space-5);
}

.question-container {
  display: grid;
  gap: var(--space-4);
}

.loading-state,
.completion-state,
.error-state {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
}

.loading-state p,
.completion-state p,
.error-state p {
  color: var(--color-text-muted);
  margin: 0;
}

.completion-icon,
.error-icon {
  font-size: 2.5rem;
  color: var(--color-text);
}

.completion-state h2,
.error-state h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0 0 var(--space-2);
}

.topics-panel {
  margin-top: var(--space-5);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  display: grid;
  gap: var(--space-3);
}

.topics-panel h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.topics-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-2);
}

.topics-panel li {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 768px) {
  .page-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

body.dark .loading-state,
body.dark .completion-state,
body.dark .error-state {
  background: var(--color-surface);
  border-color: var(--color-border);
}

body.dark .topics-panel {
  background: rgba(15, 23, 42, 0.9);
  border-color: #1f2a44;
}

body.dark .topics-panel li {
  background: var(--color-surface);
  border-color: #1f2a44;
}
</style>

