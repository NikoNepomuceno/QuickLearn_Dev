<script setup>
import { ref, computed } from 'vue'
import { HelpCircle } from 'lucide-vue-next'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const selectedAnswer = ref(null)
const textAnswer = ref('')

const isMultipleChoice = computed(() => {
  return props.question.type === 'multiple_choice' || props.question.type === 'true_false'
})

const canSubmit = computed(() => {
  if (isMultipleChoice.value) {
    return selectedAnswer.value !== null
  }
  return textAnswer.value.trim().length > 0
})

function selectChoice(choiceId) {
  if (props.disabled) return
  selectedAnswer.value = choiceId
}

function handleSubmit() {
  if (!canSubmit.value || props.disabled) return
  
  const answer = isMultipleChoice.value 
    ? [selectedAnswer.value] 
    : textAnswer.value.trim()
  
  emit('submit', answer)
  
  // Reset for next question
  selectedAnswer.value = null
  textAnswer.value = ''
}
</script>

<template>
  <div class="question-card">
    <div class="question-header">
      <HelpCircle :size="20" class="question-icon" />
      <div class="question-meta">
        <span v-if="question.topic" class="question-topic">{{ question.topic }}</span>
      </div>
    </div>

    <div class="question-stem">
      {{ question.stem }}
    </div>

    <!-- Multiple choice / True-False -->
    <div v-if="isMultipleChoice" class="choices">
      <div
        v-for="choice in question.choices"
        :key="choice.id"
        class="choice"
        :class="{ selected: selectedAnswer === choice.id }"
        @click="selectChoice(choice.id)"
      >
        <div class="choice-radio">
          <div v-if="selectedAnswer === choice.id" class="choice-radio-selected"></div>
        </div>
        <div class="choice-text">{{ choice.text }}</div>
      </div>
    </div>

    <!-- Identification / Enumeration -->
    <div v-else class="text-input-container">
      <textarea
        v-model="textAnswer"
        class="text-input"
        :placeholder="question.type === 'enumeration' ? 'Enter items separated by commas...' : 'Type your answer...'"
        :disabled="disabled"
        rows="4"
      ></textarea>
    </div>

    <div class="question-footer">
      <button
        class="submit-btn"
        :disabled="!canSubmit || disabled"
        @click="handleSubmit"
      >
        {{ disabled ? 'Submitting...' : 'Submit Answer' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  background: white;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.question-icon {
  color: #667eea;
  flex-shrink: 0;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.question-topic {
  padding: 4px 10px;
  background: #eef0ff;
  color: #4b53c5;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.question-stem {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
  line-height: 1.5;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.choice {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafbff;
}

.choice:hover {
  border-color: #c8cdd6;
  background: #f0f3ff;
}

.choice.selected {
  border-color: #667eea;
  background: #f8faff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.choice-radio {
  width: 20px;
  height: 20px;
  border: 2px solid #c8cdd6;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.choice.selected .choice-radio {
  border-color: #667eea;
}

.choice-radio-selected {
  width: 10px;
  height: 10px;
  background: #667eea;
  border-radius: 50%;
}

.choice-text {
  font-size: 16px;
  color: #374151;
  flex: 1;
}

.text-input-container {
  margin-bottom: 24px;
}

.text-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  color: #1f2937;
  background: #fafbff;
  resize: vertical;
  transition: all 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .question-card {
    padding: 20px;
  }

  .question-stem {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .choices {
    gap: 10px;
    margin-bottom: 20px;
  }

  .choice {
    padding: 14px;
  }

  .choice-text {
    font-size: 15px;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
  }
}

/* Dark mode */
body.dark .question-card {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .question-stem {
  color: #e5e7eb;
}

body.dark .question-topic {
  background: #1f2a44;
  color: #a5b4fc;
}

body.dark .choice {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .choice:hover {
  border-color: #475569;
  background: #334155;
}

body.dark .choice.selected {
  border-color: #667eea;
  background: #1a2744;
}

body.dark .choice-radio {
  border-color: #475569;
}

body.dark .choice.selected .choice-radio {
  border-color: #667eea;
}

body.dark .choice-text {
  color: #e5e7eb;
}

body.dark .text-input {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .text-input:focus {
  background: #0f172a;
  border-color: #667eea;
}
</style>

