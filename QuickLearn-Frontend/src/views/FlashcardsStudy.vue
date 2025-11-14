<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import cloudQuizService from '@/services/cloudQuizService'

const route = useRoute()
const router = useRouter()
const flashcardsId = computed(() => route.params.id)

const isLoading = ref(true)
const errorMessage = ref('')
const title = ref('')
const cards = ref([])
const currentIndex = ref(0)
const isFlipped = ref(false)
const shuffledCards = ref([])
const showShortcuts = ref(false)

// Timer state
const timerSeconds = ref(0)
const isTimerRunning = ref(false)
const timerInterval = ref(null)
const sessionStartTime = ref(null)

const currentCard = computed(() => {
  const cardsToUse = shuffledCards.value.length > 0 ? shuffledCards.value : cards.value
  return cardsToUse[currentIndex.value] || null
})

const progress = computed(() => {
  const total = shuffledCards.value.length > 0 ? shuffledCards.value.length : cards.value.length
  if (total === 0) return 0
  return Math.round(((currentIndex.value + 1) / total) * 100)
})

const progressText = computed(() => {
  const total = shuffledCards.value.length > 0 ? shuffledCards.value.length : cards.value.length
  return `${currentIndex.value + 1} / ${total}`
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timerSeconds.value / 60)
  const seconds = timerSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const cardsStudied = computed(() => {
  return currentIndex.value + 1
})

const totalCards = computed(() => {
  return shuffledCards.value.length > 0 ? shuffledCards.value.length : cards.value.length
})

const averageTimePerCard = computed(() => {
  if (cardsStudied.value === 0) return 0
  return Math.round(timerSeconds.value / cardsStudied.value)
})

onMounted(async () => {
  await loadFlashcards()
  sessionStartTime.value = Date.now()
  startTimer()
  setupKeyboardShortcuts()
})

onUnmounted(() => {
  stopTimer()
  removeKeyboardShortcuts()
})

async function loadFlashcards() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await cloudQuizService.getFlashcards(flashcardsId.value)
    if (!data) {
      errorMessage.value = 'Flashcards not found.'
      return
    }
    title.value = data.title || 'Flashcards'
    cards.value = Array.isArray(data.cards) ? data.cards : []

    // Shuffle cards for study session
    shuffledCards.value = [...cards.value].sort(() => Math.random() - 0.5)
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to load flashcards.'
  } finally {
    isLoading.value = false
  }
}

function flipCard() {
  isFlipped.value = !isFlipped.value
}

function nextCard() {
  const total = shuffledCards.value.length > 0 ? shuffledCards.value.length : cards.value.length
  if (currentIndex.value < total - 1) {
    currentIndex.value++
    isFlipped.value = false
  }
}

function prevCard() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    isFlipped.value = false
  }
}

function startTimer() {
  if (timerInterval.value) return
  isTimerRunning.value = true
  timerInterval.value = setInterval(() => {
    timerSeconds.value++
  }, 1000)
}

function toggleShortcuts() {
  showShortcuts.value = !showShortcuts.value
}

function pauseTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
    isTimerRunning.value = false
  }
}

function resumeTimer() {
  if (!isTimerRunning.value && !timerInterval.value) {
    startTimer()
  }
}

function resetTimer() {
  pauseTimer()
  timerSeconds.value = 0
  startTimer()
}

function stopTimer() {
  pauseTimer()
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', handleKeyPress)
}

function removeKeyboardShortcuts() {
  window.removeEventListener('keydown', handleKeyPress)
}

function handleKeyPress(event) {
  // Don't trigger shortcuts when typing in inputs
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }

  switch (event.key) {
    case ' ':
      event.preventDefault()
      flipCard()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextCard()
      break
    case 'ArrowLeft':
      event.preventDefault()
      prevCard()
      break
    case '?':
      event.preventDefault()
      toggleShortcuts()
      break
  }
}

function restartSession() {
  currentIndex.value = 0
  isFlipped.value = false
  shuffledCards.value = [...cards.value].sort(() => Math.random() - 0.5)
  resetTimer()
}

const isAtEnd = computed(() => {
  const total = shuffledCards.value.length > 0 ? shuffledCards.value.length : cards.value.length
  return currentIndex.value >= total - 1
})

const isAtStart = computed(() => {
  return currentIndex.value === 0
})
</script>

<template>
  <AppShell
    :title="title || 'Study Flashcards'"
    subtitle="Review your flashcards"
    content-width="full"
  >
    <div class="flashcards-study-page">
      <div v-if="isLoading" class="loading-state">
        <p>Loading flashcards…</p>
      </div>

      <div v-else-if="errorMessage" class="error-state">
        <div class="error-card">
          <p>{{ errorMessage }}</p>
          <BaseButton variant="primary" size="sm" @click="router.back()">Go Back</BaseButton>
        </div>
      </div>

      <div v-else-if="cards.length === 0" class="empty-state">
        <div class="error-card">
          <p>No flashcards available to study.</p>
          <BaseButton variant="primary" size="sm" @click="router.back()">Go Back</BaseButton>
        </div>
      </div>

      <div v-else class="study-container">
      <!-- Simple Header -->
      <div class="study-header">
        <div class="header-content">
          <div class="header-left">
            <span class="question-label">Question {{ currentIndex + 1 }} of {{ totalCards }}</span>
          </div>
          <div class="header-right">
            <span class="answered-label">{{ currentIndex }} answered</span>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Main card display -->
      <div class="card-container">
        <div class="flashcard" @click="flipCard">
          <div class="card-content" :class="{ flipped: isFlipped }">
            <div class="card-face card-front">
              <div class="card-category" v-if="title">{{ title }}</div>
              <div class="card-question">{{ currentCard?.front || 'No question text' }}</div>
              <div class="card-hint">Click to reveal answer</div>
            </div>
            <div class="card-face card-back">
              <div class="card-category" v-if="title">{{ title }}</div>
              <div class="card-answer">{{ currentCard?.back || 'No answer text' }}</div>
              <div class="card-hint">Click to see question</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation controls -->
      <div class="navigation-controls">
        <button
          class="nav-btn-circle nav-btn-prev"
          :disabled="isAtStart"
          @click="prevCard"
          title="Previous"
        >
          <ChevronLeft :size="24" />
        </button>

        <button
          class="nav-btn-reset"
          @click="restartSession"
          title="Reset"
        >
          <RotateCcw :size="20" />
          <span>Reset</span>
        </button>

        <button
          class="nav-btn-circle nav-btn-next"
          :disabled="isAtEnd"
          @click="nextCard"
          title="Next"
        >
          <ChevronRight :size="24" />
        </button>
      </div>
    </div>
    </div>
  </AppShell>
</template>

<style scoped>
.flashcards-study-page {
  min-height: calc(100vh - 200px);
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
  margin: -24px -32px;
  padding: 24px 32px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.error-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  max-width: 500px;
}

.study-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Simple Header Styles */
.study-header {
  margin-bottom: 32px;
  padding: 0 8px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-left,
.header-right {
  color: #000000;
  font-size: 16px;
  font-weight: 600;
}

.question-label {
  color: #000000;
}

.answered-label {
  color: #000000;
}

.progress-bar-container {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 2px;
}

/* Card Styles */
.card-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  min-height: 400px;
}

.flashcard {
  width: 100%;
  max-width: 800px;
  min-height: 500px;
  cursor: pointer;
  perspective: 1200px;
  margin: 0 auto;
}

.card-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-content.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.card-back {
  transform: rotateY(180deg);
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.card-back .card-answer {
  color: white;
}

.card-back .card-category {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.card-back .card-hint {
  color: rgba(255, 255, 255, 0.9);
}

.card-category {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.12);
  color: #4f46e5;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-question,
.card-answer {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  line-height: 1.4;
  max-width: 100%;
  word-wrap: break-word;
  margin: 40px 0;
}

.card-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

/* Navigation Controls */
.navigation-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 32px 0;
}

.nav-btn-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: #4f46e5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn-circle:hover:not(:disabled) {
  background: white;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.nav-btn-circle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: #4f46e5;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn-reset:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

/* Dark mode adjustments */

body.dark .header-left,
body.dark .header-right,
body.dark .question-label,
body.dark .answered-label {
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

body.dark .progress-bar {
  background: rgba(255, 255, 255, 0.2);
}

body.dark .progress-fill {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}

body.dark .card-face {
  background: #1e293b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

body.dark .card-face.card-back {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  box-shadow: 0 20px 60px rgba(16, 185, 129, 0.3);
}

body.dark .card-question {
  color: #e5e7eb;
}

body.dark .card-back .card-answer {
  color: white;
}

body.dark .card-category {
  background: rgba(129, 140, 248, 0.2);
  color: #a5b4fc;
}

body.dark .card-back .card-category {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

body.dark .card-hint {
  color: #94a3b8;
}

body.dark .card-back .card-hint {
  color: rgba(255, 255, 255, 0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .study-container {
    padding: 16px;
  }

  .header-content {
    font-size: 14px;
  }

  .card-container {
    padding: 20px 0;
    min-height: 300px;
  }

  .flashcard {
    min-height: 400px;
  }

  .card-content {
    min-height: 400px;
  }

  .card-face {
    min-height: 400px;
    padding: 40px 24px;
  }

  .card-question,
  .card-answer {
    font-size: 24px;
  }

  .card-category {
    top: 16px;
    font-size: 12px;
    padding: 6px 12px;
  }

  .card-hint {
    bottom: 24px;
    font-size: 14px;
  }

  .navigation-controls {
    gap: 16px;
    padding: 24px 0;
  }

  .nav-btn-circle {
    width: 48px;
    height: 48px;
  }

  .nav-btn-reset {
    padding: 12px 20px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .study-container {
    padding: 12px;
  }

  .header-content {
    font-size: 13px;
  }

  .card-face {
    padding: 32px 20px;
  }

  .card-question,
  .card-answer {
    font-size: 20px;
  }

  .nav-btn-circle {
    width: 44px;
    height: 44px;
  }

  .nav-btn-reset {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>


