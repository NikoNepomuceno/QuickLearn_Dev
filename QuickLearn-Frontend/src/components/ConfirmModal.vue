<script setup>
const props = defineProps({
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: 'Please confirm your action.' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}
function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>

<template>
  <teleport to="body">
    <div v-if="props.modelValue" class="modal-backdrop" @click.self="close">
      <div class="modal">
        <h3 class="title">{{ props.title }}</h3>
        <p class="message">{{ props.message }}</p>
        <div class="actions">
          <button class="btn ghost" @click="close">{{ props.cancelText }}</button>
          <button class="btn danger" @click="confirm">{{ props.confirmText }}</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: grid;
  place-items: center;
  z-index: 3000;
}
.modal {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.title { margin: 0 0 6px; font-size: 18px; }
.message { margin: 0 0 14px; color: #4b5563; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.ghost { background: #fff; border: 1px solid #e6e8ec; }
.danger { background: #ef4444; color: #fff; border: none; }
</style>


