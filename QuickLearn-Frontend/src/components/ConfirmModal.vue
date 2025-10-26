<script setup>
const props = defineProps({
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: 'Please confirm your action.' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  modelValue: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
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
        
        <!-- Custom content slot -->
        <div v-if="$slots.customContent" class="custom-content">
          <slot name="customContent"></slot>
        </div>
        
        <div class="actions">
          <button class="btn ghost" @click="close">{{ props.cancelText }}</button>
          <button 
            class="btn danger" 
            :class="{ disabled: props.confirmDisabled }"
            :disabled="props.confirmDisabled"
            @click="confirm"
          >
            {{ props.confirmText }}
          </button>
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
.custom-content { margin: 16px 0; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { 
  padding: 10px 14px; 
  border-radius: 10px; 
  cursor: pointer; 
  transition: all 0.2s ease;
  font-weight: 500;
}
.ghost { 
  background: #fff; 
  border: 1px solid #e6e8ec; 
  color: #374151;
}
.ghost:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}
.danger { 
  background: #ef4444; 
  color: #fff; 
  border: none; 
}
.danger:hover:not(.disabled) {
  background: #dc2626;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}
.danger.disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

</style>


