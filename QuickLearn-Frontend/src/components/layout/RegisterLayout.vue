<script setup>
defineProps({
  maxWidth: {
    type: Number,
    default: 1200
  }
})
</script>

<template>
  <div class="register-shell">
    <div class="register-shell__background" aria-hidden="true"></div>
    <div class="register-shell__content">
      <slot />

      <footer v-if="$slots.footer" class="register-shell__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.register-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(var(--space-6), 6vw, var(--space-10));
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.register-shell__background {
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

.register-shell__content {
  width: min(1200px, 100%);
  display: grid;
  gap: var(--space-6);
  position: relative;
  padding: clamp(var(--space-3), 4vw, var(--space-6));
}

.register-shell__footer {
  margin-top: var(--space-2);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .register-shell {
    padding: var(--space-6) var(--space-4);
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

body.dark .register-shell__content {
  color: var(--color-text);
}
</style>

