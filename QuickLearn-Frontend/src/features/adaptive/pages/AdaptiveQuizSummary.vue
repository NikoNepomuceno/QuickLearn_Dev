<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdaptiveSessionStore } from '../store/adaptiveSession.store'
import Sidebar from '../../../components/Sidebar.vue'
import { Trophy, Target, TrendingUp, Clock, Home, Share2, RotateCcw } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useAdaptiveSessionStore()

const summary = ref(null)
const isLoading = ref(true)

const accuracy = computed(() => {
  if (!summary.value || summary.value.asked === 0) return 0
  return Math.round((summary.value.correct / summary.value.asked) * 100)
})

const durationText = computed(() => {
  if (!summary.value?.durationMs) return '0 min'
  const minutes = Math.floor(summary.value.durationMs / 60000)
  const seconds = Math.floor((summary.value.durationMs % 60000) / 1000)
  return minutes > 0 ? `${minutes} min ${seconds}s` : `${seconds}s`
})

const performanceLevel = computed(() => {
  const acc = accuracy.value
  if (acc >= 80) return { label: 'Excellent', color: '#10b981' }
  if (acc >= 60) return { label: 'Good', color: '#f59e0b' }
  return { label: 'Keep Practicing', color: '#ef4444' }
})

onMounted(async () => {
  const sessionId = route.params.sessionId
  
  if (!sessionId) {
    window.$toast?.error('No session ID provided')
    router.push('/upload')
    return
  }

  try {
    // If we don't have summary yet, finish the session
    if (store.sessionId !== sessionId || !store.isCompleted) {
      await store.resumeSession(sessionId)
      const result = await store.finishSession()
      summary.value = result.summary
    } else {
      // Use existing data from store
      summary.value = {
        asked: store.stats.asked,
        correct: store.stats.correct,
        wrongStreakMax: store.stats.wrongStreak,
        trajectory: [],
        finishedAt: new Date(),
        durationMs: 0
      }
    }
  } catch (error) {
    console.error('Failed to load summary:', error)
    window.$toast?.error('Failed to load quiz summary')
  } finally {
    isLoading.value = false
  }
})

function handleGoHome() {
  store.reset()
  router.push('/upload')
}

function handleRetake() {
  store.reset()
  window.$toast?.info('Start a new quiz from the upload page')
  router.push('/upload')
}

function handleShare() {
  const shareText = `I just completed an adaptive quiz! 🎉\nScore: ${accuracy.value}%\nQuestions: ${summary.value?.asked || 0}\n\nTry QuickLearn today!`
  
  if (navigator.share) {
    navigator.share({
      title: 'My QuickLearn Results',
      text: shareText
    }).catch(() => {
      // Fallback to clipboard
      copyToClipboard(shareText)
    })
  } else {
    copyToClipboard(shareText)
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      window.$toast?.success('Results copied to clipboard!')
    })
  } else {
    window.$toast?.info('Sharing not supported on this device')
  }
}
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="summary-page">
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading your results...</p>
      </div>

      <div v-else-if="summary" class="summary-container">
        <div class="summary-header">
          <div class="trophy-icon">
            <Trophy :size="48" />
          </div>
          <h1>Quiz Complete!</h1>
          <p class="subtitle">Here's how you performed</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card big">
            <div class="stat-icon" :style="{ background: performanceLevel.color }">
              <Target :size="32" />
            </div>
            <div class="stat-content">
              <div class="stat-value big">{{ accuracy }}%</div>
              <div class="stat-label">Accuracy</div>
              <div class="performance-badge" :style="{ background: performanceLevel.color }">
                {{ performanceLevel.label }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <TrendingUp :size="24" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summary.asked }}</div>
              <div class="stat-label">Questions Answered</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon success">
              ✓
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summary.correct }}</div>
              <div class="stat-label">Correct Answers</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon error">
              ✕
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summary.asked - summary.correct }}</div>
              <div class="stat-label">Incorrect Answers</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <Clock :size="24" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ durationText }}</div>
              <div class="stat-label">Time Spent</div>
            </div>
          </div>

          <div v-if="summary.wrongStreakMax > 0" class="stat-card">
            <div class="stat-icon warning">
              🔥
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summary.wrongStreakMax }}</div>
              <div class="stat-label">Max Wrong Streak</div>
            </div>
          </div>
        </div>

        <div v-if="summary.trajectory && summary.trajectory.length > 0" class="trajectory-section">
          <h2>Difficulty Progression</h2>
          <div class="trajectory-chart">
            <div 
              v-for="(point, idx) in summary.trajectory" 
              :key="idx"
              class="trajectory-point"
              :class="point.difficulty"
              :title="`Question ${point.questionNumber}: ${point.difficulty}`"
            >
              <div class="point-marker"></div>
              <div class="point-label">{{ point.questionNumber }}</div>
            </div>
          </div>
          <div class="trajectory-legend">
            <span class="legend-item easy">Easy</span>
            <span class="legend-item medium">Medium</span>
            <span class="legend-item hard">Hard</span>
          </div>
        </div>

        <div class="actions-section">
          <button class="action-btn primary" @click="handleRetake">
            <RotateCcw :size="18" />
            Take Another Quiz
          </button>
          <button class="action-btn secondary" @click="handleShare">
            <Share2 :size="18" />
            Share Results
          </button>
          <button class="action-btn secondary" @click="handleGoHome">
            <Home :size="18" />
            Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.summary-page {
  flex: 1;
  padding: 24px;
  background:
    radial-gradient(1000px 600px at 20% -10%, rgba(102, 126, 234, 0.12), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118, 75, 162, 0.1), transparent 60%);
}

.loading-container {
  text-align: center;
  padding: 100px 20px;
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

.loading-container p {
  color: #6b7280;
  font-size: 16px;
}

.summary-container {
  max-width: 1000px;
  margin: 0 auto;
}

.summary-header {
  text-align: center;
  margin-bottom: 40px;
}

.trophy-icon {
  width: 96px;
  height: 96px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 12px 32px rgba(251, 191, 36, 0.4);
}

.summary-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.stat-card.big {
  grid-column: 1 / -1;
  padding: 32px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 24px;
  font-weight: 700;
}

.stat-card.big .stat-icon {
  width: 80px;
  height: 80px;
}

.stat-icon.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-value.big {
  font-size: 48px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.performance-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.trajectory-section {
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.trajectory-section h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 24px;
}

.trajectory-chart {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.trajectory-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.trajectory-point.easy .point-marker {
  background: #10b981;
}

.trajectory-point.medium .point-marker {
  background: #f59e0b;
}

.trajectory-point.hard .point-marker {
  background: #ef4444;
}

.point-label {
  font-size: 10px;
  color: #9ca3af;
}

.trajectory-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.legend-item::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-item.easy::before {
  background: #10b981;
}

.legend-item.medium::before {
  background: #f59e0b;
}

.legend-item.hard::before {
  background: #ef4444;
}

.actions-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
}

@media (max-width: 1024px) {
  .summary-page {
    padding-bottom: 120px;
  }
}

@media (max-width: 768px) {
  .summary-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  .summary-header h1 {
    font-size: 26px;
  }

  .trophy-icon {
    width: 80px;
    height: 80px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stat-card {
    padding: 20px;
  }

  .stat-value.big {
    font-size: 36px;
  }

  .trajectory-section {
    padding: 24px;
  }

  .actions-section {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Dark mode */
body.dark .summary-header h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

body.dark .stat-card {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .stat-value {
  color: #e5e7eb;
}

body.dark .stat-label {
  color: #9ca3af;
}

body.dark .trajectory-section {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .trajectory-section h2 {
  color: #e5e7eb;
}

body.dark .point-label {
  color: #6b7280;
}

body.dark .legend-item {
  color: #9ca3af;
}

body.dark .action-btn.secondary {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .action-btn.secondary:hover {
  background: #334155;
}

body.dark .loading-container p {
  color: #9ca3af;
}

body.dark .spinner {
  border-color: #1f2a44;
  border-top-color: #667eea;
}
</style>

