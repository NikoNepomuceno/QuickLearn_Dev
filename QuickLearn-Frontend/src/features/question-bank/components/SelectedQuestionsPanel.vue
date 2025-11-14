<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { CheckCircle2, ArrowRight, X } from 'lucide-vue-next'

const props = defineProps({
  selectedCount: {
    type: Number,
    default: 0
  },
  selectedQuestions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['clear-selection', 'build-quiz', 'remove-question'])

const canBuildQuiz = computed(() => {
  return props.selectedCount > 0
})

function handleBuildQuiz() {
  if (canBuildQuiz.value) {
    emit('build-quiz')
  }
}

function handleRemoveQuestion(questionId) {
  emit('remove-question', questionId)
}
</script>

<template>
  <BaseCard padding="lg" class="selected-panel">
    <div class="selected-panel__header">
      <div class="selected-panel__title">
        <CheckCircle2 :size="20" />
        <h3>Selected Questions</h3>
      </div>
      <span class="selected-panel__count">{{ selectedCount }}</span>
    </div>

    <div v-if="selectedCount === 0" class="selected-panel__empty">
      <p>No questions selected</p>
      <p class="selected-panel__hint">Select questions from the bank to build your custom quiz</p>
    </div>

    <div v-else class="selected-panel__content">
      <div class="selected-panel__list">
        <div
          v-for="question in selectedQuestions.slice(0, 5)"
          :key="question.id || question.uuid"
          class="selected-item"
        >
          <span class="selected-item__stem">
            {{ ((question.questionData?.stem || question.questionData?.question || question.stem || '').substring(0, 60)) }}...
          </span>
          <button
            class="selected-item__remove"
            @click.stop="handleRemoveQuestion(question.id || question.uuid)"
            aria-label="Remove question"
          >
            <X :size="14" />
          </button>
        </div>
        <div v-if="selectedCount > 5" class="selected-item selected-item--more">
          + {{ selectedCount - 5 }} more
        </div>
      </div>

      <div class="selected-panel__actions">
        <BaseButton
          variant="outline"
          size="sm"
          @click="$emit('clear-selection')"
        >
          Clear All
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          :disabled="!canBuildQuiz"
          @click="handleBuildQuiz"
        >
          Build Quiz
          <ArrowRight :size="16" />
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.selected-panel {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

.selected-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.selected-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.selected-panel__title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.selected-panel__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.selected-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-muted);
}

.selected-panel__empty p {
  margin: 0;
}

.selected-panel__hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-soft);
}

.selected-panel__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.selected-panel__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-subtle);
  font-size: 13px;
  color: var(--color-text);
}

.selected-item__stem {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-item__remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.selected-item__remove:hover {
  background: var(--color-danger);
  color: white;
}

.selected-item--more {
  justify-content: center;
  font-style: italic;
  color: var(--color-text-muted);
  border-style: dashed;
}

.selected-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.selected-panel__actions button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Dark mode */
body.dark .selected-item {
  background: var(--color-surface-emphasis);
  border-color: var(--color-border);
}
</style>

