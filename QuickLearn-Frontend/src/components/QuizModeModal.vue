<script setup>
import { ref, computed } from 'vue'
import { FileText, Zap, TrendingUp, X, Brain, Target } from 'lucide-vue-next'

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

const selectedMode = ref('')

const quizModeOptions = [
  {
    key: 'quicklearn',
    title: 'QuickLearn',
    shortDescription: 'Straightforward quiz generation',
    description: 'Generate a standard quiz with consistent difficulty. Perfect for quick assessments and straightforward testing of your knowledge.',
    icon: 'Zap',
    color: '#667eea',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    features: ['Fixed difficulty level', 'Fast generation', 'Standard format', 'Perfect for quick tests']
  },
  {
    key: 'adaptive',
    title: 'Adaptive Learning',
    shortDescription: 'Difficulty adjusts to your performance',
    description: 'Intelligent quiz system that dynamically adjusts question difficulty based on your answers. Start easy and challenge yourself as you improve!',
    icon: 'TrendingUp',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    features: ['Dynamic difficulty', 'Performance tracking', 'Personalized learning', 'Progressive challenges']
  }
]

const fileLabel = computed(() => props.fileName || '{ File Name }')

function selectMode(mode) {
  selectedMode.value = mode
}

function handleConfirm() {
  if (!selectedMode.value) return

  emit('confirm', {
    mode: selectedMode.value
  })
}

function handleClose() {
  selectedMode.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <Brain :size="20" class="file-icon" />
          <div>
            <h2>Choose Quiz Mode</h2>
            <p class="file-name">{{ fileLabel }}</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="mode-selection">
          <h3>How would you like to learn?</h3>
          <div class="options-grid">
            <div
              v-for="option in quizModeOptions"
              :key="option.key"
              class="mode-card"
              :class="{ selected: selectedMode === option.key }"
              @click="selectMode(option.key)"
            >
              <div class="card-visual" :style="{ background: option.gradient }">
                <div class="visual-background">
                  <component :is="option.icon" :size="48" />
                </div>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <h4>{{ option.title }}</h4>
                  <p class="short-desc">{{ option.shortDescription }}</p>
                </div>
                <div class="hover-description">
                  <p>{{ option.description }}</p>
                  <div class="features-list">
                    <div
                      v-for="feature in option.features"
                      :key="feature"
                      class="feature-item"
                    >
                      <Target :size="12" />
                      {{ feature }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="selection-info">
          <span v-if="!selectedMode" class="no-selection">
            Select a quiz mode to continue
          </span>
          <span v-else class="selection-made">
            <component :is="quizModeOptions.find(o => o.key === selectedMode)?.icon" :size="16" />
            {{ quizModeOptions.find(o => o.key === selectedMode)?.title }} selected
          </span>
        </div>
        <div class="footer-actions">
          <button class="cancel-btn" @click="handleClose">
            Cancel
          </button>
          <button
            class="confirm-btn"
            :disabled="!selectedMode"
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
  max-width: 800px;
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

.mode-selection h3 {
  margin: 0 0 24px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.mode-card {
  border: 2px solid #e6e8ec;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafbff;
  position: relative;
}

.mode-card:hover {
  border-color: #c8cdd6;
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.mode-card.selected {
  border-color: #667eea;
  background: #f8faff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.card-visual {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.visual-background {
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  opacity: 0.9;
  transition: transform 0.3s ease;
}

.mode-card:hover .visual-background {
  transform: scale(1.1);
}

.card-content {
  padding: 20px;
  position: relative;
}

.card-header {
  margin-bottom: 8px;
}

.card-header h4 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.short-desc {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.hover-description {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease, max-height 0.4s ease, padding-top 0.3s ease;
  padding-top: 0;
  margin-top: 0;
}

.mode-card:hover .hover-description {
  opacity: 1;
  max-height: 500px;
  padding-top: 16px;
  margin-top: 8px;
}

.hover-description p {
  margin: 0 0 12px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.features-list {
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
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .card-visual {
    height: 80px;
  }

  .card-header h4 {
    font-size: 16px;
  }

  .short-desc {
    font-size: 12px;
  }

  .mode-card {
    margin-bottom: 0;
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

body.dark .mode-selection h3 {
  color: #e5e7eb;
}

body.dark .mode-card {
  border-color: #334155;
  background: #0f172a;
}

body.dark .mode-card:hover {
  border-color: #475569;
}

body.dark .mode-card.selected {
  border-color: #667eea;
  background: #131c35;
}

body.dark .card-header h4 {
  color: #e5e7eb;
}

body.dark .short-desc {
  color: #9ca3af;
}

body.dark .hover-description p {
  color: #cbd5e1;
}

body.dark .feature-item {
  color: #cbd5e1;
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
