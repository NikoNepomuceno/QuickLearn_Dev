<script setup>
defineProps({
  toasts: { type: Array, required: true }
})
defineEmits(['dismiss'])
</script>

<template>
  <div class="toast-wrap" aria-live="polite" aria-atomic="true">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <div class="msg">{{ t.message }}</div>
      <button class="x" @click="$emit('dismiss', t.id)" aria-label="Dismiss">✕</button>
    </div>
  </div>

</template>

<style scoped>
.toast-wrap {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: grid;
  gap: 8px;
  z-index: 2000;
}
.toast {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  min-width: 240px;
  max-width: 420px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-left: 4px solid #9ca3af;
  border-radius: 10px;
  padding: 10px 12px 10px 12px;
  box-shadow: 0 10px 25px rgba(50, 50, 93, 0.08);
}
.toast.success { border-left-color: #10b981; }
.toast.error { border-left-color: #ef4444; }
.toast.info { border-left-color: #3b82f6; }
.msg { color: #1f2937; }
.x {
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 16px;
}

/* Dark mode styles are now in global styles.css */
</style>


