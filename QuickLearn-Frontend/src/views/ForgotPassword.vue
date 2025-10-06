<template>
  <div class="auth-page">
    <div class="wave-bg" aria-hidden="true"></div>
    <div class="card">
      <button class="link" @click="goBack">
        <ArrowLeft :size="16" />
        Back to Login
      </button>
      <h1>Forgot your password?</h1>
      <p class="subtitle">Enter your email address and we'll send you a link to reset your password.</p>
      <form @submit.prevent="handleForgotPassword" class="form">
        <label>
          <span>Email Address</span>
          <div class="input-group">
            <Mail class="input-icon" :size="18" />
            <input
              v-model="email"
              type="email"
              required
              placeholder="janedoe@gmail.com"
              autocomplete="email"
            />
          </div>
        </label>
        <button class="primary" type="submit" :disabled="loading">
          <Send v-if="!loading" :size="18" />
          <div v-else class="spinner"></div>
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { forgotPassword } from '../services/authService'
import { useRouter } from 'vue-router'
import { ArrowLeft, Mail, Send } from 'lucide-vue-next'

export default {
  name: 'ForgotPassword',
  setup() {
    const router = useRouter()
    return { router }
  },
  data() {
    return {
      email: '',
      loading: false
    }
  },
  methods: {
    goBack() {
      this.router.push('/login')
    },
    async handleForgotPassword() {
      this.loading = true

      try {
        const response = await forgotPassword({ email: this.email })
        this.email = ''
        window.$toast?.success(response.message)
      } catch (error) {
        if (error.message === 'Invalid Email') {
          window.$toast?.error('Invalid Email')
        } else {
          window.$toast?.error(error.message || 'Failed to send reset email')
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.auth-page {
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:100vh;
  padding:24px;
  overflow:hidden;
}

.wave-bg {
  position:absolute;
  inset:-10% -10% -10% -10%;
  z-index:-1;
}

.wave-bg::before, .wave-bg::after {
  content:"";
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  width:160vw;
  height:160vw;
  border-radius:45%;
  filter:blur(40px);
  opacity:0.45;
  animation:wave 18s ease-in-out infinite;
  background:radial-gradient(circle at 30% 30%, rgba(102,126,234,0.45), transparent 55%), radial-gradient(circle at 70% 40%, rgba(118,75,162,0.45), transparent 60%), radial-gradient(circle at 50% 70%, rgba(59,130,246,0.35), transparent 55%);
}

.wave-bg::after {
  animation-duration: 26s;
  animation-delay:-6s;
  opacity:0.35;
  background:radial-gradient(circle at 70% 60%, rgba(16,185,129,0.35), transparent 55%), radial-gradient(circle at 30% 40%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.25), transparent 55%);
}

@keyframes wave {
  0% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; }
  25% { top: -20%; border-radius: 58% 42% 62% 38% / 37% 63% 37% 63%; }
  50% { top: -35%; border-radius: 52% 48% 55% 45% / 52% 48% 55% 45%; }
  75% { top: -25%; border-radius: 60% 40% 40% 60% / 45% 55% 45% 55%; }
  100% { top: -30%; border-radius: 42% 58% 37% 63% / 42% 34% 66% 58%; }
}

.card {
  width:100%;
  max-width:420px;
  background:#fff;
  border:1px solid #e6e8ec;
  border-radius:12px;
  padding:24px;
  box-shadow:0 10px 25px rgba(50,50,93,0.05);
}

/* Dark mode styles */
body.dark .wave-bg::before, body.dark .wave-bg::after {
  background:radial-gradient(circle at 30% 30%, rgba(102,126,234,0.25), transparent 55%), radial-gradient(circle at 70% 40%, rgba(118,75,162,0.25), transparent 60%), radial-gradient(circle at 50% 70%, rgba(59,130,246,0.15), transparent 55%);
}

body.dark .wave-bg::after {
  background:radial-gradient(circle at 70% 60%, rgba(16,185,129,0.15), transparent 55%), radial-gradient(circle at 30% 40%, rgba(99,102,241,0.15), transparent 60%), radial-gradient(circle at 50% 50%, rgba(236,72,153,0.10), transparent 55%);
}

body.dark .card {
  background: #0f172a;
  border: 1px solid #1f2a44;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.link {
  background:none;
  border:none;
  color:#5562ea;
  cursor:pointer;
  padding:0;
  margin-bottom:8px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}
.link:hover { color: #4338ca; }

h1 {
  margin:6px 0 4px;
  font-size:26px;
  font-weight:600;
}

.subtitle {
  color:#6b7280;
  margin:0 0 16px;
  line-height:1.5;
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
  display:grid;
  gap:12px;
}

label {
  display:grid;
  gap:6px;
}

label span {
  font-weight:500;
  color:#374151;
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
  box-shadow: 0 0 0 3px rgba(123,134,242,0.2);
}

body.dark input:focus + .input-icon,
body.dark input:focus ~ .input-icon {
  color: #7b86f2;
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
  padding:12px 12px 12px 42px;
  border:1px solid #d1d5db;
  border-radius:10px;
  font-size:14px;
  width: 100%;
  transition:all 0.2s ease;
}

input:focus {
  outline:none;
  border-color:#7b86f2;
  box-shadow:0 0 0 3px rgba(123,134,242,0.2);
}
input:focus + .input-icon,
input:focus ~ .input-icon {
  color: #7b86f2;
}

.primary {
  padding:12px;
  border-radius:10px;
  border:none;
  color:#fff;
  font-weight:600;
  background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
  cursor:pointer;
  transition:all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary:hover:not(:disabled) {
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(102,126,234,0.4);
}

.primary:disabled {
  opacity:0.6;
  cursor:not-allowed;
  transform:none;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
