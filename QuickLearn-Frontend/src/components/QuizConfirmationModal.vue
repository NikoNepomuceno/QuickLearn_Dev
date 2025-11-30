<script setup>
import { computed } from 'vue'
import { PartyPopper, FileText, Save, Share2, X, Clock } from 'lucide-vue-next'

const emit = defineEmits(['close', 'takeQuiz', 'downloadQuiz', 'shareQuiz'])

const props = defineProps({
  quiz: {
    type: Object,
    required: true,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
})

// Extract quiz configurations from metadata
const quizConfig = computed(() => {
  const metadata = props.quiz?.metadata || {}
  const options = metadata.options || {}
  const legacy = metadata.timedSettings || metadata.timedMode || {}
  
  // Get timed mode settings
  const timedModeEnabled =
    options.timedModeEnabled ??
    legacy.timedModeEnabled ??
    metadata.timedModeEnabled ??
    metadata.timedQuiz ??
    false
  
  const questionTimerSeconds = timedModeEnabled
    ? options.questionTimerSeconds ??
      legacy.questionTimerSeconds ??
      metadata.questionTimerSeconds ??
      null
    : null
  
  // Get question types from metadata or infer from actual questions
  const questionTypes = options.questionTypes || metadata.questionTypes || []
  let typeLabel = 'Multiple choice'
  
  // First, try to determine from metadata
  if (Array.isArray(questionTypes) && questionTypes.length > 0) {
    const uniqueTypes = [...new Set(questionTypes)]
    if (uniqueTypes.length > 1 || questionTypes.includes('mixed')) {
      typeLabel = 'Mixed types'
    } else if (uniqueTypes.length === 1) {
      const type = uniqueTypes[0]
      const typeMap = {
        multiple_choice: 'Multiple choice',
        true_false: 'True or False',
        identification: 'Identification',
        enumeration: 'Enumeration',
        mixed: 'Mixed types',
      }
      typeLabel = typeMap[type] || 'Multiple choice'
    }
  } else {
    // Fallback: Determine type from actual questions if metadata is missing
    const questionTypesInQuiz = [...new Set((props.quiz?.questions || []).map(q => q?.type).filter(Boolean))]
    if (questionTypesInQuiz.length > 1) {
      typeLabel = 'Mixed types'
    } else if (questionTypesInQuiz.length === 1) {
      const typeMap = {
        multiple_choice: 'Multiple choice',
        true_false: 'True or False',
        identification: 'Identification',
        enumeration: 'Enumeration',
      }
      typeLabel = typeMap[questionTypesInQuiz[0]] || 'Multiple choice'
    }
  }
  
  return {
    questionCount: props.quiz?.questions?.length || 0,
    typeLabel,
    timedModeEnabled,
    questionTimerSeconds,
  }
})

function handleTakeQuiz() {
  emit('takeQuiz')
}

function handleDownloadQuiz() {
  emit('downloadQuiz')
}

function handleShareQuiz() {
  emit('shareQuiz')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>
          <PartyPopper :size="24" />
          Quiz Generated Successfully!
        </h2>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="quiz-info">
          <h3>{{ quiz.title }}</h3>
          <p class="description">{{ quiz.description || 'Quiz generated from cached questions' }}</p>
          <div class="quiz-stats">
            <span class="stat">
              <span class="stat-value">{{ quizConfig.questionCount }}</span>
              <span class="stat-label">questions</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ quizConfig.typeLabel }}</span>
            </span>
            <span v-if="quizConfig.timedModeEnabled && quizConfig.questionTimerSeconds" class="stat stat-timed">
              <Clock :size="14" />
              <span class="stat-label">{{ quizConfig.questionTimerSeconds }}s per question</span>
            </span>
          </div>
        </div>

        <div class="action-buttons">
          <button class="action-btn primary" @click="handleTakeQuiz">
            <span class="icon">
              <FileText :size="20" />
            </span>
            <span class="text">
              <strong>Take Quiz</strong>
              <small>Start answering questions</small>
            </span>
          </button>

          <button class="action-btn secondary" @click="handleDownloadQuiz">
            <span class="icon">
              <Save :size="20" />
            </span>
            <span class="text">
              <strong>Download Quiz</strong>
              <small>Save as PDF</small>
            </span>
          </button>

          <button class="action-btn tertiary" @click="handleShareQuiz">
            <span class="icon">
              <Share2 :size="20" />
            </span>
            <span class="text">
              <strong>Share Quiz</strong>
              <small>Generate shareable link</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
  border-bottom: 1px solid #e6e8ec;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
  transform: scale(1.05);
}

.modal-body {
  padding: 0 24px 24px;
}

.quiz-info {
  text-align: center;
  margin-bottom: 32px;
}

.quiz-info h3 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: #111827;
}

.description {
  color: #6b7280;
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 400;
}

.quiz-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stat {
  background: #f3f4f6;
  color: #374151;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
}

.stat-timed {
  background: #fef3c7;
  color: #92400e;
}

.stat-value {
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-weight: 500;
}

.action-buttons {
  display: grid;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  background: white;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.action-btn.secondary {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #111827;
}

.action-btn.secondary:hover {
  border-color: #667eea;
  background: #f0f3ff;
  transform: translateY(-1px);
}

.action-btn.tertiary {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #111827;
}

.action-btn.tertiary:hover {
  border-color: #10b981;
  background: #f0fdf4;
  transform: translateY(-1px);
}

.icon {
  color: inherit;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.text strong {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: inherit;
}

.text small {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: inherit;
}

.action-btn.primary .text strong {
  color: #ffffff;
}

.action-btn.primary .text small {
  color: rgba(255, 255, 255, 0.95);
}

.action-btn.secondary .text strong {
  color: #111827;
}

.action-btn.secondary .text small {
  color: #4b5563;
}

.action-btn.tertiary .text strong {
  color: #111827;
}

.action-btn.tertiary .text small {
  color: #4b5563;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    max-width: calc(100vw - 32px);
    margin: 16px;
  }

  .modal-header {
    padding: 16px 16px 0;
  }

  .modal-header h2 {
    font-size: 20px;
    font-weight: 700;
  }

  .modal-body {
    padding: 0 16px 16px;
  }

  .quiz-info h3 {
    font-size: 17px;
    font-weight: 700;
  }

  .description {
    font-size: 13px;
    line-height: 1.5;
  }
  
  .stat {
    font-size: 12px;
    padding: 6px 12px;
  }

  .quiz-stats {
    flex-direction: column;
    gap: 8px;
  }

  .action-buttons {
    gap: 8px;
  }

  .action-btn {
    padding: 12px 16px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .text {
    gap: 4px;
  }

  .text strong {
    font-size: 14px;
  }

  .text small {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .modal-content {
    max-width: calc(100vw - 16px);
    margin: 8px;
  }

  .modal-header {
    padding: 12px 12px 0;
  }

  .modal-header h2 {
    font-size: 18px;
    font-weight: 700;
  }

  .modal-body {
    padding: 0 12px 12px;
  }

  .action-btn {
    padding: 10px 12px;
  }

  .icon {
    min-width: 20px;
  }
}

/* Dark mode styles are now in global styles.css */
</style>
