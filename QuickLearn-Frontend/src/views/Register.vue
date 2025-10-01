<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser, verifyEmail } from '../services/authService'

const router = useRouter()
const step = ref(1)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const otp = ref('')
const isLoading = ref(false)
const error = ref('')

async function onRegister(e) {
  e.preventDefault()
  error.value = ''
  isLoading.value = true
  try {
    await registerUser({ username: username.value, email: email.value, password: password.value, confirmPassword: confirmPassword.value })
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

function goHome() { router.push('/') }
</script>

<template>
  <div class="auth-page">
    <div class="wave-bg" aria-hidden="true"></div>
    <div class="card">
      <button class="link" @click="goHome">← Back to Home</button>
      <h1>Create Account</h1>
      <p class="subtitle">Sign up to start generating quizzes.</p>

      <form v-if="step === 1" @submit="onRegister" class="form">
        <label>
          <span>Username</span>
          <input v-model="username" type="text" required placeholder="janedoe" />
        </label>
        <label>
          <span>Email</span>
          <input v-model="email" type="email" required placeholder="jane@doe.com" />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" required />
        </label>
        <label>
          <span>Confirm Password</span>
          <input v-model="confirmPassword" type="password" required />
        </label>
        <button class="primary" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Creating…' : 'Create Account' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="hint-row">
          <span>Already have an account?</span>
          <router-link to="/login">Sign in</router-link>
        </div>
      </form>

      <form v-else @submit="onVerify" class="form">
        <p>We sent a one-time code to {{ email }}. Enter it below to verify your email.</p>
        <label>
          <span>Verification Code</span>
          <input v-model="otp" type="text" required placeholder="123456" />
        </label>
        <button class="primary" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Verifying…' : 'Verify Email' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page { position:relative; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; overflow:hidden; }
.wave-bg { position:absolute; inset:-10% -10% -10% -10%; z-index:-1; }
.wave-bg::before, .wave-bg::after { content:""; position:absolute; left:50%; transform:translateX(-50%); width:160vw; height:160vw; border-radius:45%; filter:blur(40px); opacity:0.45; animation:wave 18s ease-in-out infinite; background:radial-gradient(circle at 30% 30%, rgba(102,126,234,0.45), transparent 55%), radial-gradient(circle at 70% 40%, rgba(118,75,162,0.45), transparent 60%), radial-gradient(circle at 50% 70%, rgba(59,130,246,0.35), transparent 55%); }
.wave-bg::after { animation-duration: 26s; animation-delay:-6s; opacity:0.35; background:radial-gradient(circle at 70% 60%, rgba(16,185,129,0.35), transparent 55%), radial-gradient(circle at 30% 40%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.25), transparent 55%); }
@keyframes wave { 0% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; } 25% { top: -20%; border-radius: 58% 42% 62% 38% / 37% 63% 37% 63%; } 50% { top: -35%; border-radius: 52% 48% 55% 45% / 52% 48% 55% 45%; } 75% { top: -25%; border-radius: 60% 40% 40% 60% / 45% 55% 45% 55%; } 100% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; } }
.card { width:100%; max-width:480px; background:#fff; border:1px solid #e6e8ec; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(50,50,93,0.05); }
.link { background:none; border:none; color:#5562ea; cursor:pointer; padding:0; margin-bottom:8px; }
h1 { margin:6px 0 4px; font-size:26px; }
.subtitle { color:#6b7280; margin:0 0 16px; }
.form { display:grid; gap:12px; }
label { display:grid; gap:6px; }
input { padding:12px; border:1px solid #d1d5db; border-radius:10px; font-size:14px; }
input:focus { outline:none; border-color:#7b86f2; box-shadow:0 0 0 3px rgba(123,134,242,0.2); }
.primary { padding:12px; border-radius:10px; border:none; color:#fff; font-weight:600; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); cursor:pointer; }
.error { color:#b00020; margin:6px 0 0; }
.hint-row { margin-top:12px; font-size:14px; color:#6b7280; display:flex; gap:6px; }
.hint-row a { color:#5562ea; }
</style>


