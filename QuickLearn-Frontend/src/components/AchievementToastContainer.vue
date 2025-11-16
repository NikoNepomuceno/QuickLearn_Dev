<template>
  <Teleport to="body">
    <div class="achievement-toast-container" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast-list" tag="div">
        <AchievementToast
          v-for="toast in toasts"
          :key="toast.id"
          :toast="toast"
          @dismiss="handleDismiss"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import AchievementToast from './AchievementToast.vue'
import { useAchievementToast } from '@/composables/useAchievementToast'

const { toasts, dismissToast } = useAchievementToast()

// Expose toasts for external access
defineExpose({
  toasts,
  dismissToast
})

function handleDismiss(toastId) {
  dismissToast(toastId)
}
</script>

<style scoped>
.achievement-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
  max-width: calc(100vw - 40px);
}

/* Allow pointer events on toasts themselves */
.achievement-toast-container > * {
  pointer-events: auto;
}

/* Transition group animations */
.toast-list-move,
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s ease;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100px) scale(0.8);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.8);
}

.toast-list-leave-active {
  position: absolute;
  right: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .achievement-toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
    align-items: stretch;
  }
}
</style>

