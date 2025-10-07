<script setup>
import { defineEmits } from 'vue'
import { PartyPopper, FileText, Save, Share2, X } from 'lucide-vue-next'

const emit = defineEmits(['close', 'takeQuiz', 'downloadQuiz', 'shareQuiz'])

const props = defineProps({
  quiz: {
    type: Object,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
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
          <p class="description">{{ quiz.description }}</p>
          <div class="quiz-stats">
            <span class="stat">{{ quiz.questions?.length || 0 }} questions</span>
            <span class="stat">Multiple choice</span>
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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
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
  font-size: 24px;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
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
  margin: 0 0 8px;
  font-size: 20px;
  color: #1f2937;
}

.description {
  color: #6b7280;
  margin: 0 0 16px;
  line-height: 1.5;
}

.quiz-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.stat {
  background: #f3f4f6;
  color: #4b5563;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
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
}

.action-btn.secondary:hover {
  border-color: #667eea;
  background: #f0f3ff;
  transform: translateY(-1px);
}

.action-btn.tertiary {
  border-color: #d1d5db;
  background: #f9fafb;
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
  font-size: 16px;
  font-weight: 600;
}

.text small {
  font-size: 14px;
  opacity: 0.8;
}

.action-btn.primary .text small {
  opacity: 0.9;
}

/* Dark mode styles are now in global styles.css */
</style>

