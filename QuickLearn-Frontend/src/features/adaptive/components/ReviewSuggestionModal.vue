<script setup>
import { AlertTriangle, TrendingDown, BookOpen, ArrowRight, X } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  suggestion: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'lowerCap', 'seeTopics', 'continue'])

function handleLowerCap() {
  emit('lowerCap')
  emit('close')
}

function handleSeeTopics() {
  emit('seeTopics')
}

function handleContinue() {
  emit('continue')
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click="handleClose">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>

        <div class="modal-icon">
          <AlertTriangle :size="48" />
        </div>

        <h2 class="modal-title">Need a Moment?</h2>
        <p class="modal-description">
          You've missed {{ suggestion?.streak || 4 }} questions in a row. 
          That's okay! Learning is a journey. Here are some options to help you:
        </p>

        <div class="options-grid">
          <button class="option-card" @click="handleLowerCap">
            <div class="option-icon lower">
              <TrendingDown :size="24" />
            </div>
            <div class="option-content">
              <div class="option-title">Lower Difficulty</div>
              <div class="option-description">
                Switch to {{ suggestion?.suggestions?.easeTo || 'easier' }} questions
              </div>
            </div>
            <ArrowRight :size="20" class="option-arrow" />
          </button>

          <button class="option-card" @click="handleSeeTopics">
            <div class="option-icon review">
              <BookOpen :size="24" />
            </div>
            <div class="option-content">
              <div class="option-title">Review Topics</div>
              <div class="option-description">
                See what you've missed
              </div>
            </div>
            <ArrowRight :size="20" class="option-arrow" />
          </button>
        </div>

        <div class="modal-footer">
          <button class="continue-btn" @click="handleContinue">
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 50%;
  color: #f59e0b;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
}

.modal-description {
  font-size: 15px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 28px;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8faff;
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.option-card:hover {
  border-color: #667eea;
  background: #f0f3ff;
  transform: translateX(4px);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-icon.lower {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.option-icon.review {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.option-description {
  font-size: 13px;
  color: #6b7280;
}

.option-arrow {
  color: #9ca3af;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.option-card:hover .option-arrow {
  color: #667eea;
  transform: translateX(4px);
}

.modal-footer {
  padding-top: 16px;
  border-top: 1px solid #e6e8ec;
}

.continue-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.continue-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.9);
}

@media (max-width: 768px) {
  .modal-content {
    padding: 24px;
  }

  .modal-icon {
    width: 64px;
    height: 64px;
  }

  .modal-icon svg {
    width: 36px;
    height: 36px;
  }

  .modal-title {
    font-size: 20px;
  }

  .modal-description {
    font-size: 14px;
  }

  .option-card {
    padding: 14px;
  }

  .option-icon {
    width: 40px;
    height: 40px;
  }

  .option-icon svg {
    width: 20px;
    height: 20px;
  }

  .option-title {
    font-size: 15px;
  }
}

/* Dark mode */
body.dark .modal-content {
  background: #0f172a;
  border: 1px solid #1f2a44;
}

body.dark .close-btn {
  color: #9ca3af;
}

body.dark .close-btn:hover {
  background: #1f2a44;
  color: #e5e7eb;
}

body.dark .modal-title {
  color: #e5e7eb;
}

body.dark .modal-description {
  color: #9ca3af;
}

body.dark .option-card {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .option-card:hover {
  border-color: #667eea;
  background: #1a2744;
}

body.dark .option-title {
  color: #e5e7eb;
}

body.dark .option-description {
  color: #9ca3af;
}

body.dark .option-arrow {
  color: #6b7280;
}

body.dark .option-card:hover .option-arrow {
  color: #667eea;
}

body.dark .modal-footer {
  border-color: #1f2a44;
}

body.dark .continue-btn {
  color: #9ca3af;
}

body.dark .continue-btn:hover {
  background: #1f2a44;
  color: #e5e7eb;
}
</style>

