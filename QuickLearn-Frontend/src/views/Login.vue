<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser } from '../services/authService'
import { ArrowLeft, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const identifier = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

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

function togglePassword() {
  showPassword.value = !showPassword.value
}

function handleGoogleLogin() {
  // TODO: Implement Google OAuth
  console.log('Google login clicked')
}

function handleGitHubLogin() {
  // TODO: Implement GitHub OAuth
  console.log('GitHub login clicked')
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
      
      <h1>Welcome Back</h1>
      <p class="subtitle">Login to continue</p>
      
      <form @submit="onSubmit" class="form">
        <div class="input-group">
          <Mail class="input-icon" :size="18" />
          <input v-model="identifier" type="text" required placeholder="Email" />
        </div>
        
        <div class="input-group">
          <Lock class="input-icon" :size="18" />
          <input v-model="password" :type="showPassword ? 'text' : 'password'" required placeholder="Password" />
          <button type="button" class="password-toggle" @click="togglePassword">
            <Eye v-if="!showPassword" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
        
        <div class="forgot-password">
          <router-link to="/forgot-password">Forgot Password?</router-link>
        </div>
        
        <button class="primary" type="submit" :disabled="isLoading">
          <LogIn v-if="!isLoading" :size="18" />
          <div v-else class="spinner"></div>
          {{ isLoading ? 'Signing in…' : 'Sign In' }}
        </button>
        
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      
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
        <span>Don't have an account?</span>
        <router-link to="/register">Sign Up</router-link>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  width: 100%;
  max-width: 420px;
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

.forgot-password {
  text-align: right;
  margin-top: -8px;
}

.forgot-password a {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;
}

.forgot-password a:hover {
  color: #5a67d8;
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

body.dark .forgot-password a {
  color: #667eea;
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
}
</style>
