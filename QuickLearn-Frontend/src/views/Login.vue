<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser } from '../services/authService'
import { ArrowLeft, Mail, Lock, LogIn } from 'lucide-vue-next'

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
      <button class="link" @click="goHome">
        <ArrowLeft :size="16" />
        Back to Home
      </button>
      <h1>Login</h1>
      <p class="subtitle">Welcome back! Sign in to continue.</p>
      <form @submit="onSubmit" class="form">
        <label>
          <span>Email or Username</span>
          <div class="input-group">
            <Mail class="input-icon" :size="18" />
            <input v-model="identifier" type="text" required placeholder="janedoe@gmail.com" />
          </div>
        </label>
        <label>
          <span>Password</span>
          <div class="input-group">
            <Lock class="input-icon" :size="18" />
            <input v-model="password" type="password" required placeholder="••••••••" />
          </div>
        </label>
        <button class="primary" type="submit" :disabled="isLoading">
          <LogIn v-if="!isLoading" :size="18" />
          <div v-else class="spinner"></div>
          {{ isLoading ? 'Signing in…' : 'Sign In' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <div class="hint-row">
        <span>New here?</span>
        <router-link to="/register">Create an account</router-link>
      </div>
      <div class="hint-row">
        <router-link to="/forgot-password">Forgot your password?</router-link>
      </div>
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
  max-width: 420px;
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

body.dark .link {
  color: #a5b4fc;
}

body.dark .link:hover {
  color: #c7d2fe;
}

h1 {
  margin: 6px 0 4px;
  font-size: 26px;
}
.subtitle {
  color: #6b7280;
  margin: 0 0 16px;
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

body.dark .error {
  color: #fca5a5;
}

body.dark .hint-row {
  color: #9ca3af;
}

body.dark .hint-row a {
  color: #a5b4fc;
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
}
</style>
