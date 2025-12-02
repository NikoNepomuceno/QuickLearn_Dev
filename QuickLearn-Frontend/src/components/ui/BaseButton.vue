<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  as: {
    type: String,
    default: 'button'
  },
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'md'
  },
  block: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  href: {
    type: String,
    default: ''
  },
  to: {
    type: [String, Object],
    default: null
  }
})

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return props.as || 'button'
})

const isButton = computed(() => tag.value === 'button')

const componentAttrs = computed(() => {
  if (props.to) {
    return { to: props.to }
  }
  if (tag.value === 'a' && props.href) {
    return { href: props.href }
  }
  return {}
})

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="tag"
    v-bind="componentAttrs"
    class="base-button"
    :class="[
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--block': block, 'is-loading': loading }
    ]"
    :type="isButton ? type : undefined"
    :disabled="isButton ? isDisabled : undefined"
    :aria-disabled="!isButton && isDisabled ? 'true' : undefined"
    :tabindex="!isButton && isDisabled ? '-1' : undefined"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true"></span>
    <span class="base-button__content">
      <slot />
    </span>
  </component>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 600;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.base-button--block {
  width: 100%;
}

.base-button--sm {
  font-size: 14px;
  padding: 10px 20px;
  min-height: 40px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.base-button--md {
  font-size: 15px;
  padding: 14px 28px;
  min-height: 48px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.base-button--lg {
  font-size: 16px;
  padding: 16px 36px;
  min-height: 56px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.base-button--primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
}

.base-button--primary:hover {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
}

.base-button--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.base-button--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.base-button--secondary:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.base-button--secondary:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.base-button--outline {
  background: transparent;
  color: var(--color-primary);
  border-color: rgba(102, 126, 234, 0.4);
}

.base-button--outline:hover {
  border-color: var(--color-primary);
  background: rgba(102, 126, 234, 0.08);
}

.base-button--ghost {
  background: transparent;
  color: var(--color-text-muted);
}

.base-button--ghost:hover {
  color: var(--color-text);
  background: rgba(148, 163, 184, 0.12);
}

.base-button--danger {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.25);
}

.base-button--danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.base-button--danger:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.base-button:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.35);
  outline-offset: 2px;
}

.base-button:disabled,
.base-button[aria-disabled='true'] {
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

.base-button__content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.base-button__spinner {
  width: 1em;
  height: 1em;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: spin 800ms linear infinite;
}

.base-button.is-loading .base-button__content {
  opacity: 0.6;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

body.dark .base-button--secondary {
  background: var(--color-surface-subtle);
  color: var(--color-text);
  border-color: var(--color-border);
}

body.dark .base-button--outline {
  border-color: rgba(165, 180, 252, 0.4);
}

body.dark .base-button--outline:hover {
  background: rgba(165, 180, 252, 0.12);
}

body.dark .base-button--ghost:hover {
  background: rgba(148, 163, 184, 0.16);
}
</style>

