<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  textarea: {
    type: Boolean,
    default: false
  },
  rows: {
    type: [Number, String],
    default: 4
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const isTextarea = computed(() => props.textarea || props.type === 'textarea')

const controlAttrs = computed(() => {
  const attrs = {
    placeholder: props.placeholder,
    disabled: props.disabled,
    readonly: props.readonly,
    autocomplete: props.autocomplete,
    autofocus: props.autofocus,
    name: props.name,
    id: props.id
  }

  if (!isTextarea.value) {
    attrs.type = props.type
  } else {
    attrs.rows = props.rows
  }

  return attrs
})

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div
    class="base-input"
    :class="{
      'base-input--textarea': isTextarea,
      'base-input--disabled': disabled,
      'base-input--with-prefix': !!$slots.prefix,
      'base-input--with-suffix': !!$slots.suffix
    }"
  >
    <span v-if="$slots.prefix" class="base-input__affix base-input__affix--prefix">
      <slot name="prefix" />
    </span>

    <component
      :is="isTextarea ? 'textarea' : 'input'"
      class="base-input__control"
      v-bind="controlAttrs"
      :value="modelValue"
      @input="onInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <span v-if="$slots.suffix" class="base-input__affix base-input__affix--suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<style scoped>
.base-input {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
  overflow: hidden;
}

.base-input__control {
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
  color: var(--color-text);
  font-family: inherit;
  line-height: var(--line-height-base);
  outline: none;
}

.base-input--textarea {
  grid-template-columns: auto 1fr;
}

.base-input--textarea .base-input__control {
  resize: vertical;
  min-height: 140px;
}

.base-input__affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
}

.base-input:focus-within {
  border-color: rgba(102, 126, 234, 0.65);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.18);
}

.base-input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-input--disabled .base-input__control {
  cursor: not-allowed;
}

.base-input--with-prefix .base-input__control {
  padding-left: var(--space-2);
}

.base-input--with-suffix .base-input__control {
  padding-right: var(--space-2);
}

body.dark .base-input {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .base-input__control {
  color: var(--color-text);
}

body.dark .base-input:focus-within {
  border-color: rgba(165, 180, 252, 0.6);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.22);
}
</style>

