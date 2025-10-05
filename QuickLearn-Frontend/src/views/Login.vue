<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser } from '../services/authService'

const router = useRouter()
const identifier = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  isLoading.value = true
  try {
    await loginUser({ identifier: identifier.value, password: password.value })
    window.$toast?.success('Welcome back!')
    router.replace('/upload')
  } catch (err) {
    error.value = err?.message || 'Login failed'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="auth-page">
    <div class="wave-bg" aria-hidden="true"></div>
    <div class="card">
      <button class="link" @click="goHome">← Back to Home</button>
      <h1>Login</h1>
      <p class="subtitle">Welcome back! Sign in to continue.</p>
      <form @submit="onSubmit" class="form">
        <label>
          <span>Email or Username</span>
          <input v-model="identifier" type="text" required placeholder="janedoe@gmail.com" />
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" required placeholder="••••••••" />
        </label>
        <button class="primary" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Signing in…' : 'Sign In' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <div class="hint-row">
        <span>New here?</span>
        <router-link to="/register">Create an account</router-link>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.auth-page { position:relative; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; overflow:hidden; }
.wave-bg { position:absolute; inset:-10% -10% -10% -10%; z-index:-1; }
.wave-bg::before, .wave-bg::after { content:""; position:absolute; left:50%; transform:translateX(-50%); width:160vw; height:160vw; border-radius:45%; filter:blur(40px); opacity:0.45; animation:wave 18s ease-in-out infinite; background:radial-gradient(circle at 30% 30%, rgba(102,126,234,0.45), transparent 55%), radial-gradient(circle at 70% 40%, rgba(118,75,162,0.45), transparent 60%), radial-gradient(circle at 50% 70%, rgba(59,130,246,0.35), transparent 55%); }
.wave-bg::after { animation-duration: 26s; animation-delay:-6s; opacity:0.35; background:radial-gradient(circle at 70% 60%, rgba(16,185,129,0.35), transparent 55%), radial-gradient(circle at 30% 40%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.25), transparent 55%); }
@keyframes wave { 0% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; } 25% { top: -20%; border-radius: 58% 42% 62% 38% / 37% 63% 37% 63%; } 50% { top: -35%; border-radius: 52% 48% 55% 45% / 52% 48% 55% 45%; } 75% { top: -25%; border-radius: 60% 40% 40% 60% / 45% 55% 45% 55%; } 100% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; } }
.card { width:100%; max-width:420px; background:#fff; border:1px solid #e6e8ec; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(50,50,93,0.05); }
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


