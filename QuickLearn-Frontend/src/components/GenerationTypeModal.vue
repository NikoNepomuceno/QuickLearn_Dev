<script setup>
import { ref, computed } from 'vue'
import { FileText, Brain, HelpCircle, X, Zap, BookOpen } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  fileName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const selectedType = ref('')
const customInstructions = ref('')

const generationOptions = [
  {
    key: 'quiz',
    title: 'Generate Quiz',
    description: 'Create interactive questions to test your knowledge',
    icon: 'Brain',
    features: ['Multiple question types', 'Customizable difficulty', 'Instant feedback'],
    color: '#667eea'
  },
  {
    key: 'summary',
    title: 'Generate Lesson Summary',
    description: 'Get a concise overview of key concepts and main points',
    icon: 'BookOpen',
    features: ['Key concepts highlighted', 'Bullet point format', 'Easy to review'],
    color: '#10b981'
  }
]

const fileLabel = computed(() => props.fileName || '{ File Name }')

function selectType(type) {
  selectedType.value = type
}

function handleConfirm() {
  if (!selectedType.value) return
  
  emit('confirm', {
    type: selectedType.value,
    customInstructions: customInstructions.value.trim()
  })
}

function handleClose() {
  selectedType.value = ''
  customInstructions.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <FileText :size="20" class="file-icon" />
          <div>
            <h2>Choose Generation Type</h2>
            <p class="file-name">{{ fileLabel }}</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Generation Type Selection -->
        <div class="type-selection">
          <h3>What would you like to generate?</h3>
          <div class="options-grid">
            <div 
              v-for="option in generationOptions" 
              :key="option.key"
              class="option-card"
              :class="{ selected: selectedType === option.key }"
              @click="selectType(option.key)"
            >
              <div class="option-header">
                <div class="option-icon" :style="{ backgroundColor: option.color }">
                  <component :is="option.icon" :size="24" />
                </div>
                <div class="option-info">
                  <h4>{{ option.title }}</h4>
                  <p>{{ option.description }}</p>
                </div>
              </div>
              <div class="option-features">
                <div 
                  v-for="feature in option.features" 
                  :key="feature"
                  class="feature-item"
                >
                  <Zap :size="12" />
                  {{ feature }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Instructions Section -->
        <div v-if="selectedType" class="instructions-section">
          <label for="custom-instructions" class="instructions-label">
            Additional Instructions (Optional)
          </label>
          <textarea
            id="custom-instructions"
            v-model="customInstructions"
            :placeholder="selectedType === 'quiz' 
              ? 'Add specific instructions about quiz difficulty, focus areas, or question types...'
              : 'Add specific instructions about summary focus, format, or key areas to emphasize...'"
            class="instructions-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <div class="selection-info">
          <span v-if="!selectedType" class="no-selection">
            Select a generation type to continue
          </span>
          <span v-else class="selection-made">
            <component :is="generationOptions.find(o => o.key === selectedType)?.icon" :size="16" />
            {{ generationOptions.find(o => o.key === selectedType)?.title }} selected
          </span>
        </div>
        <div class="footer-actions">
          <button class="cancel-btn" @click="handleClose">
            Cancel
          </button>
          <button 
            class="confirm-btn"
            :disabled="!selectedType"
            @click="handleConfirm"
          >
            Continue
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
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e6e8ec;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  color: #667eea;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.file-name {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.type-selection h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.option-card {
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafbff;
}

.option-card:hover {
  border-color: #c8cdd6;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.option-card.selected {
  border-color: #667eea;
  background: #f8faff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.option-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.option-info h4 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.option-info p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.option-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  font-size: 13px;
  font-weight: 500;
}

.feature-item svg {
  color: #10b981;
  flex-shrink: 0;
}

.instructions-section {
  border-top: 1px solid #e6e8ec;
  padding-top: 24px;
}

.instructions-label {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.instructions-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.instructions-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e6e8ec;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.no-selection {
  color: #9ca3af;
}

.selection-made {
  color: #059669;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.confirm-btn {
  padding: 10px 20px;
  background: #667eea;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.confirm-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    max-width: calc(100vw - 32px);
    margin: 16px;
  }

  .options-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .option-card {
    padding: 16px;
  }

  .option-header {
    gap: 12px;
  }

  .option-icon {
    width: 40px;
    height: 40px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .footer-actions {
    width: 100%;
  }

  .cancel-btn,
  .confirm-btn {
    flex: 1;
  }
}

/* Dark mode styles */
body.dark .modal-content {
  background: #0f172a;
  border: 1px solid #1f2a44;
}

body.dark .modal-header {
  border-color: #1f2a44;
}

body.dark .header-info h2 {
  color: #e5e7eb;
}

body.dark .file-name {
  color: #9ca3af;
}

body.dark .close-btn {
  color: #9ca3af;
}

body.dark .close-btn:hover {
  background: #1f2a44;
  color: #e5e7eb;
}

body.dark .type-selection h3 {
  color: #e5e7eb;
}

body.dark .option-card {
  border-color: #334155;
  background: #0f172a;
}

body.dark .option-card:hover {
  border-color: #475569;
}

body.dark .option-card.selected {
  border-color: #667eea;
  background: #131c35;
}

body.dark .option-info h4 {
  color: #e5e7eb;
}

body.dark .option-info p {
  color: #9ca3af;
}

body.dark .feature-item {
  color: #cbd5e1;
}

body.dark .instructions-section {
  border-color: #1f2a44;
}

body.dark .instructions-label {
  color: #e5e7eb;
}

body.dark .instructions-textarea {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .instructions-textarea:focus {
  border-color: #667eea;
}

body.dark .modal-footer {
  background: #0b1222;
  border-color: #1f2a44;
}

body.dark .selection-info {
  color: #9ca3af;
}

body.dark .no-selection {
  color: #6b7280;
}

body.dark .cancel-btn {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .cancel-btn:hover {
  background: #334155;
}
</style>
