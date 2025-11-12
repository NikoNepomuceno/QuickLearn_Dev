<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Shield } from 'lucide-vue-next'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import { resetPassword } from '@/services/authService'

const router = useRouter()
const route = useRoute()

const form = reactive({
  password: '',
  confirmPassword: ''
})

const checklist = reactive({
  length: false,
  uppercase: false,
  digit: false,
  special: false
})

const fieldErrors = reactive({
  password: '',
  confirmPassword: '',
  token: ''
})

const formMessage = ref('')
const isSuccess = ref(false)
const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const token = ref(typeof route.query.token === 'string' ? route.query.token : '')

watch(
  () => form.password,
  (value) => {
    checklist.length = value.length >= 8
    checklist.uppercase = /[A-Z]/.test(value)
    checklist.digit = /\d/.test(value)
    checklist.special = /[^A-Za-z0-9]/.test(value)
  },
  { immediate: true }
)

watch(
  () => route.query.token,
  (value) => {
    token.value = typeof value === 'string' ? value : ''
  }
)

const passwordValid = computed(() => Object.values(checklist).every(Boolean))

function validate() {
  let valid = true

  if (!token.value) {
    fieldErrors.token = 'Reset link is invalid or has expired.'
    valid = false
  } else {
    fieldErrors.token = ''
  }

  fieldErrors.password = passwordValid.value ? '' : 'Password does not meet the requirements.'
  if (!passwordValid.value) valid = false

  const matches = form.password && form.password === form.confirmPassword
  fieldErrors.confirmPassword = matches ? '' : 'Passwords must match.'
  if (!matches) valid = false

  return valid
}

async function handleSubmit() {
  formMessage.value = ''
  isSuccess.value = false

  if (!validate()) return

  isLoading.value = true
  try {
    const response = await resetPassword({
      token: token.value,
      password: form.password,
      confirmPassword: form.confirmPassword
    })
    formMessage.value = response.message || 'Password updated successfully.'
    isSuccess.value = true
    form.password = ''
    form.confirmPassword = ''
  } catch (err) {
    formMessage.value = err?.message || 'Failed to reset password. Please try again.'
    isSuccess.value = false
    window.$toast?.error(formMessage.value)
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push('/login')
}
</script>

<template>
  <AuthLayout
    title="Reset your password"
    subtitle="Create a new password that people won't easily guess."
    :show-back="true"
    back-label="Back to Login"
    @back="goBack"
  >
    <template #back-icon>
      <ArrowLeft :size="16" />
    </template>

    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <FormField
        label="New password"
        :error="fieldErrors.password"
        required
        for="reset-password"
      >
        <BaseInput
          id="reset-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Enter a new password"
          autocomplete="new-password"
        >
          <template #prefix>
            <Lock :size="18" />
          </template>
          <template #suffix>
            <button
              type="button"
              class="icon-button"
              @click="showPassword = !showPassword"
              :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </template>
        </BaseInput>
      </FormField>

      <div class="password-checklist" aria-live="polite">
        <div
          v-for="(met, key) in checklist"
          :key="key"
          :class="['password-checklist__item', { 'is-met': met }]"
        >
          <span class="password-checklist__icon" aria-hidden="true">
            {{ met ? '✓' : '○' }}
          </span>
          <span class="password-checklist__text">
            {{
              key === 'length'
                ? 'At least 8 characters'
                : key === 'uppercase'
                  ? 'One uppercase letter (A-Z)'
                  : key === 'digit'
                    ? 'One number (0-9)'
                    : 'One special character (!@#$%^&*)'
            }}
          </span>
        </div>
      </div>

      <FormField
        label="Confirm password"
        :error="fieldErrors.confirmPassword"
        required
        for="reset-confirm"
      >
        <BaseInput
          id="reset-confirm"
          v-model="form.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          placeholder="Re-enter your new password"
          autocomplete="new-password"
        >
          <template #prefix>
            <Lock :size="18" />
          </template>
          <template #suffix>
            <button
              type="button"
              class="icon-button"
              @click="showConfirmPassword = !showConfirmPassword"
              :aria-pressed="showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            >
              <EyeOff v-if="showConfirmPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </template>
        </BaseInput>
      </FormField>

      <p v-if="fieldErrors.token" class="form-error">
        {{ fieldErrors.token }}
      </p>

      <BaseButton
        variant="primary"
        size="md"
        block
        type="submit"
        :loading="isLoading"
        :disabled="!!fieldErrors.token"
      >
        <Shield :size="18" />
        Reset password
      </BaseButton>

      <p
        v-if="formMessage"
        class="form-message"
        :class="{ 'is-success': isSuccess, 'is-error': !isSuccess }"
      >
        {{ formMessage }}
      </p>
    </form>

    <div v-if="isSuccess" class="success-card">
      <div class="success-icon" aria-hidden="true">
        <CheckCircle :size="20" />
      </div>
      <div class="success-content">
        <p>You can now <router-link to="/login" class="success-link">log in</router-link> with your new password.</p>
      </div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: var(--space-5);
}

.icon-button {
  border: none;
  background: none;
  padding: var(--space-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--transition-base);
}

.icon-button:hover {
  color: var(--color-primary);
}

.password-checklist {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  font-size: var(--font-size-sm);
}

.password-checklist__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.password-checklist__item.is-met {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.password-checklist__icon {
  font-size: 0.9rem;
  width: 1.25rem;
}

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  text-align: center;
}

.form-message {
  margin: 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.form-message.is-success {
  color: var(--color-success);
}

.success-card {
  margin-top: var(--space-6);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(14, 165, 233, 0.3);
  background: rgba(14, 165, 233, 0.08);
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.success-icon {
  color: #0ea5e9;
  flex-shrink: 0;
  display: flex;
}

.success-content {
  color: #0c4a6e;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.success-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.success-link:hover {
  color: var(--color-primary-dark);
}

@media (max-width: 480px) {
  .auth-form {
    gap: var(--space-4);
  }
}

body.dark .password-checklist {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .success-card {
  border-color: rgba(14, 165, 233, 0.45);
  background: rgba(14, 165, 233, 0.12);
}

body.dark .success-content {
  color: #dbeafe;
}
</style>
