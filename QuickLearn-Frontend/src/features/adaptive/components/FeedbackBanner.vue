<script setup>
import { CheckCircle2, XCircle } from 'lucide-vue-next'

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  correct: {
    type: Boolean,
    default: false
  },
  explanation: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['dismiss'])

function handleDismiss() {
  emit('dismiss')
}
</script>

<template>
  <Transition name="slide-down">
    <div v-if="visible" class="feedback-banner" :class="{ correct, incorrect: !correct }">
      <div class="feedback-content">
        <div class="feedback-icon">
          <CheckCircle2 v-if="correct" :size="24" />
          <XCircle v-else :size="24" />
        </div>
        <div class="feedback-text">
          <div class="feedback-title">
            {{ correct ? 'Correct!' : 'Incorrect' }}
          </div>
          <div v-if="explanation" class="feedback-explanation">
            {{ explanation }}
          </div>
        </div>
        <button class="dismiss-btn" @click="handleDismiss" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.feedback-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.feedback-banner.correct {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.feedback-banner.incorrect {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.feedback-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.feedback-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-title {
  font-size: 18px;
  font-weight: 700;
}

.feedback-explanation {
  font-size: 14px;
  opacity: 0.95;
  line-height: 1.5;
}

.dismiss-btn {
  background: none;
  border: none;
  color: white;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Animations */
.slide-down-enter-active {
  animation: slideDown 0.3s ease-out;
}

.slide-down-leave-active {
  animation: slideUp 0.3s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .feedback-banner {
    padding: 12px;
  }

  .feedback-content {
    gap: 12px;
  }

  .feedback-title {
    font-size: 16px;
  }

  .feedback-explanation {
    font-size: 13px;
  }

  .dismiss-btn {
    width: 28px;
    height: 28px;
    font-size: 28px;
  }
}
</style>

