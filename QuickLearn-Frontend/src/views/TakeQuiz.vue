<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getQuizById } from '../services/quizService'

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

onMounted(() => {
  // Get quiz data from route params, localStorage, or quiz ID
  let quizData = null
  
  if (route.params.quizId) {
    // Try to get quiz by ID from localStorage
    quizData = getQuizById(route.params.quizId)
  } else {
    // Get from localStorage (for direct navigation from upload)
    const currentId = localStorage.getItem('currentQuizId')
    quizData = currentId ? getQuizById(currentId) : JSON.parse(localStorage.getItem('currentQuiz') || 'null')
  }
  
  if (quizData) {
    quiz.value = quizData
    startTimer()
  } else {
    // Redirect to home if no quiz data
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

function goToQuestion(index) {
  currentQuestionIndex.value = index
}

function submitQuiz() {
  isSubmitted.value = true
  showResults.value = true
  if (timer) {
    clearInterval(timer)
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
    <div class="quiz-main">
        <div class="quiz-header">
      <button class="back-btn pill" @click="goHome">← Back to Home</button>
      <div class="quiz-title">
        <h1>{{ quiz?.title || 'Quiz' }}</h1>
        <p class="description">{{ quiz?.description }}</p>
      </div>
      <div class="quiz-meta">
        <div class="timer">⏱️ {{ timeFormatted }}</div>
        <div class="progress-info">{{ currentQuestionIndex + 1 }} of {{ totalQuestions }}</div>
      </div>
        </div>

        

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>

        <div v-if="!showResults" class="quiz-content">
      <div class="question-section">
        <div class="question-header">
          <span class="question-number">Question {{ currentQuestionIndex + 1 }}</span>
          <span class="question-total">of {{ totalQuestions }}</span>
        </div>
        
        <div class="question-text">
          {{ currentQuestion?.question }}
        </div>

        <div class="choices">
          <label 
            v-for="(choice, index) in currentQuestion?.choices" 
            :key="index"
            class="choice"
            :class="{ selected: answers[currentQuestionIndex] === choice }"
          >
            <input 
              type="radio" 
              :name="`question-${currentQuestionIndex}`"
              :value="choice"
              @change="selectAnswer(choice)"
              :checked="answers[currentQuestionIndex] === choice"
            />
            <span class="choice-text">{{ choice }}</span>
          </label>
        </div>
      </div>

      <div class="navigation">
        <button 
          class="nav-btn secondary" 
          @click="previousQuestion"
          :disabled="currentQuestionIndex === 0"
        >
          ← Previous
        </button>
        
        <div class="question-dots">
          <button 
            v-for="(question, index) in quiz?.questions" 
            :key="index"
            class="dot"
            :class="{ 
              active: index === currentQuestionIndex,
              answered: answers[index],
              current: index === currentQuestionIndex
            }"
            @click="goToQuestion(index)"
          >
            {{ index + 1 }}
          </button>
        </div>

        <button 
          v-if="currentQuestionIndex < totalQuestions - 1"
          class="nav-btn primary" 
          @click="nextQuestion"
        >
          Next →
        </button>
        
        <button 
          v-else
          class="nav-btn primary submit" 
          @click="submitQuiz"
          :disabled="!answers[currentQuestionIndex]"
        >
          Submit Quiz
        </button>
      </div>
        </div>

        <div v-else class="results-section">
      <div class="results-header">
        <h2>🎉 Quiz Complete!</h2>
        <div class="score-display">
          <div class="score-circle">
            <span class="score-number">{{ score }}%</span>
            <span class="score-label">Score</span>
          </div>
        </div>
      </div>

      <div class="results-stats">
        <div class="stat">
          <span class="stat-value">{{ Object.values(answers).filter((answer, index) => answer === quiz.questions[index].answer).length }}</span>
          <span class="stat-label">Correct</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ Object.values(answers).filter((answer, index) => answer !== quiz.questions[index].answer).length }}</span>
          <span class="stat-label">Incorrect</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ timeFormatted }}</span>
          <span class="stat-label">Time</span>
        </div>
      </div>

      <div class="results-actions">
        <button class="action-btn secondary" @click="restartQuiz">
          🔄 Retake Quiz
        </button>
        <button class="action-btn primary" @click="goToUpload">
          📝 Create New Quiz
        </button>
      </div>

      <div class="detailed-results">
        <h3>Review Your Answers</h3>
        <div class="answer-review">
          <div 
            v-for="(question, index) in quiz.questions" 
            :key="index"
            class="review-item"
            :class="{ correct: answers[index] === question.answer, incorrect: answers[index] !== question.answer }"
          >
            <div class="review-question">
              <strong>Q{{ index + 1 }}:</strong> {{ question.question }}
            </div>
            <div class="review-answers">
              <div class="your-answer">
                <strong>Your answer:</strong> {{ answers[index] || 'Not answered' }}
              </div>
              <div class="correct-answer">
                <strong>Correct answer:</strong> {{ question.answer }}
              </div>
              <div v-if="question.explanation" class="explanation">
                <strong>Explanation:</strong> {{ question.explanation }}
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
    radial-gradient(1000px 600px at 20% -10%, rgba(102,126,234,0.12), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118,75,162,0.10), transparent 60%);
  min-height: 100vh;
}

.quiz-main {
  min-width: 0;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
  padding: 8px 0;
}

.back-btn.pill {
  background: #f3f4ff;
  color: #4b53c5;
  padding: 8px 12px;
  border-radius: 9999px;
}

.quiz-title h1 {
  margin: 0 0 8px;
  font-size: 28px;
  color: #1f2937;
}

.description {
  color: #6b7280;
  margin: 0;
}

.quiz-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.timer, .progress-info {
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 32px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.quiz-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 25px rgba(50, 50, 93, 0.05);
}

.question-section {
  margin-bottom: 32px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.question-number {
  background: #667eea;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.question-total {
  color: #6b7280;
  font-size: 14px;
}

.question-text {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
  line-height: 1.5;
}

.choices {
  display: grid;
  gap: 12px;
}

.choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.choice:hover {
  border-color: #667eea;
  background: #f8faff;
}

.choice.selected {
  border-color: #667eea;
  background: #f0f3ff;
}

.choice input[type="radio"] {
  margin: 0;
  width: 18px;
  height: 18px;
  accent-color: #667eea;
}

.choice-text {
  font-size: 16px;
  color: #374151;
}

.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.nav-btn {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.nav-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.nav-btn.secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.question-dots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot:hover {
  border-color: #667eea;
  background: #f8faff;
}

.dot.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.dot.answered {
  border-color: #10b981;
  background: #10b981;
  color: white;
}

.results-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 25px rgba(50, 50, 93, 0.05);
}

.results-header {
  text-align: center;
  margin-bottom: 32px;
}

.results-header h2 {
  margin: 0 0 24px;
  font-size: 32px;
  color: #1f2937;
}

.score-display {
  display: flex;
  justify-content: center;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.score-number {
  font-size: 32px;
  font-weight: 700;
}

.score-label {
  font-size: 14px;
  opacity: 0.9;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat {
  text-align: center;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.results-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
}

.detailed-results h3 {
  margin: 0 0 20px;
  color: #1f2937;
}

.answer-review {
  display: grid;
  gap: 16px;
}

.review-item {
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
}

.review-item.correct {
  border-color: #10b981;
  background: #f0fdf4;
}

.review-item.incorrect {
  border-color: #ef4444;
  background: #fef2f2;
}

.review-question {
  margin-bottom: 12px;
  color: #1f2937;
}

.review-answers {
  display: grid;
  gap: 8px;
}

.your-answer, .correct-answer, .explanation {
  font-size: 14px;
}

.your-answer {
  color: #6b7280;
}

.correct-answer {
  color: #059669;
}

.explanation {
  color: #4b5563;
  font-style: italic;
}

@media (max-width: 768px) {
  .quiz-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .quiz-meta {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .navigation {
    flex-direction: column;
    gap: 16px;
  }
  
  .question-dots {
    order: -1;
  }
  
  .results-stats {
    grid-template-columns: 1fr;
  }
  
  .results-actions {
    flex-direction: column;
  }
}

.recent-quizzes {
  margin-bottom: 16px;
}

.recent-hint {
  margin: 4px 0 8px;
  color: #6b7280;
}

.recent-list {
  display: grid;
  gap: 8px;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}

.recent-item:hover {
  background: #f8faff;
  border-color: #667eea;
}

.rq-title {
  font-weight: 600;
  color: #1f2937;
}

.rq-meta {
  color: #6b7280;
  font-size: 12px;
}
</style>
