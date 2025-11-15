<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  questionIndex: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

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

// Compute expected number of answers
// Priority: 1) Number from question text, 2) Answer array length
const expectedCount = computed(() => {
  if (props.question?.type !== 'enumeration') return 0

  // First, try to extract number from question text
  const textNumber = extractNumberFromQuestion(props.question?.question)
  if (textNumber !== null) {
    return textNumber
  }

  // Fallback to answer array length
  if (Array.isArray(props.question?.answer)) {
    return props.question.answer.length
  }

  return 0
})

// Initialize field values array
const fieldValues = ref([])

// Initialize field values when component mounts or question changes
function initializeFields() {
  if (expectedCount.value > 0) {
    // Initialize with existing modelValue or empty strings
    fieldValues.value = Array.from({ length: expectedCount.value }, (_, index) => {
      return props.modelValue[index] || ''
    })
  }
}

// Watch for question changes and reinitialize
watch(() => props.question, () => {
  initializeFields()
}, { immediate: true })

// Watch for modelValue changes from parent
watch(() => props.modelValue, (newValue) => {
  if (Array.isArray(newValue)) {
    // Sync fieldValues with modelValue if lengths match
    if (newValue.length === expectedCount.value && expectedCount.value > 0) {
      fieldValues.value = newValue.map(v => v || '')
    } else if (fieldValues.value.length !== expectedCount.value) {
      initializeFields()
    }
  }
}, { deep: true })

// Update field value and emit to parent
function updateField(index, value) {
  fieldValues.value[index] = value

  // Emit all field values (trimmed) so parent can validate all fields are filled
  const newAnswers = fieldValues.value.map(v => v.trim())
  emit('update:modelValue', newAnswers)
}

// Computed for progress display
const filledCount = computed(() => {
  return fieldValues.value.filter(v => v.trim() !== '').length
})

// Initialize on mount
initializeFields()
</script>

<template>
  <div class="enumeration-enhanced">
    <div class="input-group">
      <label class="input-label">
        Your Answers ({{ expectedCount }} required):
      </label>
      <div class="enumeration-fields">
        <div
          v-for="(_, index) in expectedCount"
          :key="index"
          class="enumeration-field-wrapper"
        >
          <label
            :for="`enumeration-answer-${questionIndex}-${index}`"
            class="enumeration-field-label"
          >
            Answer {{ index + 1 }}:
          </label>
          <input
            :id="`enumeration-answer-${questionIndex}-${index}`"
            type="text"
            :value="fieldValues[index] || ''"
            class="text-input-large enumeration-field-input"
            :placeholder="`Enter answer ${index + 1}...`"
            @input="updateField(index, $event.target.value)"
          />
        </div>
      </div>
      <div class="enumeration-hint">
        {{ filledCount }} of {{ expectedCount }} answers provided
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.enumeration-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.enumeration-field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enumeration-field-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.enumeration-field-input {
  width: 100%;
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

.enumeration-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .input-label,
  .enumeration-field-label {
    color: #e2e8f0 !important;
  }

  .text-input-large {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
  }

  .text-input-large:focus {
    border-color: #667eea !important;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2) !important;
  }

  .text-input-large::placeholder {
    color: #64748b !important;
  }

  .enumeration-hint {
    color: #94a3b8 !important;
  }
}
</style>

