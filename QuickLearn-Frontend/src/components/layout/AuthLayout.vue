<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: false
  },
  backLabel: {
    type: String,
    default: 'Back'
  }
})

const emit = defineEmits(['back'])
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__background" aria-hidden="true"></div>
    <div class="auth-layout__card">
      <div class="auth-layout__top">
        <button
          v-if="showBack"
          type="button"
          class="auth-layout__back"
          @click="emit('back')"
        >
          <slot name="back-icon" />
          <span>{{ backLabel }}</span>
        </button>

      <div v-if="$slots.avatar" class="auth-layout__avatar">
        <slot name="avatar" />
      </div>
    </div>

    <div v-if="title || subtitle" class="auth-layout__header">
      <h1 v-if="title" class="auth-layout__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-layout__subtitle">{{ subtitle }}</p>
    </div>

    <div class="auth-layout__content">
      <slot />
    </div>

      <footer v-if="$slots.footer" class="auth-layout__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-6), 6vw, var(--space-10));
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.auth-layout__background {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 30% 30%, rgba(102, 126, 234, 0.35), transparent 55%),
    radial-gradient(circle at 70% 40%, rgba(118, 75, 162, 0.35), transparent 60%),
    radial-gradient(circle at 55% 70%, rgba(59, 130, 246, 0.25), transparent 55%);
  filter: blur(80px);
  z-index: -1;
  opacity: 0.55;
  transform: scale(1.1);
  animation: pulse 18s ease-in-out infinite;
}

.auth-layout__card {
  width: min(480px, 100%);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: var(--shadow-lg);
  padding: clamp(var(--space-6), 5vw, var(--space-8));
  display: grid;
  gap: var(--space-6);
  position: relative;
}

.auth-layout__top {
  display: grid;
  gap: var(--space-4);
}

.auth-layout__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: color var(--transition-base);
}

.auth-layout__back:hover {
  color: var(--color-primary-dark);
}

.auth-layout__avatar {
  display: flex;
  justify-content: flex-start;
}

.auth-layout__header {
  display: grid;
  gap: var(--space-2);
  text-align: center;
}

.auth-layout__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0;
}

.auth-layout__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin: 0;
}

.auth-layout__content {
  display: grid;
  gap: var(--space-5);
}

.auth-layout__footer {
  margin-top: var(--space-2);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .auth-layout {
    padding: var(--space-6) var(--space-4);
  }

  .auth-layout__card {
    padding: var(--space-6);
    border-radius: var(--radius-md);
  }

  .auth-layout__avatar {
    justify-content: center;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1.05);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.6;
  }
}

body.dark .auth-layout__card {
  background: var(--color-surface);
  border-color: rgba(30, 41, 59, 0.7);
  box-shadow: var(--shadow-lg);
}
</style>

