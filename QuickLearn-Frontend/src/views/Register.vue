<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { registerUser, verifyEmail, resendOtp } from '../services/authService'
import PrivacyPolicyModal from '../components/PrivacyPolicyModal.vue'
import { ArrowLeft, User, Mail, Lock, UserPlus } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const step = ref(1)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const otp = ref('')
const isLoading = ref(false)
const error = ref('')
const showPrivacy = ref(false)
const acceptedPrivacy = ref(false)
const resendCooldown = ref(0)
const resendTimer = ref(null)
const otpDigits = ref(['', '', '', '', '', ''])
const otpInputs = ref([])

// Password validation
const passwordRequirements = {
  length: { text: 'At least 8 characters', met: false },
  uppercase: { text: 'One uppercase letter (A-Z)', met: false },
  digit: { text: 'One number (0-9)', met: false },
  special: { text: 'One special character (!@#$%^&*)', met: false },
}

function validatePassword() {
  const pwd = password.value
  passwordRequirements.length.met = pwd.length >= 8
  passwordRequirements.uppercase.met = /[A-Z]/.test(pwd)
  passwordRequirements.digit.met = /\d/.test(pwd)
  passwordRequirements.special.met = /[^A-Za-z0-9]/.test(pwd)
}

function isPasswordValid() {
  return Object.values(passwordRequirements).every((req) => req.met)
}

async function onRegister(e) {
  e.preventDefault()
  error.value = ''
  isLoading.value = true
  try {
    await registerUser({
      username: username.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    step.value = 2
    window.$toast?.success('Account created! Check your email for the verification code.')
  } catch (err) {
    error.value = err?.message || 'Registration failed'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

async function onVerify(e) {
  e.preventDefault()
  error.value = ''
  isLoading.value = true
  try {
    await verifyEmail({ email: email.value, otp: otp.value })
    window.$toast?.success('Email verified! You can now log in.')
    router.push('/login')
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

function startResendCooldown() {
  resendCooldown.value = 60 // 60 seconds cooldown
  resendTimer.value = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer.value)
      resendTimer.value = null
    }
  }, 1000)
}

// OTP input handling
function handleOtpInput(index, event) {
  const value = event.target.value

  // Only allow single digit
  if (value.length > 1) {
    otpDigits.value[index] = value.slice(-1)
    event.target.value = otpDigits.value[index]
  } else {
    otpDigits.value[index] = value
  }

  // Update the main otp ref
  otp.value = otpDigits.value.join('')

  // Auto-focus next input
  if (value && index < 5) {
    otpInputs.value[index + 1]?.focus()
  }
}

function handleOtpKeydown(index, event) {
  // Handle backspace
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }

  // Handle arrow keys
  if (event.key === 'ArrowLeft' && index > 0) {
    otpInputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowRight' && index < 5) {
    otpInputs.value[index + 1]?.focus()
  }
}

function handleOtpPaste(event) {
  event.preventDefault()
  const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

  for (let i = 0; i < 6; i++) {
    otpDigits.value[i] = pastedData[i] || ''
  }

  // Update the main otp ref
  otp.value = otpDigits.value.join('')

  // Focus the next empty field or the last field
  const nextEmptyIndex = otpDigits.value.findIndex((digit) => !digit)
  const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5
  otpInputs.value[focusIndex]?.focus()
}

function goHome() {
  router.push('/')
}

if (route.query.pp === '1') {
  showPrivacy.value = true
}
</script>

<template>
  <div class="auth-page">
    <div class="wave-bg" aria-hidden="true"></div>
    <div class="card">
      <button class="link" @click="goHome">
        <ArrowLeft :size="16" />
        Back to Home
      </button>
      <h1>Create Account</h1>
      <p class="subtitle">Sign up to start generating quizzes.</p>

      <form v-if="step === 1" @submit="onRegister" class="form">
        <label>
          <span>Username</span>
          <div class="input-group">
            <User class="input-icon" :size="18" />
            <input v-model="username" type="text" required placeholder="janedoe" />
          </div>
        </label>
        <label>
          <span>Email</span>
          <div class="input-group">
            <Mail class="input-icon" :size="18" />
            <input v-model="email" type="email" required placeholder="janedoe@gmail.com" />
          </div>
        </label>
        <label>
          <span>Password</span>
          <div class="input-group">
            <Lock class="input-icon" :size="18" />
            <input v-model="password" type="password" required @input="validatePassword" />
          </div>
          <div v-if="password" class="password-requirements">
            <div class="requirement" :class="{ met: passwordRequirements.length.met }">
              <span class="check">{{ passwordRequirements.length.met ? '✓' : '○' }}</span>
              {{ passwordRequirements.length.text }}
            </div>
            <div class="requirement" :class="{ met: passwordRequirements.uppercase.met }">
              <span class="check">{{ passwordRequirements.uppercase.met ? '✓' : '○' }}</span>
              {{ passwordRequirements.uppercase.text }}
            </div>
            <div class="requirement" :class="{ met: passwordRequirements.digit.met }">
              <span class="check">{{ passwordRequirements.digit.met ? '✓' : '○' }}</span>
              {{ passwordRequirements.digit.text }}
            </div>
            <div class="requirement" :class="{ met: passwordRequirements.special.met }">
              <span class="check">{{ passwordRequirements.special.met ? '✓' : '○' }}</span>
              {{ passwordRequirements.special.text }}
            </div>
          </div>
        </label>
        <label>
          <span>Confirm Password</span>
          <div class="input-group">
            <Lock class="input-icon" :size="18" />
            <input v-model="confirmPassword" type="password" required />
          </div>
          <div v-if="confirmPassword && password !== confirmPassword" class="password-mismatch">
            Passwords do not match
          </div>
        </label>
        <label class="pp-row">
          <div class="pp-check">
            <input id="pp-accept" v-model="acceptedPrivacy" type="checkbox" required />
          </div>
          <div class="pp-text">
            <!-- <Shield class="pp-icon" :size="16" /> -->
            <span>I agree to the</span>
            <button type="button" class="link inline" @click="showPrivacy = true">
              Privacy Policy
            </button>
          </div>
        </label>
        <button
          class="primary"
          type="submit"
          :disabled="
            isLoading || !acceptedPrivacy || !isPasswordValid() || password !== confirmPassword
          "
        >
          <UserPlus v-if="!isLoading" :size="18" />
          <div v-else class="spinner"></div>
          {{ isLoading ? 'Creating…' : 'Create Account' }}
        </button>
        <!-- <p v-if="error" class="error">{{ error }}</p> -->
        <div class="hint-row">
          <span>Already have an account?</span>
          <router-link to="/login">Sign in</router-link>
        </div>
      </form>

      <form v-else @submit="onVerify" class="form">
        <p>We sent a one-time code to {{ email }}. Enter it below to verify your email.</p>
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
              class="otp-input"
              :class="{ filled: digit }"
              @input="handleOtpInput(index, $event)"
              @keydown="handleOtpKeydown(index, $event)"
              @paste="handleOtpPaste($event)"
              autocomplete="one-time-code"
            />
          </div>
        </div>
        <button class="primary" type="submit" :disabled="isLoading || otp.length !== 6">
          {{ isLoading ? 'Verifying…' : 'Verify Email' }}
        </button>
        <div class="resend-section">
          <p class="resend-text">Didn't receive the code?</p>
          <button
            type="button"
            class="resend-btn"
            @click="onResendOtp"
            :disabled="isLoading || resendCooldown > 0"
          >
            {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
    <PrivacyPolicyModal v-model="showPrivacy" @accept="acceptedPrivacy = true" />
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
  overflow: hidden;
}

.wave-bg {
  position: absolute;
  inset: -10% -10% -10% -10%;
  z-index: -1;
}

.wave-bg::before,
.wave-bg::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 160vw;
  height: 160vw;
  border-radius: 45%;
  filter: blur(40px);
  opacity: 0.45;
  animation: wave 18s ease-in-out infinite;
  background:
    radial-gradient(circle at 30% 30%, rgba(102, 126, 234, 0.45), transparent 55%),
    radial-gradient(circle at 70% 40%, rgba(118, 75, 162, 0.45), transparent 60%),
    radial-gradient(circle at 50% 70%, rgba(59, 130, 246, 0.35), transparent 55%);
}

.wave-bg::after {
  animation-duration: 26s;
  animation-delay: -6s;
  opacity: 0.35;
  background:
    radial-gradient(circle at 70% 60%, rgba(16, 185, 129, 0.35), transparent 55%),
    radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.35), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.25), transparent 55%);
}
@keyframes wave {
  0% {
    top: -30%;
    border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%;
  }
  25% {
    top: -20%;
    border-radius: 58% 42% 62% 38% / 37% 63% 37% 63%;
  }
  50% {
    top: -35%;
    border-radius: 52% 48% 55% 45% / 52% 48% 55% 45%;
  }
  75% {
    top: -25%;
    border-radius: 60% 40% 40% 60% / 45% 55% 45% 55%;
  }
  100% {
    top: -30%;
    border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%;
  }
}

.card {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(50, 50, 93, 0.05);
}

/* Dark mode styles */
body.dark .wave-bg::before,
body.dark .wave-bg::after {
  background:
    radial-gradient(circle at 30% 30%, rgba(102, 126, 234, 0.25), transparent 55%),
    radial-gradient(circle at 70% 40%, rgba(118, 75, 162, 0.25), transparent 60%),
    radial-gradient(circle at 50% 70%, rgba(59, 130, 246, 0.15), transparent 55%);
}

body.dark .wave-bg::after {
  background:
    radial-gradient(circle at 70% 60%, rgba(16, 185, 129, 0.15), transparent 55%),
    radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.15), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1), transparent 55%);
}

body.dark .card {
  background: #0f172a;
  border: 1px solid #1f2a44;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.link {
  background: none;
  border: none;
  color: #5562ea;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}
.link:hover {
  color: #4338ca;
}

.link.inline {
  margin: 0 0 0 4px;
}

h1 {
  margin: 6px 0 4px;
  font-size: 26px;
}

.subtitle {
  color: #6b7280;
  margin: 0 0 16px;
}

body.dark .link {
  color: #a5b4fc;
}

body.dark .link:hover {
  color: #c7d2fe;
}

body.dark h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

.form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  z-index: 1;
}

input {
  padding: 12px 12px 12px 42px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  width: 100%;
  transition: all 0.2s ease;
}
input:focus {
  outline: none;
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}
input:focus + .input-icon,
input:focus ~ .input-icon {
  color: #7b86f2;
}

.primary {
  padding: 12px;
  border-radius: 10px;
  border: none;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}
.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  color: #b00020;
  margin: 6px 0 0;
}
.hint-row {
  margin-top: 12px;
  font-size: 14px;
  color: #6b7280;
  display: flex;
  gap: 6px;
}
.hint-row a {
  color: #5562ea;
}
.pp-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pp-check {
  display: flex;
  align-items: center;
}
.pp-text {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
}

body.dark .error {
  color: #fca5a5;
}

body.dark .hint-row {
  color: #9ca3af;
}

body.dark .hint-row a {
  color: #a5b4fc;
}

body.dark .pp-text {
  color: #9ca3af;
}
.pp-icon {
  color: #667eea;
}
.password-requirements {
  margin-top: 8px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.requirement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
  color: #64748b;
}
.requirement.met {
  color: #059669;
}
.check {
  font-weight: bold;
  font-size: 14px;
}
.password-mismatch {
  margin-top: 4px;
  color: #dc2626;
  font-size: 13px;
}

body.dark label span {
  color: #e5e7eb;
}

body.dark .input-icon {
  color: #6b7280;
}

body.dark input {
  background: #1f2a44;
  border: 1px solid #334155;
  color: #e5e7eb;
}

body.dark input:focus {
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}

body.dark input:focus + .input-icon,
body.dark input:focus ~ .input-icon {
  color: #7b86f2;
}

body.dark .password-requirements {
  background: #1f2a44;
  border: 1px solid #334155;
}

body.dark .requirement {
  color: #9ca3af;
}

body.dark .requirement.met {
  color: #10b981;
}

body.dark .password-mismatch {
  color: #fca5a5;
}
.resend-section {
  margin-top: 16px;
  text-align: center;
}
.resend-text {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 14px;
}
.resend-btn {
  background: none;
  border: 1px solid #d1d5db;
  color: #5562ea;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.resend-btn:hover:not(:disabled) {
  border-color: #5562ea;
  background: #f8fafc;
}
.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9ca3af;
  border-color: #e5e7eb;
}
.otp-container {
  margin: 16px 0;
}
.otp-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}
.otp-inputs {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.otp-input {
  width: 48px;
  height: 48px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  transition: all 0.2s;
}
.otp-input:focus {
  outline: none;
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}
.otp-input.filled {
  border-color: #10b981;
  background: #f0fdf4;
}
.otp-input:invalid {
  border-color: #ef4444;
}

body.dark .resend-text {
  color: #9ca3af;
}

body.dark .resend-btn {
  background: #1f2a44;
  border: 1px solid #334155;
  color: #a5b4fc;
}

body.dark .resend-btn:hover:not(:disabled) {
  border-color: #a5b4fc;
  background: #334155;
}

body.dark .resend-btn:disabled {
  color: #6b7280;
  border-color: #334155;
}

body.dark .otp-label {
  color: #e5e7eb;
}

body.dark .otp-input {
  background: #1f2a44;
  border: 2px solid #334155;
  color: #e5e7eb;
}

body.dark .otp-input:focus {
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}

body.dark .otp-input.filled {
  border-color: #10b981;
  background: #064e3b;
}

/* Responsive design */
@media (max-width: 768px) {
  .auth-page {
    padding: 16px;
  }

  .card {
    padding: 20px;
    max-width: 100%;
  }

  h1 {
    font-size: 22px;
  }

  .subtitle {
    font-size: 14px;
  }

  .form {
    gap: 16px;
  }

  .input-group {
    position: relative;
  }

  .input-icon {
    left: 10px;
  }

  input {
    padding: 12px 12px 12px 38px;
    font-size: 16px;
  }

  .primary {
    padding: 14px;
    font-size: 16px;
  }

  .password-requirements {
    padding: 10px;
    font-size: 12px;
  }

  .requirement {
    font-size: 12px;
    margin: 3px 0;
  }

  .otp-container {
    margin: 12px 0;
  }

  .otp-inputs {
    gap: 6px;
  }

  .otp-input {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .pp-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .pp-text {
    font-size: 13px;
    line-height: 1.4;
  }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 12px;
  }

  .card {
    padding: 16px;
  }

  h1 {
    font-size: 20px;
  }

  .form {
    gap: 14px;
  }

  input {
    padding: 10px 10px 10px 36px;
  }

  .primary {
    padding: 12px;
    font-size: 15px;
  }

  .hint-row {
    font-size: 13px;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .password-requirements {
    padding: 8px;
    font-size: 11px;
  }

  .requirement {
    font-size: 11px;
    margin: 2px 0;
  }

  .otp-inputs {
    gap: 4px;
  }

  .otp-input {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .resend-section {
    margin-top: 12px;
  }

  .resend-text {
    font-size: 13px;
  }

  .resend-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
