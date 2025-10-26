<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
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
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <div class="header-content">
          <div class="breadcrumb">
            <button @click="backToMyQuizzes" class="breadcrumb-link">
              <ArrowLeft :size="16" />
              My Quizzes
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Results</span>
          </div>
          <h1>Quiz Results</h1>
          <p class="subtitle">{{ quiz?.title }}</p>
        </div>
      </div>

      <div v-if="isLoading" class="loading-container">
        <BeatLoader 
          :loading="true" 
          text="Loading quiz results..." 
          color="#667eea"
          size="20px"
        />
      </div>

      <div v-else-if="error" class="error-container">
        <p class="error-message">{{ error }}</p>
        <button @click="backToMyQuizzes" class="action-btn secondary">
          Back to My Quizzes
        </button>
      </div>

      <div v-else-if="quiz" class="results-container">
        <!-- Score Overview Card -->
        <div class="score-overview-card">
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
        </div>

        <!-- Action Buttons -->
        <div class="actions-card">
          <div class="primary-actions">
            <button class="action-btn primary" @click="retake">
              <RotateCcw :size="20" />
              Retake Quiz
            </button>
            <button class="action-btn secondary" @click="backToMyQuizzes">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
                <path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"/>
              </svg>
              Back to My Quizzes
            </button>
          </div>

          <div class="secondary-actions">
            <button class="action-btn tertiary" @click="shareResults">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share Results
            </button>
            <button class="action-btn tertiary" @click="downloadResults">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        <!-- Questions Review -->
        <div class="questions-card">
          <div class="questions-header">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Question Review
            </h3>
            <p class="questions-subtitle">Detailed breakdown of your performance</p>
          </div>

          <div class="questions-list">
            <div
              class="question-item"
              v-for="(q, i) in quiz?.questions"
              :key="i"
              :class="{
                correct: (lastAttempt?.userAnswers?.[i] ?? null) === q.answer,
                incorrect: (lastAttempt?.userAnswers?.[i] ?? null) !== q.answer
              }"
            >
              <div class="question-header">
                <div class="question-number">
                  <span class="q-num">{{ i + 1 }}</span>
                </div>
                <div class="question-status">
                  <div class="status-icon">
                    <CheckCircle v-if="(lastAttempt?.userAnswers?.[i] ?? null) === q.answer" :size="20" />
                    <XCircle v-else :size="20" />
                  </div>
                  <span class="status-text">
                    {{ (lastAttempt?.userAnswers?.[i] ?? null) === q.answer ? 'Correct' : 'Incorrect' }}
                  </span>
                </div>
              </div>

              <div class="question-content">
                <div class="question-text">{{ q.question }}</div>

                <div class="answer-section">
                  <div class="answer-row your-answer">
                    <div class="answer-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Your Answer:
                    </div>
                    <div class="answer-value">{{ lastAttempt?.userAnswers?.[i] ?? 'Not answered' }}</div>
                  </div>

                  <div class="answer-row correct-answer">
                    <div class="answer-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                      Correct Answer:
                    </div>
                    <div class="answer-value">{{ q.answer }}</div>
                  </div>

                  <div v-if="q.explanation" class="explanation-row">
                    <div class="explanation-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <path d="M12 17h.01"/>
                      </svg>
                      Explanation:
                    </div>
                    <div class="explanation-text">{{ q.explanation }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  max-height: 100vh;
  background: #f8fafc;
  overflow-x: hidden;
  position: relative;
  align-items: flex-start;
}

/* Let the sidebar component handle its own responsive behavior */

.content {
  flex: 1;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-width: 0; /* Prevents content from overflowing */
}

.header {
  margin-bottom: 32px;
}

.header-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: #4f46e5;
}

.breadcrumb-separator {
  color: #9ca3af;
}

.breadcrumb-current {
  color: #6b7280;
  font-weight: 500;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 18px;
  line-height: 1.5;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Score Overview Card */
.score-overview-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 48px;
}

.score-circle {
  position: relative;
  flex-shrink: 0;
}

.score-ring {
  transform: rotate(-90deg);
}

.score-ring-bg {
  stroke: #e5e7eb;
}

.score-ring-fill {
  transition: stroke-dashoffset 1.5s ease-in-out;
}

.score-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-number {
  font-size: 42px;
  font-weight: 900;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1;
}

.score-label {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.detail-content {
  flex: 1;
}

.detail-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

/* Dark mode styles */
body.dark .layout {
  background: #0b1020;
}

body.dark .header-content {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

body.dark .breadcrumb-link {
  color: #a5b4fc;
}

body.dark .breadcrumb-link:hover {
  color: #c7d2fe;
}

body.dark .breadcrumb-separator {
  color: #6b7280;
}

body.dark .breadcrumb-current {
  color: #9ca3af;
}

body.dark .header h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

body.dark .score-overview-card {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

body.dark .score-ring-bg {
  stroke: #374151;
}

body.dark .score-number {
  color: #e5e7eb;
}

body.dark .score-label {
  color: #9ca3af;
}

body.dark .detail-item {
  background: #111827;
  border-color: #1f2a44;
}

body.dark .detail-label {
  color: #9ca3af;
}

body.dark .detail-value {
  color: #e5e7eb;
}

/* Actions Card */
.actions-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.primary-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.secondary-actions {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  flex: 1;
  justify-content: center;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.action-btn.secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  flex: 1;
  justify-content: center;
}

.action-btn.secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.action-btn.tertiary {
  background: #f8fafc;
  color: #6b7280;
  border: 1px solid #e2e8f0;
  padding: 10px 16px;
}

.action-btn.tertiary:hover {
  background: #f1f5f9;
  color: #374151;
  border-color: #cbd5e1;
}

/* Dark mode for actions card */
body.dark .actions-card {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

body.dark .secondary-actions {
  border-top-color: #1f2a44;
}

body.dark .action-btn.secondary {
  background: #111827;
  color: #cbd5e1;
  border-color: #1f2a44;
}

body.dark .action-btn.secondary:hover {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

body.dark .action-btn.tertiary {
  background: #111827;
  color: #9ca3af;
  border-color: #1f2a44;
}

body.dark .action-btn.tertiary:hover {
  background: #1f2937;
  color: #cbd5e1;
  border-color: #374151;
}

/* Questions Card */
.questions-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.questions-header {
  margin-bottom: 32px;
}

.questions-header h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.questions-subtitle {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  background: #f8fafc;
  border-radius: 16px;
  padding: 24px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.question-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.question-item.correct {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.question-item.incorrect {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.question-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 18px;
}

.question-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.question-item.correct .status-icon {
  background: #10b981;
  color: white;
}

.question-item.incorrect .status-icon {
  background: #ef4444;
  color: white;
}

.status-text {
  font-weight: 600;
  font-size: 14px;
}

.question-item.correct .status-text {
  color: #059669;
}

.question-item.incorrect .status-text {
  color: #dc2626;
}

.question-content {
  margin-top: 16px;
}

.question-text {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  line-height: 1.5;
}

/* Dark mode for questions card */
body.dark .questions-card {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

body.dark .questions-header h3 {
  color: #e5e7eb;
}

body.dark .questions-subtitle {
  color: #9ca3af;
}

body.dark .question-item {
  background: #111827;
  border-color: #1f2a44;
}

body.dark .question-item:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

body.dark .question-item.correct {
  border-color: #10b981;
  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
}

body.dark .question-item.incorrect {
  border-color: #ef4444;
  background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
}

body.dark .question-item.correct .status-text {
  color: #34d399;
}

body.dark .question-item.incorrect .status-text {
  color: #f87171;
}

body.dark .question-text {
  color: #e5e7eb;
}

.answer-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.answer-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  min-width: 140px;
  flex-shrink: 0;
}

.answer-value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  font-weight: 500;
}

.your-answer .answer-label {
  color: #6b7280;
}

.correct-answer .answer-label {
  color: #059669;
}

.explanation-row {
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.explanation-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #667eea;
  min-width: 140px;
  flex-shrink: 0;
}

.explanation-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  font-style: italic;
}

/* Dark mode for answer section */
body.dark .answer-row {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(31, 42, 68, 0.5);
}

body.dark .answer-label {
  color: #cbd5e1;
}

body.dark .answer-value {
  color: #e5e7eb;
}

body.dark .your-answer .answer-label {
  color: #9ca3af;
}

body.dark .correct-answer .answer-label {
  color: #34d399;
}

body.dark .explanation-row {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.25);
}

body.dark .explanation-label {
  color: #a5b4fc;
}

body.dark .explanation-text {
  color: #cbd5e1;
}

/* Loading and Error States */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

/* BeatLoader handles its own styling */

.loading-container p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.error-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.error-message {
  color: #dc2626;
  font-size: 16px;
  margin: 0 0 24px;
  font-weight: 500;
}

/* Dark mode for loading and error states */
/* BeatLoader handles its own dark mode styling */

body.dark .loading-container p {
  color: #9ca3af;
}

body.dark .error-container {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

body.dark .error-message {
  color: #f87171;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content {
    max-width: 100%;
    padding: 24px;
  }
}

@media (max-width: 1024px) {
  .content {
    padding: 24px;
    padding-bottom: 120px; /* Add space for floating sidebar */
  }

  .score-section {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .score-details {
    max-width: 400px;
    margin: 0 auto;
  }
}

@media (max-width: 900px) {
  .content {
    padding: 20px;
    padding-bottom: 120px; /* Add space for floating sidebar */
  }

  .header-content {
    padding: 24px;
  }

  .score-overview-card {
    padding: 24px;
  }

  .actions-card {
    padding: 24px;
  }

  .questions-card {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 16px;
    padding-bottom: 120px; /* Add space for floating sidebar */
    margin: 0;
    width: 100%;
    max-width: 100%;
  }

  .header-content {
    padding: 20px;
    margin-bottom: 16px;
  }

  .header h1 {
    font-size: 24px;
  }

  .subtitle {
    font-size: 16px;
  }

  .breadcrumb {
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 12px;
  }

  .score-overview-card {
    padding: 20px;
    margin-bottom: 16px;
  }

  .score-section {
    gap: 20px;
  }

  .score-number {
    font-size: 32px;
  }

  .score-details {
    width: 100%;
    max-width: none;
  }

  .detail-item {
    padding: 16px;
  }

  .detail-icon {
    width: 40px;
    height: 40px;
  }

  .actions-card {
    padding: 20px;
    margin-bottom: 16px;
  }

  .primary-actions {
    flex-direction: column;
    gap: 12px;
  }

  .secondary-actions {
    flex-direction: column;
    gap: 8px;
  }

  .questions-card {
    padding: 20px;
  }

  .question-item {
    padding: 16px;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .question-number {
    align-self: flex-start;
  }

  .question-status {
    align-self: flex-end;
  }

  .answer-row {
    flex-direction: column;
    gap: 8px;
  }

  .answer-label {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 12px;
    padding-bottom: 120px; /* Add space for floating sidebar */
  }

  .header-content {
    padding: 16px;
  }

  .header h1 {
    font-size: 20px;
  }

  .subtitle {
    font-size: 14px;
  }

  .breadcrumb {
    font-size: 12px;
  }

  .score-overview-card {
    padding: 16px;
  }

  .score-circle svg {
    width: 100px;
    height: 100px;
  }

  .score-number {
    font-size: 24px;
  }

  .score-label {
    font-size: 10px;
  }

  .detail-item {
    padding: 12px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .detail-icon {
    width: 32px;
    height: 32px;
    margin: 0 auto;
  }

  .detail-label {
    font-size: 11px;
  }

  .detail-value {
    font-size: 14px;
  }

  .actions-card {
    padding: 16px;
  }

  .action-btn {
    padding: 12px 16px;
    font-size: 13px;
  }

  .questions-card {
    padding: 16px;
  }

  .questions-header h3 {
    font-size: 18px;
  }

  .questions-subtitle {
    font-size: 14px;
  }

  .question-item {
    padding: 12px;
  }

  .question-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .status-icon {
    width: 24px;
    height: 24px;
  }

  .status-text {
    font-size: 12px;
  }

  .question-text {
    font-size: 14px;
  }

  .answer-label {
    font-size: 11px;
  }

  .answer-value {
    font-size: 12px;
  }
}
</style>


