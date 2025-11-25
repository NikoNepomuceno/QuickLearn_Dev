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
    color: 'var(--color-difficulty-easy)',
    gradient: 'var(--gradient-success)'
  },
  medium: {
    label: 'Medium',
    color: 'var(--color-difficulty-medium)',
    gradient: 'var(--gradient-warning)'
  },
  hard: {
    label: 'Hard',
    color: 'var(--color-difficulty-hard)',
    gradient: 'var(--gradient-danger)'
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
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
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
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.difficulty-badge {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  color: var(--color-text-on-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: var(--shadow-sm);
}

.streak-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--color-difficulty-hard-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.streak-icon {
  font-size: 14px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--gradient-primary);
  transition: width var(--transition-slow);
  border-radius: var(--radius-pill);
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
  background: var(--color-surface);
  border-color: var(--color-border);
}

body.dark .stat-card {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .stat-value {
  color: var(--color-text);
}

body.dark .stat-label {
  color: var(--color-text-muted);
}

body.dark .progress-bar-container {
  background: var(--color-border);
}

body.dark .streak-indicator {
  background: var(--color-difficulty-hard-bg);
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>

