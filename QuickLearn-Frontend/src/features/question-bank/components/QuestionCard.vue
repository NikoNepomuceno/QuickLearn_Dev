<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { CheckCircle2, Circle, Tag, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-selection'])

const difficultyColors = {
  easy: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', icon: TrendingDown },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: Minus },
  hard: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: TrendingUp }
}

const typeLabels = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  identification: 'Identification',
  enumeration: 'Enumeration'
}

const difficultyInfo = computed(() => {
  return difficultyColors[props.question.difficulty] || difficultyColors.medium
})

const questionStem = computed(() => {
  const qData = props.question.questionData || {}
  return qData.stem || qData.question || props.question.stem || 'No question text'
})

const truncatedStem = computed(() => {
  const stem = questionStem.value
  return stem.length > 150 ? stem.substring(0, 150) + '...' : stem
})

function handleClick() {
  emit('toggle-selection', props.question.id || props.question.uuid)
}
</script>

<template>
  <BaseCard
    :class="['question-card', { 'question-card--selected': selected }]"
    padding="md"
    :clickable="true"
    @click="handleClick"
  >
    <div class="question-card__header">
      <div class="question-card__selection">
        <CheckCircle2 v-if="selected" :size="20" class="question-card__check" />
        <Circle v-else :size="20" class="question-card__circle" />
      </div>
      <div class="question-card__badges">
        <span
          v-if="question.topic"
          class="question-badge question-badge--topic"
        >
          <Tag :size="12" />
          {{ question.topic }}
        </span>
        <span
          v-if="question.category"
          class="question-badge question-badge--category"
        >
          {{ question.category }}
        </span>
        <span
          class="question-badge question-badge--type"
        >
          {{ typeLabels[question.questionType] || question.questionType }}
        </span>
      </div>
    </div>

    <div class="question-card__body">
      <p class="question-card__stem">{{ truncatedStem }}</p>
    </div>

    <div class="question-card__footer">
      <span
        class="difficulty-badge"
        :style="{
          backgroundColor: difficultyInfo.bg,
          color: difficultyInfo.text
        }"
      >
        <component :is="difficultyInfo.icon" :size="12" />
        {{ question.difficulty || 'medium' }}
      </span>
      <span v-if="question.keywords && question.keywords.length > 0" class="keywords">
        {{ question.keywords.slice(0, 3).join(', ') }}
      </span>
    </div>
  </BaseCard>
</template>

<style scoped>
.question-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid var(--color-border);
  position: relative;
}

.question-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.question-card--selected {
  border-color: var(--color-primary);
  background: rgba(102, 126, 234, 0.05);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.question-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.question-card__selection {
  flex-shrink: 0;
  margin-top: 2px;
}

.question-card__check {
  color: var(--color-primary);
}

.question-card__circle {
  color: var(--color-text-muted);
}

.question-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.question-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-surface-emphasis);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.question-badge--topic {
  background: rgba(102, 126, 234, 0.1);
  color: var(--color-primary);
  border-color: rgba(102, 126, 234, 0.2);
}

.question-badge--category {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.2);
}

.question-badge--type {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.2);
}

.question-card__body {
  margin-bottom: 12px;
}

.question-card__stem {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}

.question-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.difficulty-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.keywords {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Dark mode */
body.dark .question-card {
  border-color: var(--color-border);
}

body.dark .question-card:hover {
  border-color: var(--color-primary);
}

body.dark .question-card--selected {
  background: rgba(102, 126, 234, 0.15);
}

body.dark .question-badge {
  background: var(--color-surface-emphasis);
  border-color: var(--color-border);
}
</style>

