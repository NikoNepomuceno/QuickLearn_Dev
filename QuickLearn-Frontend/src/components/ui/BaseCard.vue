<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  padding: {
    type: String,
    default: 'md' // sm, md, lg
  },
  elevated: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const slots = useSlots()

const classes = computed(() => [
  'base-card',
  `base-card--${props.padding}`,
  props.elevated && 'base-card--elevated',
  props.clickable && 'base-card--clickable'
])

const showHeader = computed(() => {
  if (props.title || props.subtitle) return true
  return Boolean(slots.header)
})
</script>

<template>
  <section :class="classes">
    <header v-if="showHeader" class="base-card__header">
      <slot name="header">
        <div class="base-card__heading">
          <h2 v-if="$slots.title">
            <slot name="title" />
          </h2>
          <template v-else>
            <h2 v-if="title">{{ title }}</h2>
          </template>
          <p v-if="$slots.subtitle" class="base-card__subtitle">
            <slot name="subtitle" />
          </p>
          <template v-else>
            <p v-if="subtitle" class="base-card__subtitle">
              {{ subtitle }}
            </p>
          </template>
        </div>
        <div v-if="$slots['header-actions']" class="base-card__actions">
          <slot name="header-actions" />
        </div>
      </slot>
    </header>

    <div class="base-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.base-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition:
    box-shadow var(--transition-base),
    transform var(--transition-base),
    border-color var(--transition-base);
}

.base-card--sm {
  padding: var(--space-4);
}

.base-card--md {
  padding: var(--space-6);
}

.base-card--lg {
  padding: var(--space-8);
}

.base-card--elevated {
  box-shadow: var(--shadow-sm);
}

.base-card--clickable {
  cursor: pointer;
}

.base-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-strong);
}

.base-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
}

.base-card__heading h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.base-card__subtitle {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.base-card__actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.base-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.base-card__footer {
  margin-top: auto;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .base-card {
    border-radius: var(--radius-md);
  }

  .base-card--md {
    padding: var(--space-5);
  }

  .base-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}

body.dark .base-card {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: var(--shadow-xs);
}

body.dark .base-card__heading h2 {
  color: var(--color-text);
}

body.dark .base-card__subtitle {
  color: var(--color-text-muted);
}
</style>

