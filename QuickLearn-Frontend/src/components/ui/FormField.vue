<script setup>
const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  for: {
    type: String,
    default: ''
  },
  orientation: {
    type: String,
    default: 'vertical'
  }
})
</script>

<template>
  <div
    class="form-field"
    :class="[
      `form-field--${orientation}`,
      { 'form-field--error': !!error }
    ]"
  >
    <label
      v-if="label"
      class="form-field__label"
      :for="props.for"
    >
      {{ label }}
      <span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>

    <div class="form-field__control">
      <slot />
      <p
        v-if="error"
        class="form-field__message form-field__message--error"
        role="alert"
        aria-live="polite"
      >
        {{ error }}
      </p>
      <p v-else-if="hint" class="form-field__message">
        {{ hint }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.form-field {
  display: grid;
  gap: var(--space-2);
  width: 100%;
}

.form-field--horizontal {
  grid-template-columns: minmax(160px, 220px) 1fr;
  align-items: center;
  gap: var(--space-4);
}

.form-field__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.form-field__required {
  color: var(--color-danger);
  font-weight: var(--font-weight-bold);
}

.form-field__control {
  display: grid;
  gap: var(--space-2);
}

.form-field__message {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.form-field__message--error {
  color: var(--color-danger);
  font-weight: var(--font-weight-medium);
}

.form-field--error .form-field__label {
  color: var(--color-danger);
}

@media (max-width: 768px) {
  .form-field--horizontal {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

body.dark .form-field__label {
  color: var(--color-text-muted);
}

body.dark .form-field__message {
  color: var(--color-text-soft);
}

body.dark .form-field__message--error {
  color: #fca5a5;
}
</style>

