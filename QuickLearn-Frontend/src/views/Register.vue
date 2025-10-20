<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { registerUser, verifyEmail, resendOtp } from '../services/authService'
import PrivacyPolicyModal from '../components/PrivacyPolicyModal.vue'
import { ArrowLeft, User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-vue-next'

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
const showPassword = ref(false)
const showConfirmPassword = ref(false)

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

function togglePassword() {
  showPassword.value = !showPassword.value
}

function toggleConfirmPassword() {
  showConfirmPassword.value = !showConfirmPassword.value
}

function handleGoogleLogin() {
  // TODO: Implement Google OAuth
  console.log('Google login clicked')
}

function handleGitHubLogin() {
  // TODO: Implement GitHub OAuth
  console.log('GitHub login clicked')
}

if (route.query.pp === '1') {
  showPrivacy.value = true
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <button class="link" @click="goHome">
        <ArrowLeft :size="16" />
        Back to Home
      </button>
      
      <!-- Avatar Icon -->
      <div class="avatar-container">
        <div class="avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      
      <h1>Create Account</h1>
      <p class="subtitle">Sign up to start generating quizzes.</p>

      <form v-if="step === 1" @submit="onRegister" class="form">
        <div class="input-group">
          <User class="input-icon" :size="18" />
          <input v-model="username" type="text" required placeholder="Username" />
        </div>
        
        <div class="input-group">
          <Mail class="input-icon" :size="18" />
          <input v-model="email" type="email" required placeholder="Email" />
        </div>
        
        <div class="input-group">
          <Lock class="input-icon" :size="18" />
          <input v-model="password" :type="showPassword ? 'text' : 'password'" required @input="validatePassword" placeholder="Password" />
          <button type="button" class="password-toggle" @click="togglePassword">
            <Eye v-if="!showPassword" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
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
        
        <div class="input-group">
          <Lock class="input-icon" :size="18" />
          <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" required placeholder="Confirm Password" />
          <button type="button" class="password-toggle" @click="toggleConfirmPassword">
            <Eye v-if="!showConfirmPassword" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
        
        <div v-if="confirmPassword && password !== confirmPassword" class="password-mismatch">
          Passwords do not match
        </div>
        
        <div class="pp-row">
          <div class="pp-check">
            <input id="pp-accept" v-model="acceptedPrivacy" type="checkbox" required />
          </div>
          <div class="pp-text">
            <span>I agree to the</span>
            <button type="button" class="link inline" @click="showPrivacy = true">
              Privacy Policy
            </button>
          </div>
        </div>
        
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
        
        <p v-if="error" class="error">{{ error }}</p>
        
        <div class="divider">
          <span>Or continue with</span>
        </div>
        
        <div class="social-login">
          <button class="social-btn google-btn" @click="handleGoogleLogin">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          
          <button class="social-btn github-btn" @click="handleGitHubLogin">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
        
        <div class="signup-link">
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.link:hover {
  color: #5a67d8;
}

.link.inline {
  margin: 0 0 0 4px;
}

.avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  color: #1a202c;
}

.subtitle {
  color: #6b7280;
  margin: 0 0 32px;
  text-align: center;
  font-size: 16px;
}

.form {
  display: grid;
  gap: 20px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: #9ca3af;
  z-index: 1;
}

input {
  padding: 16px 16px 16px 48px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  width: 100%;
  transition: all 0.2s ease;
  background: #fff;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-toggle {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
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
  font-size: 14px;
}

.primary {
  padding: 16px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 20px;
  height: 20px;
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
  color: #e53e3e;
  margin: 8px 0 0;
  text-align: center;
  font-size: 14px;
}

.divider {
  position: relative;
  text-align: center;
  margin: 24px 0;
  color: #9ca3af;
  font-size: 14px;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
  z-index: 1;
}

.divider span {
  background: #fff;
  padding: 0 16px;
  position: relative;
  z-index: 2;
}

.social-login {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.social-btn:hover {
  border-color: #cbd5e0;
  background: #f7fafc;
  transform: translateY(-1px);
}

.google-btn:hover {
  border-color: #4285f4;
  background: #f8f9ff;
}

.github-btn:hover {
  border-color: #24292e;
  background: #f6f8fa;
}

.signup-link {
  text-align: center;
  font-size: 14px;
  color: #4a5568;
}

.signup-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.signup-link a:hover {
  color: #5a67d8;
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
  color: #667eea;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.resend-btn:hover:not(:disabled) {
  border-color: #667eea;
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
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.otp-input.filled {
  border-color: #10b981;
  background: #f0fdf4;
}

.otp-input:invalid {
  border-color: #ef4444;
}

/* Dark mode styles */
body.dark .card {
  background: #1a202c;
  color: #e2e8f0;
}

body.dark h1 {
  color: #e2e8f0;
}

body.dark .subtitle {
  color: #a0aec0;
}

body.dark input {
  background: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

body.dark input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

body.dark .input-icon {
  color: #a0aec0;
}

body.dark .password-toggle {
  color: #a0aec0;
}

body.dark .password-toggle:hover {
  color: #667eea;
}

body.dark .password-requirements {
  background: #2d3748;
  border: 1px solid #4a5568;
}

body.dark .requirement {
  color: #a0aec0;
}

body.dark .requirement.met {
  color: #10b981;
}

body.dark .password-mismatch {
  color: #fca5a5;
}

body.dark .pp-text {
  color: #a0aec0;
}

body.dark .error {
  color: #fc8181;
}

body.dark .divider {
  color: #a0aec0;
}

body.dark .divider::before {
  background: #4a5568;
}

body.dark .divider span {
  background: #1a202c;
}

body.dark .social-btn {
  background: #2d3748;
  border-color: #4a5568;
  color: #e2e8f0;
}

body.dark .social-btn:hover {
  border-color: #718096;
  background: #4a5568;
}

body.dark .signup-link {
  color: #a0aec0;
}

body.dark .signup-link a {
  color: #667eea;
}

body.dark .resend-text {
  color: #a0aec0;
}

body.dark .resend-btn {
  background: #2d3748;
  border: 1px solid #4a5568;
  color: #667eea;
}

body.dark .resend-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #4a5568;
}

body.dark .resend-btn:disabled {
  color: #6b7280;
  border-color: #4a5568;
}

body.dark .otp-label {
  color: #e2e8f0;
}

body.dark .otp-input {
  background: #2d3748;
  border: 2px solid #4a5568;
  color: #e2e8f0;
}

body.dark .otp-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
    padding: 24px;
    max-width: 100%;
  }

  h1 {
    font-size: 24px;
  }

  .subtitle {
    font-size: 14px;
  }

  .form {
    gap: 16px;
  }

  input {
    padding: 14px 14px 14px 44px;
    font-size: 16px;
  }

  .primary {
    padding: 14px;
    font-size: 16px;
  }

  .social-login {
    grid-template-columns: 1fr;
    gap: 8px;
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
    padding: 20px;
  }

  h1 {
    font-size: 22px;
  }

  .avatar {
    width: 56px;
    height: 56px;
  }

  .form {
    gap: 14px;
  }

  input {
    padding: 12px 12px 12px 40px;
    font-size: 16px;
  }

  .primary {
    padding: 12px;
    font-size: 15px;
  }

  .social-btn {
    padding: 10px 12px;
    font-size: 13px;
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