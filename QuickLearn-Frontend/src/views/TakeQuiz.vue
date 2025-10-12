<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import cloudQuizService from '../services/cloudQuizService'
import { Clock, CheckCircle, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const quiz = ref(null)
const currentQuestionIndex = ref(0)
const answers = ref({})
const isSubmitted = ref(false)
const showResults = ref(false)
const timeElapsed = ref(0)
const startTime = ref(null)
let timer = null

const currentQuestion = computed(() => {
  return quiz.value?.questions?.[currentQuestionIndex.value] || null
})

const totalQuestions = computed(() => {
  return quiz.value?.questions?.length || 0
})

const progress = computed(() => {
  return totalQuestions.value > 0 ? ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100 : 0
})

const score = computed(() => {
  if (!quiz.value?.questions) return 0
  let correct = 0
  quiz.value.questions.forEach((question, index) => {
    if (answers.value[index] === question.answer) {
      correct++
    }
  })
  return Math.round((correct / totalQuestions.value) * 100)
})

const timeFormatted = computed(() => {
  const minutes = Math.floor(timeElapsed.value / 60)
  const seconds = timeElapsed.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

onMounted(async () => {
  // Get quiz data from route params (UUID)
  if (route.params.quizId) {
    try {
      const quizData = await cloudQuizService.getQuizByUuid(route.params.quizId)
      if (quizData) {
        quiz.value = quizData
        startTimer()
      } else {
        window.$toast?.error('Quiz not found')
        router.push('/')
      }
    } catch (error) {
      console.error('Error loading quiz:', error)
      window.$toast?.error('Failed to load quiz')
      router.push('/')
    }
  } else {
    // No quiz ID provided, redirect to home
    router.push('/')
  }
})

function startTimer() {
  startTime.value = Date.now()
  timer = setInterval(() => {
    timeElapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)
}

function selectAnswer(answer) {
  answers.value[currentQuestionIndex.value] = answer
}

function nextQuestion() {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
  }
}

function previousQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

async function submitQuiz() {
  isSubmitted.value = true
  showResults.value = true
  if (timer) {
    clearInterval(timer)
  }

  // persist attempt result
  try {
    const elapsed = typeof timeElapsed.value === 'number' ? timeElapsed.value : 0
    if (quiz.value?.id && (await cloudQuizService.isAuthenticated())) {
      // capture user answers in order of questions
      const userAnswers = (quiz.value.questions || []).map((_, idx) => answers.value[idx] || null)
      await cloudQuizService.saveQuizAttempt(quiz.value.id, {
        score: score.value,
        timeSeconds: elapsed,
        userAnswers
      })
    }
  } catch (error) {
    console.error('Error saving quiz attempt:', error)
    // Don't show error to user, just log it
  }
}

function restartQuiz() {
  currentQuestionIndex.value = 0
  answers.value = {}
  isSubmitted.value = false
  showResults.value = false
  timeElapsed.value = 0
  startTimer()
}

function goHome() {
  router.push('/upload')
}

function goToUpload() {
  router.push('/upload')
}
</script>

<template>
  <div class="quiz-page">
    <!-- Floating Progress Indicator -->
    <div class="floating-progress">
      <div class="progress-circle">
        <svg class="progress-ring" width="60" height="60">
          <circle
            class="progress-ring-circle"
            stroke="#e5e7eb"
            stroke-width="4"
            fill="transparent"
            r="26"
            cx="30"
            cy="30"
          />
          <circle
            class="progress-ring-circle progress-ring-fill"
            stroke="url(#gradient)"
            stroke-width="4"
            fill="transparent"
            r="26"
            cx="30"
            cy="30"
            :stroke-dasharray="163.36"
            :stroke-dashoffset="163.36 - (163.36 * progress) / 100"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
        </svg>
        <div class="progress-text">{{ currentQuestionIndex + 1 }}/{{ totalQuestions }}</div>
      </div>
    </div>

    <div class="quiz-main">
        <div class="quiz-header">
      <button class="back-btn" @click="goHome">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m12 19-7-7 7-7"/>
          <path d="m19 12H5"/>
        </svg>
        Back to Home
      </button>
      <div class="quiz-title">
        <h1>{{ quiz?.title || 'Quiz' }}</h1>
        <p class="description">{{ quiz?.description }}</p>
      </div>
      <div class="quiz-meta">
        <div class="timer">
          <Clock :size="16" />
          {{ timeFormatted }}
        </div>
        <div class="question-counter">
          <span class="current">{{ currentQuestionIndex + 1 }}</span>
          <span class="separator">of</span>
          <span class="total">{{ totalQuestions }}</span>
        </div>
      </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          <div class="progress-markers">
            <div
              v-for="(_, index) in quiz?.questions"
              :key="index"
              class="marker"
              :class="{
                active: index <= currentQuestionIndex,
                current: index === currentQuestionIndex
              }"
              :style="{ left: `${(index / (totalQuestions - 1)) * 100}%` }"
            ></div>
          </div>
        </div>

        <div v-if="!showResults" class="quiz-content">
      <div class="question-section">
        <div class="question-card">
          <div class="question-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
            Question {{ currentQuestionIndex + 1 }}
          </div>

          <div class="question-text">
            {{ currentQuestion?.question }}
          </div>

          <div class="choices">
            <div
              v-for="(choice, index) in currentQuestion?.choices"
              :key="index"
              class="choice-option"
              :class="{ selected: answers[currentQuestionIndex] === choice }"
              @click="selectAnswer(choice)"
            >
              <div class="choice-radio">
                <input
                  type="radio"
                  :name="`question-${currentQuestionIndex}`"
                  :value="choice"
                  :checked="answers[currentQuestionIndex] === choice"
                  @change="selectAnswer(choice)"
                />
                <div class="radio-custom">
                  <div class="radio-dot"></div>
                </div>
              </div>
              <div class="choice-content">
                <span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span>
                <span class="choice-text">{{ choice }}</span>
              </div>
              <div class="choice-indicator">
                <svg v-if="answers[currentQuestionIndex] === choice" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="navigation">
        <div class="nav-controls">
          <button
            class="nav-btn secondary"
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
          >
            <ArrowLeft :size="16" />
            Previous
          </button>

          <button
            v-if="currentQuestionIndex < totalQuestions - 1"
            class="nav-btn primary"
            @click="nextQuestion"
            :disabled="!answers[currentQuestionIndex]"
          >
            Next
            <ArrowRight :size="16" />
          </button>

          <button
            v-else
            class="nav-btn submit"
            @click="submitQuiz"
            :disabled="Object.keys(answers).length === 0"
          >
            <CheckCircle :size="16" />
            Submit Quiz
          </button>
        </div>
      </div>
        </div>

        <div v-else class="results-section">
      <div class="results-header">
        <div class="celebration-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
          </svg>
        </div>
        <h2>Quiz Complete!</h2>
        <p class="results-subtitle">Great job! Here's how you performed</p>

        <div class="score-display">
          <div class="score-circle">
            <svg class="score-ring" width="140" height="140">
              <circle
                class="score-ring-bg"
                stroke="#e5e7eb"
                stroke-width="8"
                fill="transparent"
                r="62"
                cx="70"
                cy="70"
              />
              <circle
                class="score-ring-fill"
                stroke="url(#scoreGradient)"
                stroke-width="8"
                fill="transparent"
                r="62"
                cx="70"
                cy="70"
                :stroke-dasharray="389.56"
                :stroke-dashoffset="389.56 - (389.56 * score) / 100"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" :style="`stop-color:${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'};stop-opacity:1`" />
                  <stop offset="100%" :style="`stop-color:${score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626'};stop-opacity:1`" />
                </linearGradient>
              </defs>
            </svg>
            <div class="score-content">
              <span class="score-number">{{ score }}%</span>
              <span class="score-label">{{ score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Trying!' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="results-stats">
        <div class="stat-card correct">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ Object.values(answers).filter((answer, index) => answer === quiz.questions[index].answer).length }}</span>
            <span class="stat-label">Correct</span>
          </div>
        </div>
        <div class="stat-card incorrect">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ Object.values(answers).filter((answer, index) => answer !== quiz.questions[index].answer).length }}</span>
            <span class="stat-label">Incorrect</span>
          </div>
        </div>
        <div class="stat-card time">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ timeFormatted }}</span>
            <span class="stat-label">Time Taken</span>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="action-btn secondary" @click="restartQuiz">
          <RotateCcw :size="16" />
          Retake Quiz
        </button>
        <button class="action-btn primary" @click="goToUpload">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          Create New Quiz
        </button>
      </div>

      <div class="detailed-results">
        <div class="review-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Review Your Answers
          </h3>
          <p class="review-subtitle">See how you performed on each question</p>
        </div>

        <div class="answer-review">
          <div
            v-for="(question, index) in quiz.questions"
            :key="index"
            class="review-item"
            :class="{ correct: answers[index] === question.answer, incorrect: answers[index] !== question.answer }"
          >
            <div class="review-header-item">
              <div class="question-number">
                <span class="q-num">{{ index + 1 }}</span>
              </div>
              <div class="result-indicator">
                <svg v-if="answers[index] === question.answer" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            </div>

            <div class="review-question">
              {{ question.question }}
            </div>

            <div class="review-answers">
              <div class="answer-row your-answer">
                <div class="answer-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Your answer:
                </div>
                <div class="answer-value">{{ answers[index] || 'Not answered' }}</div>
              </div>

              <div class="answer-row correct-answer">
                <div class="answer-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Correct answer:
                </div>
                <div class="answer-value">{{ question.answer }}</div>
              </div>

              <div v-if="question.explanation" class="explanation">
                <div class="explanation-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  Explanation:
                </div>
                <div class="explanation-text">{{ question.explanation }}</div>
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
.quiz-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background:
    radial-gradient(1000px 600px at 20% -10%, rgba(102,126,234,0.08), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118,75,162,0.06), transparent 60%);
  min-height: 100vh;
  position: relative;
}

/* Floating Progress Indicator */
.floating-progress {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  background: white;
  border-radius: 50%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 8px;
}

.progress-circle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.5s ease-in-out;
}

.progress-text {
  position: absolute;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.quiz-main {
  min-width: 0;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 20px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.back-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.quiz-title h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  color: #6b7280;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

.quiz-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.question-counter {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.question-counter .current {
  font-size: 16px;
}

.question-counter .separator {
  opacity: 0.8;
  margin: 0 4px;
}

.question-counter .total {
  opacity: 0.9;
}

.progress-bar {
  height: 12px;
  background: #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 32px;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
  border-radius: 8px;
}

.progress-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.marker.active {
  border-color: #667eea;
  background: #667eea;
}

.marker.current {
  width: 12px;
  height: 12px;
  border-color: #764ba2;
  background: #764ba2;
  box-shadow: 0 0 0 4px rgba(118, 75, 162, 0.2);
}

.quiz-content {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.question-section {
  margin-bottom: 40px;
}

.question-card {
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e0e7ff;
}

.question-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.question-text {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 32px;
  line-height: 1.4;
}

.choices {
  display: grid;
  gap: 16px;
}

.choice-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  position: relative;
  overflow: hidden;
}

.choice-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.choice-option:hover::before {
  opacity: 1;
}

.choice-option:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.choice-option.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f0f3ff 0%, #e0e7ff 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
}

.choice-option.selected::before {
  opacity: 1;
}

.choice-radio {
  position: relative;
  flex-shrink: 0;
}

.choice-radio input[type="radio"] {
  opacity: 0;
  position: absolute;
  width: 20px;
  height: 20px;
  margin: 0;
}

.radio-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  position: relative;
  transition: all 0.3s ease;
  background: white;
}

.choice-option.selected .radio-custom {
  border-color: #667eea;
  background: #667eea;
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.3s ease;
}

.choice-option.selected .radio-dot {
  transform: translate(-50%, -50%) scale(1);
}

.choice-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.choice-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.3s ease;
}

.choice-option.selected .choice-letter {
  background: #667eea;
  color: white;
}

.choice-text {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
  line-height: 1.5;
}

.choice-indicator {
  flex-shrink: 0;
  color: #667eea;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.choice-option.selected .choice-indicator {
  opacity: 1;
  transform: scale(1);
}

.navigation {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.nav-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.nav-btn {
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

.nav-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.nav-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.nav-btn.secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.nav-btn.secondary:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.nav-btn.submit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.nav-btn.submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.question-navigator {
  flex: 1;
  text-align: center;
}

.nav-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.question-dots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

.dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
}

.dot:hover {
  border-color: #667eea;
  background: #f8faff;
  transform: scale(1.1);
}

.dot.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
  transform: scale(1.1);
}

.dot.answered {
  border-color: #10b981;
  background: #10b981;
  color: white;
}

.dot.answered:hover {
  border-color: #059669;
  background: #059669;
}

.dot-check {
  font-size: 14px;
}

.results-section {
  background: white;
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.results-header {
  text-align: center;
  margin-bottom: 48px;
}

.celebration-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
}

.results-header h2 {
  margin: 0 0 8px;
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
}

.results-subtitle {
  color: #6b7280;
  font-size: 18px;
  margin: 0 0 32px;
}

.score-display {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.score-circle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-ring {
  transform: rotate(-90deg);
}

.score-ring-bg {
  opacity: 0.1;
}

.score-ring-fill {
  transition: stroke-dashoffset 1s ease-in-out;
}

.score-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 4px;
}

.score-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card.correct {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #bbf7d0;
}

.stat-card.incorrect {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #fecaca;
}

.stat-card.time {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: #bae6fd;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-card.correct .stat-icon {
  background: #10b981;
  color: white;
}

.stat-card.incorrect .stat-icon {
  background: #ef4444;
  color: white;
}

.stat-card.time .stat-icon {
  background: #3b82f6;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.results-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
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
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.action-btn.secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.action-btn.secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.detailed-results {
  background: #f8fafc;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e2e8f0;
}

.review-header {
  margin-bottom: 32px;
}

.review-header h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.review-subtitle {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.answer-review {
  display: grid;
  gap: 20px;
}

.review-item {
  background: white;
  padding: 24px;
  border-radius: 16px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.review-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.review-item.correct {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.review-item.incorrect {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.review-header-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.question-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 16px;
}

.result-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.review-item.correct .result-indicator {
  background: #10b981;
  color: white;
}

.review-item.incorrect .result-indicator {
  background: #ef4444;
  color: white;
}

.review-question {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  line-height: 1.5;
}

.review-answers {
  display: grid;
  gap: 16px;
}

.answer-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
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
  min-width: 120px;
  flex-shrink: 0;
}

.answer-value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

.your-answer .answer-label {
  color: #6b7280;
}

.correct-answer .answer-label {
  color: #059669;
}

.explanation {
  background: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.explanation-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #667eea;
  min-width: 120px;
  flex-shrink: 0;
}

.explanation-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  font-style: italic;
}

@media (max-width: 768px) {
  .quiz-page {
    padding: 16px;
  }

  .floating-progress {
    top: 16px;
    right: 16px;
    transform: scale(0.9);
  }

  .quiz-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .quiz-meta {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .quiz-title h1 {
    font-size: 24px;
  }

  .quiz-content {
    padding: 24px;
  }

  .question-card {
    padding: 24px;
  }

  .question-text {
    font-size: 20px;
  }

  .nav-controls {
    flex-direction: column;
    gap: 20px;
  }

  .question-navigator {
    order: -1;
  }

  .nav-btn {
    width: 100%;
    justify-content: center;
  }

  .question-dots {
    max-width: none;
  }

  .results-section {
    padding: 32px 24px;
  }

  .results-stats {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stat-card {
    padding: 20px;
  }

  .results-actions {
    flex-direction: column;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .detailed-results {
    padding: 24px;
  }

  .review-item {
    padding: 20px;
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
  .choice-option {
    padding: 16px;
  }

  .choice-content {
    gap: 8px;
  }

  .choice-letter {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .choice-text {
    font-size: 14px;
  }

  .question-dots {
    gap: 6px;
  }

  .dot {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }
}


</style>
