<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import cloudQuizService from '../services/cloudQuizService'
import { copyToClipboard, generateResultsShareLink, downloadResultsAsPDF } from '../services/quizService'
import { Target, Clock, CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const quiz = ref(null)
const lastAttempt = ref(null)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isLoading = ref(true)
const error = ref(null)

// Responsive score circle dimensions
const scoreCircleSize = computed(() => {
  if (windowWidth.value <= 480) return { size: 120, radius: 50, center: 60, circumference: 314.16 }
  if (windowWidth.value <= 768) return { size: 140, radius: 60, center: 70, circumference: 376.99 }
  return { size: 160, radius: 70, center: 80, circumference: 439.82 }
})

// Handle window resize
function handleResize() {
  windowWidth.value = window.innerWidth
}

onMounted(async () => {
  const { quizId } = route.params
  if (!quizId) {
    router.replace('/upload')
    return
  }

  try {
    isLoading.value = true
    error.value = null

    // Get quiz data from cloud service
    const data = await cloudQuizService.getQuizByUuid(quizId)
    quiz.value = data

    // Get quiz attempts from cloud service
    const attempts = await cloudQuizService.getQuizAttempts(quizId)
    lastAttempt.value = attempts && attempts.length ? attempts[0] : null

    if (!quiz.value) {
      router.replace('/upload')
    }
  } catch (err) {
    console.error('Error loading quiz results:', err)
    error.value = err.message || 'Failed to load quiz results'
    window.$toast?.error(error.value)
    router.replace('/upload')
  } finally {
    isLoading.value = false
  }

  // Add resize listener
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})

function retake() {
  router.push({ name: 'quiz', params: { quizId: route.params.quizId } })
}

function backToMyQuizzes() {
  router.push({ name: 'my-quizzes' })
}

// Answer validation function (same as in TakeQuiz.vue)
function isAnswerCorrect(userAnswer, correctAnswer, questionType) {
  if (!userAnswer || !correctAnswer) return false
  
  // Default to identification if type is missing
  const type = questionType || 'identification'

  if (type === 'enumeration') {
    if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) return false

    const normalizedUser = userAnswer
      .map((item) => item.toString().trim().toLowerCase())
      .filter((item) => item)
    const normalizedCorrect = correctAnswer
      .map((item) => item.toString().trim().toLowerCase())
      .filter((item) => item)

    return normalizedCorrect.every((correctItem) => {
      if (normalizedUser.includes(correctItem)) return true

      const itemVariations = {
        javascript: ['js', 'javascript', 'ecmascript'],
        js: ['javascript', 'js', 'ecmascript'],
        html: ['hypertext markup language', 'html'],
        css: ['cascading style sheets', 'css'],
        dom: ['document object model', 'dom'],
        api: ['application programming interface', 'api'],
      }

      if (itemVariations[correctItem]) {
        return itemVariations[correctItem].some((variation) => normalizedUser.includes(variation))
      }

      return false
    })
  } else {
    // For other question types (multiple_choice, true_false, identification)
    let cleanedUserAnswer = userAnswer.toString().trim()
    
    // For identification: remove common prefixes/suffixes (same as voice parser)
    if (type === 'identification') {
      cleanedUserAnswer = cleanedUserAnswer
        .replace(/^(my answer is|the answer is|answer|i think|i believe)\s*/i, '')
        .replace(/\s*(please|thanks|thank you)$/i, '')
        .trim()
    }
    
    const normalizedUser = cleanedUserAnswer.toLowerCase()
    const normalizedCorrect = correctAnswer.toString().trim().toLowerCase()

    // Direct match
    if (normalizedUser === normalizedCorrect) return true

    // Handle common variations
    const variations = {
      dom: ['document object model', 'dom'],
      'document object model': ['dom', 'document object model'],
      javascript: ['js', 'javascript', 'ecmascript'],
      js: ['javascript', 'js', 'ecmascript'],
      ecmascript: ['javascript', 'js', 'ecmascript'],
      html: ['hypertext markup language', 'html'],
      'hypertext markup language': ['html', 'hypertext markup language'],
      css: ['cascading style sheets', 'css'],
      'cascading style sheets': ['css', 'cascading style sheets'],
      api: ['application programming interface', 'api'],
      'application programming interface': ['api', 'application programming interface'],
      url: ['uniform resource locator', 'url'],
      'uniform resource locator': ['url', 'uniform resource locator'],
      http: ['hypertext transfer protocol', 'http'],
      'hypertext transfer protocol': ['http', 'hypertext transfer protocol'],
      https: ['hypertext transfer protocol secure', 'https'],
      'hypertext transfer protocol secure': ['https', 'hypertext transfer protocol secure'],
      json: ['javascript object notation', 'json'],
      'javascript object notation': ['json', 'javascript object notation'],
      xml: ['extensible markup language', 'xml'],
      'extensible markup language': ['xml', 'extensible markup language'],
      sql: ['structured query language', 'sql'],
      'structured query language': ['sql', 'structured query language'],
      true: ['yes', 'correct', 'true', '1'],
      false: ['no', 'incorrect', 'false', '0'],
    }

    // Check if user answer matches any variation of correct answer
    if (variations[normalizedCorrect]) {
      return variations[normalizedCorrect].includes(normalizedUser)
    }

    // Check if correct answer matches any variation of user answer
    if (variations[normalizedUser]) {
      return variations[normalizedUser].includes(normalizedCorrect)
    }

    return false
  }
}

async function shareResults() {
  try {
    const link = generateResultsShareLink(route.params.quizId)
    await copyToClipboard(link)
    window.$toast?.success('Results link copied to clipboard')
  } catch {
    window.$toast?.error('Failed to copy link')
  }
}

function downloadResults() {
  if (quiz.value) {
    downloadResultsAsPDF(quiz.value, lastAttempt.value)
  }
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent!'
  if (score >= 80) return 'Great Job!'
  if (score >= 70) return 'Good Work!'
  if (score >= 60) return 'Not Bad!'
  return 'Keep Trying!'
}
</script>

<template>
  <AppShell
    :title="quiz?.title || 'Quiz results'"
    subtitle="Review your performance and revisit each question."
    content-width="wide"
  >
    <template #header-actions>
      <div class="results-header-actions">
        <BaseButton variant="secondary" size="sm" @click="backToMyQuizzes">
          <ArrowLeft :size="16" />
          Back to My Quizzes
        </BaseButton>
        <BaseButton
          v-if="!isLoading && !error && quiz"
          variant="primary"
          size="sm"
          @click="retake"
        >
          <RotateCcw :size="16" />
          Retake quiz
        </BaseButton>
      </div>
    </template>

    <div v-if="isLoading" class="loading-container">
      <BeatLoader
        :loading="true"
        text="Loading quiz results..."
        color="#667eea"
        size="20px"
      />
    </div>

    <div v-else-if="error" class="error-container">
      <BaseCard padding="lg" class="error-card">
        <p class="error-message">{{ error }}</p>
        <BaseButton variant="primary" size="sm" @click="backToMyQuizzes">
          Back to My Quizzes
        </BaseButton>
      </BaseCard>
    </div>

    <div v-else-if="quiz" class="results-container">
      <div class="results-grid">
        <BaseCard padding="lg" class="score-overview-card">
          <div class="score-section">
            <div class="score-circle">
              <svg class="score-ring" :width="scoreCircleSize.size" :height="scoreCircleSize.size">
                <circle
                  class="score-ring-bg"
                  stroke-width="12"
                  fill="transparent"
                  :r="scoreCircleSize.radius"
                  :cx="scoreCircleSize.center"
                  :cy="scoreCircleSize.center"
                />
                <circle
                  class="score-ring-fill"
                  :stroke="getScoreColor(lastAttempt?.score ?? 0)"
                  stroke-width="12"
                  fill="transparent"
                  :r="scoreCircleSize.radius"
                  :cx="scoreCircleSize.center"
                  :cy="scoreCircleSize.center"
                  :stroke-dasharray="scoreCircleSize.circumference"
                  :stroke-dashoffset="scoreCircleSize.circumference - (scoreCircleSize.circumference * (lastAttempt?.score ?? 0)) / 100"
                />
              </svg>
              <div class="score-content">
                <div class="score-number">{{ lastAttempt?.score ?? '—' }}%</div>
                <div class="score-label">{{ getScoreLabel(lastAttempt?.score ?? 0) }}</div>
              </div>
            </div>

            <div class="score-details">
              <div class="detail-item">
                <div class="detail-icon">
                  <Target :size="20" />
                </div>
                <div class="detail-content">
                  <div class="detail-label">Last Attempt</div>
                  <div class="detail-value">{{ lastAttempt?.takenAt ? new Date(lastAttempt.takenAt).toLocaleString() : 'N/A' }}</div>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">
                  <CheckCircle :size="20" />
                </div>
                <div class="detail-content">
                  <div class="detail-label">Total Points</div>
                  <div class="detail-value">{{ lastAttempt?.pointsEarned ?? 0 }} pts</div>
                </div>
              </div>

              <div class="detail-item" v-if="lastAttempt?.timeSeconds">
                <div class="detail-icon">
                  <Clock :size="20" />
                </div>
                <div class="detail-content">
                  <div class="detail-label">Time Taken</div>
                  <div class="detail-value">{{ Math.floor(lastAttempt.timeSeconds/60) }}m {{ lastAttempt.timeSeconds%60 }}s</div>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard padding="lg" class="actions-card">
          <div class="actions-card__primary">
            <BaseButton variant="outline" size="sm" @click="shareResults">
              Share results
            </BaseButton>
            <BaseButton variant="outline" size="sm" @click="downloadResults">
              Download PDF
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <BaseCard padding="lg" class="questions-card">
        <div class="questions-header">
          <h3>Question Review</h3>
          <p class="questions-subtitle">Detailed breakdown of your performance</p>
        </div>

        <div class="questions-list">
          <div
            class="question-item"
            v-for="(q, i) in quiz?.questions"
            :key="i"
            :class="{
              correct: isAnswerCorrect(lastAttempt?.userAnswers?.[i] ?? null, q.answer, q.type),
              incorrect: !isAnswerCorrect(lastAttempt?.userAnswers?.[i] ?? null, q.answer, q.type)
            }"
          >
            <div class="question-header">
              <div class="question-number">
                <span class="q-num">{{ i + 1 }}</span>
              </div>
              <div class="question-status">
                <div class="status-icon">
                  <CheckCircle v-if="isAnswerCorrect(lastAttempt?.userAnswers?.[i] ?? null, q.answer, q.type)" :size="20" />
                  <XCircle v-else :size="20" />
                </div>
                <span class="status-text">
                  {{ isAnswerCorrect(lastAttempt?.userAnswers?.[i] ?? null, q.answer, q.type) ? 'Correct' : 'Incorrect' }}
                </span>
              </div>
            </div>

            <div class="question-content">
              <div class="question-text">{{ q.question }}</div>

              <div class="answer-section">
                <div class="answer-row your-answer">
                  <div class="answer-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Your answer:
                  </div>
                  <div class="answer-value">{{ lastAttempt?.userAnswers?.[i] ?? 'Not answered' }}</div>
                </div>

                <div class="answer-row correct-answer">
                  <div class="answer-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Correct answer:
                  </div>
                  <div class="answer-value">{{ q.answer }}</div>
                </div>

                <div v-if="q.explanation" class="explanation-row">
                  <div class="explanation-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                    Explanation:
                  </div>
                  <div class="explanation-text">{{ q.explanation }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

  </AppShell>
</template>

<style scoped>
.loading-container,
.error-container {
  display: flex;
  justify-content: center;
}

.error-card {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  text-align: center;
}

.error-message {
  margin: 0;
  color: var(--color-text-muted);
}

.results-container {
  display: grid;
  gap: var(--space-6);
}

.results-grid {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 1100px) {
  .results-grid {
    grid-template-columns: 2fr 1fr;
    align-items: stretch;
  }
}

.score-section {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: center;
}

@media (max-width: 768px) {
  .score-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

.score-circle {
  position: relative;
  flex-shrink: 0;
}

.score-ring {
  transform: rotate(-90deg);
}

.score-ring-bg {
  stroke: var(--color-border);
}

.score-ring-fill {
  transition: stroke-dashoffset 1.2s ease;
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-number {
  margin: 0;
  font-size: clamp(2.25rem, 5vw, 3rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.score-label {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.score-details {
  flex: 1;
  display: grid;
  gap: var(--space-4);
  min-width: min(320px, 100%);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
}

.detail-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detail-label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-value {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.results-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.actions-card {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.actions-card__primary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.questions-card {
  display: grid;
  gap: var(--space-4);
}

.questions-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.questions-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.questions-subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.questions-list {
  display: grid;
  gap: var(--space-4);
}

.question-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  background: var(--color-surface);
  display: grid;
  gap: var(--space-3);
}

.question-item.correct {
  border-color: rgba(16, 185, 129, 0.35);
}

.question-item.incorrect {
  border-color: rgba(239, 68, 68, 0.35);
}

.question-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.question-number {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.question-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.question-content {
  display: grid;
  gap: var(--space-3);
}

.question-text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.answer-section {
  display: grid;
  gap: var(--space-3);
}

.answer-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.answer-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
}

.answer-value {
  color: var(--color-text);
}

.explanation-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.explanation-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.explanation-text {
  margin: 0;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

body.dark .detail-item {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
}

body.dark .question-item {
  border-color: var(--color-border);
  background: var(--color-surface);
}

body.dark .question-item.correct {
  border-color: #10b981;
}

body.dark .question-item.incorrect {
  border-color: #ef4444;
}

body.dark .question-item.correct .question-status {
  color: #10b981;
}

body.dark .question-item.correct .status-icon {
  color: #10b981;
}

body.dark .question-item.incorrect .question-status {
  color: #ef4444;
}

body.dark .question-item.incorrect .status-icon {
  color: #ef4444;
}

body.dark .question-number {
  background: rgba(148, 163, 184, 0.12);
  color: var(--color-text);
}

body.dark .explanation-row {
  background: rgba(102, 126, 234, 0.12);
  border-color: rgba(102, 126, 234, 0.3);
}
</style>


