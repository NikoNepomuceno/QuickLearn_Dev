<script setup>
import { computed } from 'vue'
import { TrendingUp, Target } from 'lucide-vue-next'

const props = defineProps({
  asked: {
    type: Number,
    default: 0
  },
  correct: {
    type: Number,
    default: 0
  },
  maxQuestions: {
    type: Number,
    default: 20
  },
  currentDifficulty: {
    type: String,
    default: 'medium',
    validator: (value) => ['easy', 'medium', 'hard'].includes(value)
  },
  wrongStreak: {
    type: Number,
    default: 0
  }
})

const difficultyConfig = {
  easy: {
    label: 'Easy',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  medium: {
    label: 'Medium',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  hard: {
    label: 'Hard',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }
}

const progressPercent = computed(() => {
  if (!props.maxQuestions) return 0
  return Math.round((props.asked / props.maxQuestions) * 100)
})

const accuracy = computed(() => {
  if (props.asked === 0) return 0
  return Math.round((props.correct / props.asked) * 100)
})
</script>

<template>
  <div class="progress-header">
    <div class="header-content">
      <div class="stats-section">
        <div class="stat-card">
          <Target :size="16" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-value">{{ asked }} / {{ maxQuestions }}</div>
            <div class="stat-label">Questions</div>
          </div>
        </div>
        
        <div class="stat-card">
          <TrendingUp :size="16" class="stat-icon" />
          <div class="stat-content">
            <div class="stat-value">{{ accuracy }}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
        </div>

        <div 
          class="difficulty-badge"
          :style="{ background: difficultyConfig[currentDifficulty].gradient }"
        >
          {{ difficultyConfig[currentDifficulty].label }}
        </div>

        <div v-if="wrongStreak >= 2" class="streak-indicator">
          <span class="streak-icon">🔥</span>
          <span class="streak-text">{{ wrongStreak }} wrong</span>
        </div>
      </div>
    </div>

    <div class="progress-bar-container">
      <div 
        class="progress-bar" 
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.progress-header {
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.header-content {
  margin-bottom: 16px;
}

.stats-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8faff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.stat-icon {
  color: #667eea;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.difficulty-badge {
  padding: 8px 16px;
  border-radius: 999px;
  color: white;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.streak-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}

.streak-icon {
  font-size: 14px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #e6e8ec;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 999px;
}

@media (max-width: 768px) {
  .progress-header {
    padding: 16px;
  }

  .stats-section {
    gap: 10px;
  }

  .stat-card {
    padding: 8px 10px;
  }

  .stat-value {
    font-size: 14px;
  }

  .stat-label {
    font-size: 10px;
  }

  .difficulty-badge {
    padding: 6px 12px;
    font-size: 11px;
  }

  .streak-indicator {
    padding: 6px 10px;
    font-size: 12px;
  }
}

/* Dark mode */
body.dark .progress-header {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .stat-card {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .stat-value {
  color: #e5e7eb;
}

body.dark .stat-label {
  color: #9ca3af;
}

body.dark .progress-bar-container {
  background: #1f2a44;
}

body.dark .streak-indicator {
  background: #1f172a;
  border-color: #991b1b;
  color: #fca5a5;
}
</style>

