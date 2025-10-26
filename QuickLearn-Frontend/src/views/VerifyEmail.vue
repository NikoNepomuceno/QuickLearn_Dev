<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { verifyEmail, resendOtp } from '../services/authService'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const email = ref((route.query.email || '').toString())
const otpDigits = ref(['', '', '', '', '', ''])
const otpInputs = ref([])
const otp = ref('')
const isLoading = ref(false)
const error = ref('')
const resendCooldown = ref(0)
let resendTimer = null

function goHome() {
  router.push('/')
}

function handleOtpInput(index, event) {
  const value = event.target.value.replace(/[^0-9]/g, '')
  if (value.length > 1) {
    otpDigits.value[index] = value.slice(-1)
    event.target.value = otpDigits.value[index]
  } else {
    otpDigits.value[index] = value
  }
  otp.value = otpDigits.value.join('')
  if (value && index < 5) otpInputs.value[index + 1]?.focus()
}

function handleOtpKeydown(index, event) {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowLeft' && index > 0) otpInputs.value[index - 1]?.focus()
  if (event.key === 'ArrowRight' && index < 5) otpInputs.value[index + 1]?.focus()
}

function handleOtpKeypress(event) {
  // Only allow numeric keys (0-9)
  if (!/[0-9]/.test(event.key)) {
    event.preventDefault()
  }
}

function handleOtpPaste(event) {
  event.preventDefault()
  const pastedData = event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) otpDigits.value[i] = pastedData[i] || ''
  otp.value = otpDigits.value.join('')
  const nextEmptyIndex = otpDigits.value.findIndex((d) => !d)
  const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5
  otpInputs.value[focusIndex]?.focus()
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

async function onVerify(e) {
  e.preventDefault()
  error.value = ''
  isLoading.value = true
  try {
    await verifyEmail({ email: email.value, otp: otp.value })
    window.$toast?.success('Email verified! Welcome to QuickLearn.')
    try { sessionStorage.removeItem('verifyEmailPending') } catch {}
    router.push('/upload')
  } catch (err) {
    error.value = err?.message || 'Verification failed'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

async function onResendOtp() {
  if (resendCooldown.value > 0) return
  error.value = ''
  isLoading.value = true
  try {
    await resendOtp({ email: email.value })
    window.$toast?.success('New verification code sent!')
    startResendCooldown()
  } catch (err) {
    error.value = err?.message || 'Failed to resend code'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <button class="link" @click="goHome">
        <ArrowLeft :size="16" />
        Back to Home
      </button>

      <div class="avatar-container">
        <div class="avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <h1>Verify Email</h1>
      <p class="subtitle" v-if="email">We sent a one-time code to {{ email }}. Enter it below to verify your email.</p>
      <div v-else class="subtitle">Enter the email you used to sign up and your verification code.</div>

      <form @submit="onVerify" class="form">
        <div v-if="!email" class="input-group">
          <input v-model="email" type="email" required placeholder="Email" />
        </div>

        <div class="otp-container">
          <label class="otp-label">Verification Code</label>
          <div class="otp-inputs">
            <input
              v-for="(digit, index) in otpDigits"
              :key="index"
              :ref="(el) => (otpInputs[index] = el)"
              v-model="otpDigits[index]"
              type="text"
              maxlength="1"
              pattern="[0-9]"
              class="otp-input"
              :class="{ filled: digit }"
              @input="handleOtpInput(index, $event)"
              @keydown="handleOtpKeydown(index, $event)"
              @paste="handleOtpPaste($event)"
              @keypress="handleOtpKeypress($event)"
              autocomplete="one-time-code"
              inputmode="numeric"
            />
          </div>
        </div>

        <button class="primary" type="submit" :disabled="isLoading || otp.length !== 6 || !email">
          {{ isLoading ? 'Verifying…' : 'Verify Email' }}
        </button>

        <div class="resend-section">
          <p class="resend-text">Didn't receive the code?</p>
          <button type="button" class="resend-btn" @click="onResendOtp" :disabled="isLoading || resendCooldown > 0 || !email">
            {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: #E0E6F0;
}

.card {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
}

.link {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
  font-size: 14px;
}

.link:hover { color: #5a67d8; }

.avatar-container { display: flex; justify-content: center; margin-bottom: 24px; }
.avatar {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; text-align: center; color: #1a202c; }
.subtitle { color: #6b7280; margin: 0 0 24px; text-align: center; font-size: 16px; }

.form { display: grid; gap: 20px; }
.input-group { position: relative; display: flex; align-items: center; }
input {
  padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px;
  font-size: 16px; width: 100%; transition: all 0.2s ease; background: #fff;
}
input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }

.primary {
  padding: 16px; border-radius: 12px; border: none; color: #fff; font-weight: 600; font-size: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; margin-top: 8px;
}
.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); }
.primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.error { color: #e53e3e; margin: 8px 0 0; text-align: center; font-size: 14px; }

.resend-section { margin-top: 16px; text-align: center; }
.resend-text { margin: 0 0 8px; color: #6b7280; font-size: 14px; }
.resend-btn {
  background: none; border: 1px solid #d1d5db; color: #667eea; padding: 8px 16px;
  border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s;
}
.resend-btn:hover:not(:disabled) { border-color: #667eea; background: #f8fafc; }
.resend-btn:disabled { opacity: 0.5; cursor: not-allowed; color: #9ca3af; border-color: #e5e7eb; }

.otp-container { margin: 8px 0; }
.otp-label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
.otp-inputs { display: flex; gap: 8px; justify-content: center; }

.otp-input {
  width: 48px; height: 48px; text-align: center; font-size: 18px; font-weight: 600;
  border: 2px solid #d1d5db; border-radius: 8px; background: #fff; transition: all 0.2s;
  padding: 0; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
}
.otp-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
.otp-input.filled { border-color: #10b981; background: #f0fdf4; }
.otp-input:invalid { border-color: #ef4444; }

/* Dark mode */
body.dark .auth-page { background: #131C30; }
body.dark .card { background: #1a202c; color: #e2e8f0; }
body.dark h1 { color: #e2e8f0; }
body.dark .subtitle { color: #a0aec0; }
body.dark input { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
body.dark input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
body.dark .resend-text { color: #a0aec0; }
body.dark .resend-btn { background: #2d3748; border: 1px solid #4a5568; color: #667eea; }
body.dark .resend-btn:hover:not(:disabled) { border-color: #667eea; background: #4a5568; }
body.dark .otp-label { color: #e2e8f0; }
body.dark .otp-input { background: #2d3748; border: 2px solid #4a5568; color: #e2e8f0; }
body.dark .otp-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
body.dark .otp-input.filled { border-color: #10b981; background: #064e3b; }
</style>