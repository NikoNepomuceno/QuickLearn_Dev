<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import cloudQuizService from '../services/cloudQuizService'
import VoiceQuiz from '../components/VoiceQuiz.vue'
import EnumerationInput from '../components/EnumerationInput.vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { Clock, CheckCircle, ArrowRight, Play } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const screenReaderStatus = ref('')
const storageKey = computed(() => {
  const id = route.params.quizId
  return id ? `quiz-progress-${id}` : null
})

const quiz = ref(null)
const currentQuestionIndex = ref(0)
const answers = ref({})
// Removed inline results view; results are shown on dedicated route
const timeElapsed = ref(0)
const startTime = ref(null)
const questionTimesMs = ref([]) // per-question timings in milliseconds
const questionStartedAt = ref(null) // timestamp when current question started
const FAST_CHOICE_THRESHOLD_MS = 3000
const FAST_TEXT_THRESHOLD_MS = 5000
const MAX_RETAKE_POINTS = 2
const firstAnswerElapsedMs = ref({})
const retakePointAwardedForQuestion = ref({})
const retakePointsEarned = ref(0)
const retakePointsSpent = ref(0)
const retakeModalVisible = ref(false)
const retakeModalDismissed = ref(false)
const retakeReturnIndex = ref(null)
const activeRetakeQuestionIndex = ref(null)
let timer = null
let perQuestionTimer = null
const questionTimeRemaining = ref(null)
const MIN_QUESTION_TIMER = 10
const MAX_QUESTION_TIMER = 300

// Quiz stage management: 'overview', 'countdown', 'active'
const quizStage = ref('overview')
let countdownTimeout = null

const currentQuestion = computed(() => {
  return quiz.value?.questions?.[currentQuestionIndex.value] || null
})

const totalQuestions = computed(() => {
  return quiz.value?.questions?.length || 0
})

const progress = computed(() => {
  return totalQuestions.value > 0
    ? ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100
    : 0
})

function clampQuestionSecondsValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(MAX_QUESTION_TIMER, Math.max(MIN_QUESTION_TIMER, Math.round(num)))
}

const timedSettings = computed(() => {
  const metadata = quiz.value?.metadata || {}
  const options = metadata.options || {}
  const legacy = metadata.timedSettings || metadata.timedMode || {}
  const enabledRaw =
    options.timedModeEnabled ??
    legacy.timedModeEnabled ??
    metadata.timedModeEnabled ??
    metadata.timedQuiz
  const enabled = Boolean(enabledRaw)
  const secondsRaw =
    options.questionTimerSeconds ??
    legacy.questionTimerSeconds ??
    metadata.questionTimerSeconds
  const seconds = enabled ? clampQuestionSecondsValue(secondsRaw ?? 0) : null
  return {
    enabled,
    seconds,
  }
})

const isTimedQuiz = computed(() => Boolean(timedSettings.value.enabled && timedSettings.value.seconds))
const questionTimerLimit = computed(() => (isTimedQuiz.value ? timedSettings.value.seconds || 0 : 0))
const questionCountdownForUi = computed(() => {
  if (!isTimedQuiz.value) return 0
  if (typeof questionTimeRemaining.value === 'number' && questionTimeRemaining.value >= 0) {
    return questionTimeRemaining.value
  }
  return questionTimerLimit.value
})
const perQuestionTimerFormatted = computed(() => {
  if (!isTimedQuiz.value) return ''
  const remaining = Math.max(0, questionCountdownForUi.value || 0)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
const retakePointsAvailable = computed(() =>
  Math.max(0, Math.min(MAX_RETAKE_POINTS, retakePointsEarned.value) - retakePointsSpent.value)
)
const retakeCandidateIndices = computed(() => {
  const questions = quiz.value?.questions || []
  if (!questions.length) return []
  return questions.reduce((acc, question, index) => {
    const answer = answers.value?.[index]
    const answered = hasMeaningfulAnswer(answer, question.type)
    const correct = answered && isAnswerCorrect(answer, question.answer, question.type)
    if (!answered || !correct) {
      acc.push(index)
    }
    return acc
  }, [])
})
const retakeEligibleCount = computed(() => retakeCandidateIndices.value.length)
const shouldOfferRetakeBeforeSubmit = computed(
  () => retakePointsAvailable.value > 0 && retakeEligibleCount.value > 0
)
const isOnLastQuestion = computed(
  () => totalQuestions.value > 0 && currentQuestionIndex.value === totalQuestions.value - 1
)

function isAnswerCorrect(userAnswer, correctAnswer, questionType) {
  if (!userAnswer || !correctAnswer) return false

  if (questionType === 'enumeration') {
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
    if (questionType === 'identification') {
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

const score = computed(() => {
  if (!quiz.value?.questions) return 0
  let correct = 0
  quiz.value.questions.forEach((question, index) => {
    if (isAnswerCorrect(answers.value[index], question.answer, question.type)) {
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

// Extract number from question text (e.g., "Name two scenarios" -> 2)
function extractNumberFromQuestion(questionText) {
  if (!questionText) return null

  const text = questionText.toLowerCase()

  // Number word to number mapping
  const numberWords = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15
  }

  // Try to find number words first
  for (const [word, num] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(text)) {
      return num
    }
  }

  // Try to find numeric patterns like "2", "3", etc.
  const numericMatch = text.match(/\b(\d+)\b/)
  if (numericMatch) {
    const num = parseInt(numericMatch[1], 10)
    if (num > 0 && num <= 15) {
      return num
    }
  }

  return null
}

const isCurrentQuestionAnswered = computed(() => {
  const currentAnswer = answers.value[currentQuestionIndex.value]
  if (!currentAnswer) return false

  // For enumeration questions, check if all required fields are filled
  if (currentQuestion.value?.type === 'enumeration') {
    // First, try to extract number from question text
    const textNumber = extractNumberFromQuestion(currentQuestion.value?.question)
    const requiredCount = textNumber !== null
      ? textNumber
      : (Array.isArray(currentQuestion.value?.answer) ? currentQuestion.value.answer.length : 0)

    return (
      Array.isArray(currentAnswer) &&
      currentAnswer.length === requiredCount &&
      currentAnswer.every((item) => item.trim() !== '')
    )
  }

  return currentAnswer && currentAnswer.toString().trim() !== ''
})

const isVoiceEnabled = ref(false)

onMounted(async () => {
  if (route.params.quizId) {
    try {
      const quizData = await cloudQuizService.getQuizByUuid(route.params.quizId)
      if (quizData) {
        quiz.value = quizData
        const count = quizData.questions?.length || 0
        questionTimesMs.value = Array.from({ length: count }, () => 0)
        // Timer will start after countdown completes
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
    router.push('/')
  }

  if (typeof window !== 'undefined') {
    updateWindowWidth()
    window.addEventListener('resize', updateWindowWidth)
  }
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (countdownTimeout) {
    clearTimeout(countdownTimeout)
  }
  if (perQuestionTimer) {
    clearInterval(perQuestionTimer)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowWidth)
  }
})

function startTimer() {
  startTime.value = Date.now()
  timer = setInterval(() => {
    timeElapsed.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)
}

function accumulateTimeForCurrent() {
  if (questionStartedAt.value == null) return
  const now = Date.now()
  const elapsedMs = now - questionStartedAt.value
  const idx = currentQuestionIndex.value
  if (idx >= 0 && idx < (questionTimesMs.value?.length || 0)) {
    questionTimesMs.value[idx] = (Number(questionTimesMs.value[idx]) || 0) + Math.max(0, elapsedMs)
  }
  questionStartedAt.value = now
}

function clearPerQuestionTimer() {
  if (perQuestionTimer) {
    clearInterval(perQuestionTimer)
    perQuestionTimer = null
  }
}

function restartPerQuestionTimer() {
  clearPerQuestionTimer()
  if (!isTimedQuiz.value || quizStage.value !== 'active') {
    questionTimeRemaining.value = null
    return
  }
  const limit = questionTimerLimit.value
  if (!limit) {
    questionTimeRemaining.value = null
    return
  }
  questionTimeRemaining.value = limit
  perQuestionTimer = setInterval(() => {
    if (!isTimedQuiz.value) {
      clearPerQuestionTimer()
      questionTimeRemaining.value = null
      return
    }
    if (typeof questionTimeRemaining.value !== 'number') {
      questionTimeRemaining.value = questionTimerLimit.value || limit
    } else if (questionTimeRemaining.value > 0) {
      questionTimeRemaining.value = questionTimeRemaining.value - 1
    }
    if (questionTimeRemaining.value === 0) {
      handleQuestionTimeout()
    }
  }, 1000)
}

function handleQuestionTimeout() {
  if (!isTimedQuiz.value) return
  clearPerQuestionTimer()
  questionTimeRemaining.value = 0
  accumulateTimeForCurrent()
  const wasAnswered = isCurrentQuestionAnswered.value
  if (!wasAnswered) {
    // Record a blank answer so results show the question was skipped
    answers.value[currentQuestionIndex.value] = ''
    persistProgress()
    window.$toast?.info?.(`Time is up for question ${currentQuestionIndex.value + 1}.`)
  }

  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
    persistProgress()
    const statusMessage = wasAnswered
      ? `Timer elapsed. Moving to question ${currentQuestionIndex.value + 1}.`
      : `Time expired. Moving to question ${currentQuestionIndex.value + 1}.`
    screenReaderStatus.value = statusMessage
  } else {
    attemptFinishQuiz({ auto: true })
  }
}

watch(
  () => quizStage.value,
  (stage) => {
    if (stage === 'active') {
      restartPerQuestionTimer()
    } else {
      clearPerQuestionTimer()
      questionTimeRemaining.value = null
    }
  },
)

watch(
  () => currentQuestionIndex.value,
  (newIndex, oldIndex) => {
    if (quizStage.value === 'active' && isTimedQuiz.value) {
      restartPerQuestionTimer()
    }
  },
)

watch(
  () => isTimedQuiz.value,
  (enabled) => {
    if (enabled && quizStage.value === 'active') {
      restartPerQuestionTimer()
    } else if (!enabled) {
      clearPerQuestionTimer()
      questionTimeRemaining.value = null
      resetDeferredRetakeState()
    }
  },
)

watch(
  () => ({
    shouldOffer: shouldOfferRetakeBeforeSubmit.value,
    canPrompt:
      quizStage.value === 'active' &&
      isOnLastQuestion.value &&
      isCurrentQuestionAnswered.value
  }),
  ({ shouldOffer, canPrompt }) => {
    if (shouldOffer && canPrompt && !retakeModalVisible.value && !retakeModalDismissed.value) {
      retakeModalVisible.value = true
    }
  }
)

function hasMeaningfulAnswer(answer, questionType) {
  if (answer == null) return false
  if (questionType === 'enumeration') {
    return Array.isArray(answer) && answer.some((item) => (item ?? '').toString().trim() !== '')
  }
  if (Array.isArray(answer)) {
    return answer.length > 0 && answer.some((item) => (item ?? '').toString().trim() !== '')
  }
  if (typeof answer === 'string') {
    return answer.trim() !== ''
  }
  return true
}

function resetDeferredRetakeState() {
  retakePointsEarned.value = 0
  retakePointsSpent.value = 0
  retakePointAwardedForQuestion.value = {}
  firstAnswerElapsedMs.value = {}
  retakeModalVisible.value = false
  retakeModalDismissed.value = false
  retakeReturnIndex.value = null
  activeRetakeQuestionIndex.value = null
}

function getRetakeThresholdMs(questionType) {
  const normalized = (questionType || '')
    .toString()
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
  if (['multiple_choice', 'true_false'].includes(normalized)) {
    return FAST_CHOICE_THRESHOLD_MS
  }
  if (normalized === 'enumeration' || normalized === 'identification') {
    return FAST_TEXT_THRESHOLD_MS
  }
  return null
}

function maybeAwardRetakePoint({ index, question, elapsedMsOverride }) {
  if (!question) return false
  if (!isTimedQuiz.value) return false

  const threshold = getRetakeThresholdMs(question.type)
  if (threshold == null) return false
  if (retakePointAwardedForQuestion.value?.[index]) return false

  const answer = answers.value?.[index]
  if (!hasMeaningfulAnswer(answer, question.type)) return false
  if (!isAnswerCorrect(answer, question.answer, question.type)) return false

  const elapsedMs =
    typeof elapsedMsOverride === 'number'
      ? elapsedMsOverride
      : firstAnswerElapsedMs.value?.[index]

  if (typeof elapsedMs !== 'number' || elapsedMs > threshold) return false
  if (retakePointsEarned.value >= MAX_RETAKE_POINTS) return false

  retakePointsEarned.value = Math.min(MAX_RETAKE_POINTS, retakePointsEarned.value + 1)
  retakePointAwardedForQuestion.value = {
    ...retakePointAwardedForQuestion.value,
    [index]: true
  }
  retakeModalDismissed.value = false
  screenReaderStatus.value = `Retake point earned. ${retakePointsAvailable.value} available.`
  window.$toast?.success?.('Retake point earned! Use it after the quiz to try again.')
  return true
}

function recordAnswerForCurrent(answer) {
  const index = currentQuestionIndex.value
  answers.value[index] = answer
  persistProgress()
  screenReaderStatus.value = `Answer recorded for question ${index + 1}.`

  const question = quiz.value?.questions?.[index]
  if (!question) return

  const alreadyTracked = Object.prototype.hasOwnProperty.call(firstAnswerElapsedMs.value, index)
  let elapsedMs = firstAnswerElapsedMs.value?.[index]
  if (!alreadyTracked && hasMeaningfulAnswer(answer, question.type) && typeof questionStartedAt.value === 'number') {
    elapsedMs = Date.now() - questionStartedAt.value
    firstAnswerElapsedMs.value = {
      ...firstAnswerElapsedMs.value,
      [index]: elapsedMs
    }
  }

  maybeAwardRetakePoint({
    answer,
    index,
    question,
    elapsedMsOverride: elapsedMs
  })

  if (activeRetakeQuestionIndex.value === index) {
    activeRetakeQuestionIndex.value = null
    if (typeof retakeReturnIndex.value === 'number') {
      currentQuestionIndex.value = retakeReturnIndex.value
      persistProgress()
    }
    retakeReturnIndex.value = null
  }
}

function selectAnswer(answer) {
  recordAnswerForCurrent(answer)
}

function nextQuestion() {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    clearPerQuestionTimer()
    accumulateTimeForCurrent()
    currentQuestionIndex.value++
    persistProgress()
    screenReaderStatus.value = `Moved to question ${currentQuestionIndex.value + 1}.`
  }
}

function handleSubmitClick() {
  attemptFinishQuiz()
}

function attemptFinishQuiz({ auto = false } = {}) {
  if (retakeModalVisible.value) return false
  if (shouldOfferRetakeBeforeSubmit.value && !retakeModalDismissed.value) {
    retakeModalVisible.value = true
    if (auto) {
      screenReaderStatus.value = 'Retake opportunity available before finishing the quiz.'
    }
    return false
  }
  submitQuiz()
  return true
}

function pickRandomRetakeCandidateIndex() {
  const candidates = retakeCandidateIndices.value
  if (!candidates.length) return null
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex]
}

function resetAnswerForQuestion(index) {
  const question = quiz.value?.questions?.[index]
  if (!question) return
  answers.value[index] = question.type === 'enumeration' ? [] : ''
  const { [index]: _omit, ...rest } = firstAnswerElapsedMs.value
  firstAnswerElapsedMs.value = rest
}

function startDeferredRetake() {
  const targetIndex = pickRandomRetakeCandidateIndex()
  if (targetIndex == null) {
    skipRetakesAndSubmit()
    return
  }

  retakePointsSpent.value = Math.min(retakePointsEarned.value, retakePointsSpent.value + 1)
  retakeModalVisible.value = false
  accumulateTimeForCurrent()
  resetAnswerForQuestion(targetIndex)

  retakeReturnIndex.value = totalQuestions.value > 0 ? totalQuestions.value - 1 : null
  activeRetakeQuestionIndex.value = targetIndex
  currentQuestionIndex.value = targetIndex
  persistProgress()
  questionStartedAt.value = Date.now()
  restartPerQuestionTimer()

  screenReaderStatus.value = `Retake started for question ${targetIndex + 1}.`
  window.$toast?.info?.(`Retry question ${targetIndex + 1}.`)
}

function skipRetakesAndSubmit() {
  retakeModalDismissed.value = true
  retakeModalVisible.value = false
  submitQuiz()
}

async function submitQuiz() {
  clearPerQuestionTimer()
  questionTimeRemaining.value = null
  accumulateTimeForCurrent()
  if (timer) {
    clearInterval(timer)
  }

  try {
    const elapsed = typeof timeElapsed.value === 'number' ? timeElapsed.value : 0
    if (quiz.value?.id && (await cloudQuizService.isAuthenticated())) {
      const userAnswers = (quiz.value.questions || []).map((_, idx) => answers.value[idx] || null)
      await cloudQuizService.saveQuizAttempt(quiz.value.id, {
        score: score.value,
        timeSeconds: elapsed,
        userAnswers,
        questionTimesMs: questionTimesMs.value
      })
    }
  } catch (error) {
    console.error('Error saving quiz attempt:', error)
  }

  clearProgress()
  screenReaderStatus.value = 'Quiz submitted. Preparing results.'
  router.push({ name: 'quiz-results', params: { quizId: route.params.quizId || quiz.value?.id } })
}

// restartQuiz removed; navigation goes to results page instead

function startQuiz() {
  resetDeferredRetakeState()
  quizStage.value = 'countdown'
  // Start quiz after animation plays (4 seconds)
  countdownTimeout = setTimeout(() => {
    quizStage.value = 'active'
    startTimer()
    questionStartedAt.value = Date.now()
  }, 4000)
}

function goHome() {
  router.push('/upload')
}

function goToUpload() {
  router.push('/upload')
}

function handleVoiceAnswer(answer) {
  console.log('Voice answer received:', answer, 'Current question:', currentQuestionIndex.value)
  selectAnswer(answer)
  window.$toast?.success('Answer recorded via voice')
  screenReaderStatus.value = `Answer recorded via voice for question ${currentQuestionIndex.value + 1}.`


  setTimeout(() => {
    console.log('Auto-advancing from question', currentQuestionIndex.value, 'to next question')
    if (currentQuestionIndex.value < totalQuestions.value - 1) {
      nextQuestion()
    } else {

      console.log('Last question reached, submitting quiz')
      attemptFinishQuiz({ auto: true })
    }
  }, 1500)
}

function handleVoiceError(error) {
  window.$toast?.error(`Voice error: ${error}`)
}

function handleVoiceStatusChange(status) {
  if (status === 'active') {
    isVoiceEnabled.value = true
  } else if (status === 'inactive') {
    isVoiceEnabled.value = false
  }
}

function handleEnumerationAnswerUpdate(value) {
  recordAnswerForCurrent(value)
}

function updateWindowWidth() {
  if (typeof window === 'undefined') return
  windowWidth.value = window.innerWidth
}

function persistProgress() {
  if (!storageKey.value) return
  try {
    const payload = {
      answers: answers.value,
      currentQuestionIndex: currentQuestionIndex.value
    }
    localStorage.setItem(storageKey.value, JSON.stringify(payload))
  } catch {}
}

function restoreProgress() {
  if (!storageKey.value) return
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.answers && typeof saved.answers === 'object') {
      answers.value = { ...saved.answers }
    }
    if (typeof saved.currentQuestionIndex === 'number' && quiz.value?.questions?.length) {
      currentQuestionIndex.value = Math.min(
        saved.currentQuestionIndex,
        quiz.value.questions.length - 1
      )
    }
  } catch {}
}

function clearProgress() {
  if (!storageKey.value) return
  try {
    localStorage.removeItem(storageKey.value)
  } catch {}
  resetDeferredRetakeState()
}

function formatQuestionType(type) {
  const typeMap = {
    'multiple_choice': 'Multiple Choice',
    'true_false': 'True/False',
    'identification': 'Identification',
    'enumeration': 'Enumeration'
  }
  return typeMap[type] || 'Question'
}
</script>

<template>
  <div class="quiz-page">
    <!-- <div class="sr-status" aria-live="polite">{{ screenReaderStatus }}</div> -->

    <Transition name="fade">
      <div
        v-if="retakeModalVisible"
        class="retake-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="retake-modal-title"
      >
        <div class="retake-modal">
          <div class="retake-modal-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M21 12a9 9 0 1 1-9-9" />
              <polyline points="21 3 21 12 12 12" />
            </svg>
          </div>
          <h3 id="retake-modal-title" class="retake-modal-title">Retake opportunity unlocked</h3>
          <p class="retake-modal-copy">
            You earned
            <strong>{{ retakePointsAvailable }}</strong>
            retake {{ retakePointsAvailable === 1 ? 'chance' : 'chances' }}.
          </p>
          <p class="retake-modal-subcopy">
            We will randomly reopen
            {{ retakeEligibleCount === 1 ? 'the' : 'one of the' }}
            {{ retakeEligibleCount }}
            question{{ retakeEligibleCount === 1 ? '' : 's' }} you missed or got wrong.
          </p>
          <div class="retake-modal-actions">
            <button
              class="retake-skip-btn"
              type="button"
              @click="skipRetakesAndSubmit"
            >
              Skip & finish
            </button>
            <button
              class="retake-start-btn"
              type="button"
              @click="startDeferredRetake"
            >
              Retake question
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Overview Screen -->
    <div v-if="quizStage === 'overview'" class="quiz-overview">
      <div class="overview-content">
        <div class="overview-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        <h1 class="overview-title">{{ quiz?.title || 'Quiz' }}</h1>
        <p class="overview-description">{{ quiz?.description || 'Test your knowledge' }}</p>

        <div class="overview-stats">
          <div class="stat-item">
            <div class="stat-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ totalQuestions }}</span>
              <span class="stat-label">Questions</span>
            </div>
          </div>

          <div class="stat-item">
            <div class="stat-icon">
              <Clock :size="24" />
            </div>
            <div class="stat-content">
              <span class="stat-value">~{{ Math.ceil(totalQuestions * 1.5) }}m</span>
              <span class="stat-label">Est. Time</span>
            </div>
          </div>
        </div>

        <button @click="startQuiz" class="start-quiz-btn">
          <Play :size="20" />
          Start Quiz
        </button>
      </div>
    </div>

    <!-- Countdown Overlay -->
    <div v-if="quizStage === 'countdown'" class="countdown-overlay">
      <div class="countdown-content">
        <DotLottieVue
          src="https://lottie.host/28b0b7a5-3b6a-4642-99d7-922f09c7b97a/XVIKM8XHHC.lottie"
          style="width: 300px; height: 300px"
          autoplay
          loop
        />
      </div>
    </div>


    <!-- Active Quiz -->
    <Transition name="quiz-enter">
      <div v-if="quizStage === 'active'" class="quiz-container">
        <!-- Minimal Sticky Header -->
        <div class="quiz-header-minimal">
          <div class="header-left">
            <button class="icon-btn back-btn" @click="goHome" title="Exit Quiz">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="m19 12H5" />
              </svg>
            </button>
            <div class="quiz-breadcrumb">
              <span class="quiz-title-small">{{ quiz?.title || 'Quiz' }}</span>
            </div>
          </div>
        </div>

      <!-- Two-Column Grid Layout -->
      <div class="quiz-active-layout">
        <!-- Sidebar -->
        <div class="quiz-sidebar">
          <!-- Progress Circle -->
          <div class="progress-circle-large">
            <svg class="progress-svg" viewBox="0 0 120 120">
              <circle
                class="progress-bg"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                stroke-width="8"
              />
              <circle
                class="progress-fill-circle"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#gradient)"
                stroke-width="8"
                :stroke-dasharray="339.292"
                :stroke-dashoffset="339.292 - (339.292 * progress) / 100"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color: #667eea; stop-opacity: 1" />
                  <stop offset="100%" style="stop-color: #764ba2; stop-opacity: 1" />
                </linearGradient>
              </defs>
            </svg>
            <div class="progress-center">
              <div class="progress-number">{{ currentQuestionIndex + 1 }}</div>
              <div class="progress-total">of {{ totalQuestions }}</div>
            </div>
          </div>

          <!-- Timer Card -->
          <div class="timer-card">
            <div class="timer-icon">
              <Clock :size="20" />
            </div>
            <div class="timer-info">
              <div class="timer-label">Time Elapsed</div>
              <div class="timer-value">{{ timeFormatted }}</div>
            </div>
            <div
              v-if="isTimedQuiz"
              class="timer-info per-question"
              :class="{ danger: questionCountdownForUi <= 5 }"
            >
              <div class="timer-label">Per Question</div>
              <div class="timer-value">{{ perQuestionTimerFormatted }}</div>
              <div class="timer-subtext">Auto-advance</div>
            </div>
          </div>

          <!-- Linear Progress Bar -->
          <div class="linear-progress-card">
            <div class="progress-header">
              <span class="progress-label">Progress</span>
              <span class="progress-count">{{ Object.keys(answers).length }} of {{ totalQuestions }} answered</span>
            </div>
            <div class="linear-progress-bar">
              <div
                class="linear-progress-fill"
                :style="{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Voice Control Card -->
          <div class="voice-control-card">
            <div class="voice-header">
              <div class="voice-title">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <span>Voice Input</span>
              </div>
            </div>
            <div class="voice-component">
              <VoiceQuiz
                :question="currentQuestion"
                :question-number="currentQuestionIndex + 1"
                :is-enabled="isVoiceEnabled"
                @answer-selected="handleVoiceAnswer"
                @error="handleVoiceError"
                @status-change="handleVoiceStatusChange"
              />
            </div>
          </div>
        </div>

        <!-- Main Question Area -->
        <div class="quiz-content">
        <div class="question-section">
          <div class="question-card-enhanced">
            <!-- Question Meta -->
            <div class="question-meta">
              <span class="question-type-badge">
                {{ formatQuestionType(currentQuestion?.type) }}
              </span>
              <span class="question-number-badge">
                Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
              </span>
              <span
                v-if="isTimedQuiz"
                class="question-timer-chip"
                :class="{ danger: questionCountdownForUi <= 5 }"
              >
                ⏱ {{ perQuestionTimerFormatted }}
              </span>
            </div>

            <!-- Question Text -->
            <h2 class="question-text-large">
              {{ currentQuestion?.question }}
            </h2>

            <!-- Voice Listening Indicator -->
            <div v-if="isVoiceEnabled" class="voice-listening-indicator">
              <div class="voice-wave-animation">
                <span class="wave"></span>
                <span class="wave"></span>
                <span class="wave"></span>
              </div>
              <span class="voice-text">Voice input active - speak your answer</span>
            </div>

            <!-- Answer Area -->
            <div class="answer-area">

            <!-- Multiple Choice and True/False Questions -->
            <div
              v-if="
                currentQuestion?.type === 'multiple_choice' ||
                currentQuestion?.type === 'true_false'
              "
              class="choices-enhanced"
            >
              <button
                v-for="(choice, index) in currentQuestion?.choices"
                :key="index"
                class="choice-button"
                :class="{ selected: answers[currentQuestionIndex] === choice }"
                @click="selectAnswer(choice)"
                type="button"
              >
                <span class="choice-key">{{ String.fromCharCode(65 + index) }}</span>
                <span class="choice-text">{{ choice }}</span>
                <span class="choice-check">
                  <CheckCircle v-if="answers[currentQuestionIndex] === choice" :size="20" />
                </span>
              </button>
            </div>

            <!-- Identification (Fill-in-the-blank) Questions -->
            <div
              v-else-if="currentQuestion?.type === 'identification'"
              class="input-enhanced"
            >
              <div class="input-group">
                <label for="identification-answer" class="input-label">Your Answer:</label>
                <input
                  id="identification-answer"
                  type="text"
                  v-model="answers[currentQuestionIndex]"
                  class="text-input-large"
                  placeholder="Type your answer here..."
                  @input="selectAnswer($event.target.value)"
                  autofocus
                />
              </div>
            </div>

            <!-- Enumeration (List multiple answers) Questions -->
            <EnumerationInput
              v-else-if="currentQuestion?.type === 'enumeration'"
              :question="currentQuestion"
              :question-index="currentQuestionIndex"
              :model-value="answers[currentQuestionIndex] || []"
              @update:model-value="handleEnumerationAnswerUpdate"
            />
            </div>

            <!-- Navigation Actions -->
            <div class="question-actions">
              <div class="spacer"></div>

              <button
                v-if="currentQuestionIndex < totalQuestions - 1"
                class="nav-btn-primary"
                @click="nextQuestion"
                :disabled="!isCurrentQuestionAnswered"
              >
                Next Question
                <ArrowRight :size="16" />
              </button>

              <button
                v-else
                class="nav-btn-submit"
                @click="handleSubmitClick"
                :disabled="!isCurrentQuestionAnswered"
              >
                <CheckCircle :size="16" />
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.quiz-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  position: relative;
}

.quiz-container {
  position: relative;
  z-index: 1;
}

/* Minimal Sticky Header */
.quiz-header-minimal {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border-radius: 0 0 20px 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.icon-btn:hover {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.quiz-breadcrumb {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
}

.quiz-title-small {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .quiz-header-minimal {
    background: rgba(15, 23, 42, 0.98) !important;
    border-bottom: 1px solid #334155 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }

  .icon-btn {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #475569 !important;
    color: #e2e8f0 !important;
  }

  .icon-btn:hover {
    background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
    border-color: #64748b !important;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4) !important;
  }

  .quiz-breadcrumb {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #475569 !important;
  }

  .quiz-title-small {
    color: #f1f5f9 !important;
  }

  /* Sidebar Cards */
  .progress-circle-large,
  .timer-card,
  .linear-progress-card,
  .voice-control-card {
    background: #1e293b !important;
    border-color: #334155 !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
  }

  .progress-bg {
    stroke: #334155 !important;
  }

  .progress-number {
    color: #f1f5f9 !important;
  }

  .progress-total {
    color: #94a3b8 !important;
  }

  .timer-label,
  .progress-label {
    color: #94a3b8 !important;
  }

  .timer-value,
  .progress-count {
    color: #f1f5f9 !important;
  }

  .voice-title {
    color: #f1f5f9 !important;
  }

  /* Timer icon keeps its gradient in dark mode */
  .timer-icon {
    background: var(--gradient-primary) !important;
  }

  .linear-progress-bar {
    background: #334155 !important;
  }

  .linear-progress-fill {
    background: var(--gradient-primary) !important;
  }

  /* Keep question type badge vibrant */
  .question-type-badge {
    background: var(--gradient-primary) !important;
    color: var(--color-text-on-primary) !important;
  }

  /* Question Card */
  .question-card-enhanced {
    background: #1e293b !important;
    border-color: #334155 !important;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3) !important;
  }

  .question-number-badge {
    color: #94a3b8 !important;
  }

  .question-text-large {
    color: #f1f5f9 !important;
  }

  .voice-listening-indicator {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #667eea !important;
  }

  .voice-text {
    color: #818cf8 !important;
  }

  /* Choice Buttons */
  .choice-button {
    background: #1e293b !important;
    border-color: #334155 !important;
  }

  .choice-button:hover {
    border-color: #667eea !important;
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2) !important;
  }

  .choice-button.selected {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #667eea !important;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3) !important;
  }

  .choice-key {
    background: #334155 !important;
    color: #94a3b8 !important;
  }

  .choice-button.selected .choice-key {
    background: #667eea !important;
    color: var(--color-text-on-primary) !important;
  }

  .choice-text {
    color: #e2e8f0 !important;
  }

  /* Input Fields */
  .text-input-large,
  .text-area-large {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
  }

  .text-input-large:focus,
  .text-area-large:focus {
    border-color: #667eea !important;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2) !important;
  }

  .text-input-large::placeholder,
  .text-area-large::placeholder {
    color: #64748b !important;
  }

  .input-label {
    color: #e2e8f0 !important;
  }

  .enumeration-preview {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #475569 !important;
    color: #818cf8 !important;
  }

  .enumeration-preview small {
    color: #818cf8 !important;
  }

  .enumeration-hint {
    color: #94a3b8 !important;
  }

  /* Navigation Buttons */
  .question-actions {
    border-top-color: #334155 !important;
  }

  .retake-modal {
    background: #0f172a !important;
    border-color: #1e293b !important;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6) !important;
  }

  .retake-modal-title {
    color: #f8fafc !important;
  }

  .retake-modal-copy {
    color: #e2e8f0 !important;
  }

  .retake-modal-subcopy {
    color: #94a3b8 !important;
  }

  .retake-skip-btn {
    background: #1e293b !important;
    color: #f8fafc !important;
  }

  /* Overview Screen */
  .overview-content {
    background: #1e293b !important;
    border-color: #334155 !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4) !important;
  }

  .overview-description {
    color: #94a3b8 !important;
  }

  .stat-item {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
    border-color: #475569 !important;
  }

  .stat-value {
    color: #f1f5f9 !important;
  }

  .stat-label {
    color: #94a3b8 !important;
  }

  /* Countdown Overlay */
  .countdown-overlay {
    background: rgba(15, 23, 42, 0.9) !important;
  }

  /* Results Section (if visible) */
  .results-section {
    background: #1e293b !important;
    border-color: #334155 !important;
  }

  .results-header h2 {
    color: #f1f5f9 !important;
  }

  .results-subtitle {
    color: #94a3b8 !important;
  }

  .stat-card {
    background: #1e293b !important;
    border-color: #334155 !important;
  }

  .stat-card.correct {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%) !important;
    border-color: #059669 !important;
  }

  .stat-card.incorrect {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%) !important;
    border-color: #dc2626 !important;
  }

  .stat-card.time {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%) !important;
    border-color: #2563eb !important;
  }

  .review-item {
    background: #1e293b !important;
    border-color: #334155 !important;
  }

  .review-question {
    color: #f1f5f9 !important;
  }

  .answer-value {
    color: #e2e8f0 !important;
  }

  .detailed-results {
    background: #1e293b !important;
    border-color: #334155 !important;
  }
}

/* Two-Column Grid Layout */
.quiz-active-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px 32px;
  min-height: calc(100vh - 120px);
}

/* Sidebar Styles */
.quiz-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 100px;
  height: fit-content;
}

/* Quiz Overview Screen */
.quiz-overview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48px 24px;
}

.overview-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
  background: white;
  border-radius: 24px;
  padding: 64px 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
}

.overview-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.overview-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.overview-description {
  font-size: 18px;
  color: #6b7280;
  margin: 0 0 48px;
  line-height: 1.6;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  border-radius: 16px;
  border: 2px solid #e0e7ff;
}

.stat-icon {
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

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.start-quiz-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.start-quiz-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
}

.start-quiz-btn:active {
  transform: translateY(0);
}

/* Countdown Overlay */
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.countdown-content {
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.retake-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
}

.retake-modal {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
  border: 1px solid #e2e8f0;
  text-align: center;
}

.retake-modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retake-modal-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #0f172a;
}

.retake-modal-copy {
  margin-bottom: 8px;
  font-size: 16px;
  color: #334155;
}

.retake-modal-subcopy {
  margin-bottom: 24px;
  font-size: 14px;
  color: #64748b;
}

.retake-modal-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.retake-skip-btn,
.retake-start-btn {
  flex: 1;
  min-width: 160px;
  border-radius: 999px;
  padding: 14px 20px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.retake-skip-btn {
  background: #e2e8f0;
  color: #0f172a;
}

.retake-skip-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
}

.retake-start-btn {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  color: #fff;
  box-shadow: 0 12px 30px rgba(249, 115, 22, 0.35);
}

.retake-start-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 36px rgba(249, 115, 22, 0.45);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Quiz entrance animation */
.quiz-enter-enter-active {
  animation: quizScaleIn 0.5s ease-out;
}

@keyframes quizScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Progress Circle Large */
.progress-circle-large {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.progress-svg {
  width: 120px;
  height: 120px;
  transform: rotate(-90deg);
}

.progress-bg {
  transition: stroke-dashoffset 0.5s ease-in-out;
}

.progress-fill-circle {
  transition: stroke-dashoffset 0.5s ease-in-out;
}

.progress-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-number {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.progress-total {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-top: 4px;
}

/* Timer Card */
.timer-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.timer-icon {
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

.timer-info {
  flex: 1;
}

.timer-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.timer-value {
  font-size: 24px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

/* Linear Progress Card */
.linear-progress-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-count {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
}

.linear-progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.linear-progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
  border-radius: 4px;
}

/* Voice Control Card */
.voice-control-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.voice-header {
  margin-bottom: 16px;
}

.voice-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.voice-title svg {
  color: #667eea;
}

.quiz-header {
  background: white;
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
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

.quiz-title {
  flex: 1;
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
  align-items: center;
  gap: 16px;
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

.voice-controls {
  display: flex;
  justify-content: center;
  align-items: center;
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
  display: flex;
  flex-direction: column;
}

.question-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Enhanced Question Card */
.question-card-enhanced {
  background: white;
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f5f9;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

/* Question Meta */
.question-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.question-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.question-number-badge {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

/* Question Text Large */
.question-text-large {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a1a;
  margin: 0 0 40px 0;
}

/* Voice Listening Indicator */
.voice-listening-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  border: 2px solid #667eea;
  border-radius: 12px;
  margin-bottom: 24px;
}

.voice-wave-animation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.voice-wave-animation .wave {
  width: 3px;
  height: 16px;
  background: #667eea;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.voice-wave-animation .wave:nth-child(2) {
  animation-delay: 0.1s;
}

.voice-wave-animation .wave:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.5);
  }
}

.voice-text {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

/* Answer Area */
.answer-area {
  flex: 1;
  margin-bottom: 32px;
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

/* Enhanced Choice Buttons */
.choices-enhanced {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.choice-button {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  text-align: left;
  font-family: inherit;
  width: 100%;
}

.choice-button:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.12);
}

.choice-button.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.choice-key {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border-radius: 10px;
  font-weight: 700;
  font-size: 18px;
  color: #6b7280;
  transition: all 0.2s;
  flex-shrink: 0;
}

.choice-button.selected .choice-key {
  background: #667eea;
  color: white;
}

.choice-text {
  flex: 1;
  font-size: 16px;
  color: #374151;
  font-weight: 500;
  line-height: 1.5;
}

.choice-check {
  display: flex;
  align-items: center;
  color: #667eea;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s;
  flex-shrink: 0;
}

.choice-button.selected .choice-check {
  opacity: 1;
  transform: scale(1);
}

/* Question Actions (Navigation) */
.question-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.spacer {
  flex: 1;
}

.nav-btn-primary,
.nav-btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  font-family: inherit;
}

.nav-btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.nav-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.nav-btn-submit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.nav-btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.nav-btn-primary:disabled,
.nav-btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
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

/* Responsive Breakpoints */

/* Tablet and Small Desktop (768px - 1024px) */
@media (max-width: 1024px) {
  .quiz-active-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .quiz-sidebar {
    position: relative;
    top: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .progress-circle-large {
    grid-column: 1 / -1;
  }

  .voice-control-card {
    grid-column: 1 / -1;
  }

  .question-card-enhanced {
    padding: 40px;
    min-height: 500px;
  }

  .question-text-large {
    font-size: 28px;
  }
}

/* Mobile (≤ 768px) */
@media (max-width: 768px) {
  .quiz-page {
    padding: 16px;
  }

  .quiz-header-minimal {
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: 0 0 16px 16px;
  }

  .quiz-breadcrumb {
    padding: 6px 12px;
  }

  .quiz-title-small {
    font-size: 14px;
    max-width: 200px;
  }

  .icon-btn {
    width: 38px;
    height: 38px;
  }

  .quiz-active-layout {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0 16px 16px;
  }

  .quiz-sidebar {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .progress-circle-large {
    padding: 20px;
  }

  .progress-svg {
    width: 100px;
    height: 100px;
  }

  .progress-number {
    font-size: 28px;
  }

  .timer-card {
    padding: 16px;
  }

  .timer-icon {
    width: 40px;
    height: 40px;
  }

  .timer-value {
    font-size: 20px;
  }

  .linear-progress-card {
    padding: 16px;
  }

  .voice-control-card {
    padding: 16px;
  }

  .question-card-enhanced {
    padding: 24px;
    min-height: auto;
  }

  .question-text-large {
    font-size: 24px;
    margin-bottom: 24px;
  }

  .choice-button {
    padding: 16px 20px;
    gap: 16px;
  }

  .choice-key {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .choice-text {
    font-size: 15px;
  }

  .question-actions {
    flex-direction: column;
    gap: 12px;
  }

  .spacer {
    display: none;
  }

  .nav-btn-primary,
  .nav-btn-submit {
    width: 100%;
    justify-content: center;
    padding: 14px 24px;
    font-size: 15px;
  }

  .text-input-large {
    font-size: 16px;
    padding: 14px 16px;
  }

  .text-area-large {
    font-size: 15px;
    padding: 14px 16px;
    min-height: 100px;
  }

  .overview-content {
    padding: 48px 32px;
  }

  .overview-title {
    font-size: 36px;
  }

  .overview-icon {
    width: 100px;
    height: 100px;
  }

  .overview-stats {
    grid-template-columns: 1fr;
    gap: 16px;
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

/* Small Mobile (≤ 480px) */
@media (max-width: 480px) {
  .quiz-page {
    padding: 12px;
  }

  .quiz-header-minimal {
    padding: 10px 12px;
    margin-bottom: 16px;
    border-radius: 0 0 14px 14px;
  }

  .quiz-breadcrumb {
    padding: 5px 10px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
  }

  .quiz-title-small {
    font-size: 13px;
    max-width: 150px;
  }

  .quiz-active-layout {
    padding: 0 12px 12px;
    gap: 16px;
  }

  .progress-circle-large {
    padding: 16px;
  }

  .progress-svg {
    width: 90px;
    height: 90px;
  }

  .progress-number {
    font-size: 24px;
  }

  .progress-total {
    font-size: 12px;
  }

  .timer-card,
  .linear-progress-card,
  .voice-control-card {
    padding: 14px;
  }

  .timer-icon {
    width: 36px;
    height: 36px;
  }

  .timer-value {
    font-size: 18px;
  }

  .timer-label,
  .progress-label,
  .progress-count {
    font-size: 11px;
  }

  .question-card-enhanced {
    padding: 20px;
  }

  .question-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .question-type-badge {
    font-size: 11px;
    padding: 6px 12px;
  }

  .question-number-badge {
    font-size: 12px;
  }

  .question-text-large {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .voice-listening-indicator {
    padding: 12px 16px;
    font-size: 12px;
  }

  .choice-button {
    padding: 14px 16px;
    gap: 12px;
  }

  .choice-key {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .choice-text {
    font-size: 14px;
  }

  .nav-btn-primary,
  .nav-btn-submit {
    padding: 12px 20px;
    font-size: 14px;
  }

  .text-input-large {
    font-size: 15px;
    padding: 12px 14px;
  }

  .text-area-large {
    font-size: 14px;
    padding: 12px 14px;
    min-height: 90px;
  }

  .input-label {
    font-size: 14px;
  }

  .overview-content {
    padding: 32px 24px;
  }

  .overview-title {
    font-size: 28px;
  }

  .overview-description {
    font-size: 16px;
  }

  .overview-icon {
    width: 80px;
    height: 80px;
  }

  .stat-item {
    padding: 16px;
  }

  .stat-value {
    font-size: 24px;
  }

  .start-quiz-btn {
    padding: 16px 32px;
    font-size: 16px;
  }

  .results-section {
    padding: 20px 16px;
  }

  .results-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
  }

  .results-actions {
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .detailed-results {
    padding: 16px;
  }

  .review-item {
    padding: 16px;
  }

  .answer-row {
    flex-direction: column;
    gap: 6px;
  }

  .answer-label {
    min-width: auto;
    font-size: 12px;
  }

  .answer-value {
    font-size: 13px;
  }
}

/* Enhanced Input Styles */
.input-enhanced,
.enumeration-enhanced {
  width: 100%;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-label {
  font-weight: 600;
  color: #374151;
  font-size: 16px;
  margin-bottom: 8px;
}

.text-input-large {
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 18px;
  transition: all 0.2s ease;
  background: #fff;
  font-family: inherit;
  width: 100%;
}

.text-input-large:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.text-area-large {
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;
  background: #fff;
  width: 100%;
  line-height: 1.6;
}

.text-area-large:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.enumeration-preview {
  margin-top: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  font-size: 13px;
  color: #667eea;
}

.enumeration-preview small {
  color: #667eea;
  font-style: italic;
  font-weight: 500;
}

.enumeration-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}
</style>
