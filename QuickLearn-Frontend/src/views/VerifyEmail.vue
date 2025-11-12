<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Mail } from 'lucide-vue-next'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import { resendOtp, verifyEmail } from '@/services/authService'

const router = useRouter()
const route = useRoute()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const otpDigits = reactive(['', '', '', '', '', ''])
const otpInputs = ref([])
const isLoading = ref(false)
const resendCooldown = ref(0)
let resendTimer = null

const otpValue = ref('')

function focusDigit(index) {
  const el = otpInputs.value[index]
  if (el) el.focus()
}

function handleInput(index, event) {
  const value = event.target.value.replace(/[^0-9]/g, '')
  otpDigits[index] = value.slice(-1)
  otpValue.value = otpDigits.join('')
  if (value && index < otpDigits.length - 1) {
    focusDigit(index + 1)
  }
}

function handleKeydown(index, event) {
  if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
    focusDigit(index - 1)
  }
  if (event.key === 'ArrowLeft' && index > 0) focusDigit(index - 1)
  if (event.key === 'ArrowRight' && index < otpDigits.length - 1) focusDigit(index + 1)
}

function handleKeypress(event) {
  if (!/[0-9]/.test(event.key)) {
    event.preventDefault()
  }
}

function handlePaste(event) {
  event.preventDefault()
  const pasted = event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
  pasted.split('').forEach((digit, idx) => {
    otpDigits[idx] = digit
  })
  otpValue.value = otpDigits.join('')
  const nextIndex = pasted.length < otpDigits.length ? pasted.length : otpDigits.length - 1
  focusDigit(nextIndex)
}

function startResendCooldown() {
  resendCooldown.value = 60
  clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

async function handleVerify() {
  if (!email.value || otpValue.value.length !== 6) {
    window.$toast?.error('Enter the email and 6-digit code sent to you.')
    return
  }

  isLoading.value = true
  try {
    await verifyEmail({ email: email.value, otp: otpValue.value })
    window.$toast?.success('Email verified! Welcome to QuickLearn.')
    try {
      sessionStorage.removeItem('verifyEmailPending')
    } catch {}
    router.push('/upload')
  } catch (err) {
    const message = err?.message || 'Verification failed. Please try again.'
    window.$toast?.error(message)
  } finally {
    isLoading.value = false
  }
}

async function handleResend() {
  if (!email.value) {
    window.$toast?.error('Enter your email to resend the code.')
    return
  }
  if (resendCooldown.value > 0) return
  isLoading.value = true
  try {
    await resendOtp({ email: email.value })
    window.$toast?.success('New verification code sent!')
    startResendCooldown()
  } catch (err) {
    const message = err?.message || 'Failed to resend code.'
    window.$toast?.error(message)
  } finally {
    isLoading.value = false
  }
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  if (!email.value) {
    try {
      const pending = sessionStorage.getItem('verifyEmailPending')
      if (pending) email.value = pending
    } catch {}
  }
  focusDigit(0)
})

onBeforeUnmount(() => {
  clearInterval(resendTimer)
})
</script>

<template>
  <AuthLayout
    title="Verify your email"
    :subtitle="email ? `We sent a one-time code to ${email}. Enter it below to continue.` : 'Enter the email you used when signing up and the verification code you received.'"
    :show-back="true"
    back-label="Back to Home"
    @back="goHome"
  >
    <template #back-icon>
      <ArrowLeft :size="16" />
    </template>

    <form class="auth-form" @submit.prevent="handleVerify" novalidate>
      <FormField
        label="Email"
        required
        for="verify-email"
      >
        <BaseInput
          id="verify-email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
        >
          <template #prefix>
            <Mail :size="18" />
          </template>
        </BaseInput>
      </FormField>

      <div class="otp-section">
        <label class="otp-label" for="otp-0">Verification code</label>
        <div class="otp-inputs">
          <input
            v-for="(_, index) in otpDigits"
            :key="index"
            :id="`otp-${index}`"
            :ref="(el) => (otpInputs[index] = el)"
            v-model="otpDigits[index]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="otp-input"
            :class="{ filled: otpDigits[index] }"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            @keypress="handleKeypress"
            @paste="handlePaste"
            autocomplete="one-time-code"
          />
        </div>
      </div>

      <BaseButton
        variant="primary"
        size="md"
        block
        type="submit"
        :loading="isLoading"
        :disabled="otpValue.length !== 6"
      >
        Verify email
      </BaseButton>

      <div class="resend-row">
        <span>Didn't get the code?</span>
        <button
          type="button"
          class="resend-link"
          :disabled="isLoading || resendCooldown > 0"
          @click="handleResend"
        >
          {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code' }}
        </button>
      </div>
    </form>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: var(--space-5);
}

.otp-section {
  display: grid;
  gap: var(--space-3);
}

.otp-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.otp-inputs {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.otp-input {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
}

.otp-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.18);
}

.otp-input.filled {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.08);
}

.resend-row {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.resend-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: color var(--transition-base);
}

.resend-link[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.resend-link:not([disabled]):hover {
  color: var(--color-primary-dark);
}

@media (max-width: 480px) {
  .otp-input {
    width: 42px;
    height: 52px;
  }
}

body.dark .otp-input {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
  color: var(--color-text);
}

body.dark .otp-input.filled {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.18);
}
</style>