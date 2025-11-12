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
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color var(--transition-base),
    color var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
  position: relative;
  overflow: hidden;
}

.base-button--block {
  width: 100%;
}

.base-button--sm {
  font-size: var(--font-size-sm);
  padding: var(--space-2) var(--space-4);
  min-height: 2.25rem;
}

.base-button--md {
  font-size: var(--font-size-base);
  padding: var(--space-3) var(--space-6);
  min-height: 2.75rem;
}

.base-button--lg {
  font-size: var(--font-size-lg);
  padding: var(--space-4) var(--space-7);
  min-height: 3.25rem;
}

.base-button--primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.base-button--primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.base-button--primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.base-button--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
  box-shadow: var(--shadow-xs);
}

.base-button--secondary:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
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
  background: linear-gradient(135deg, #f87171, #ef4444);
  color: #fff;
  box-shadow: var(--shadow-sm);
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

