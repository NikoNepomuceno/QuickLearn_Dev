<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-vue-next'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import { loginUser } from '@/services/authService'

const router = useRouter()

const form = reactive({
  identifier: '',
  password: ''
})
const isLoading = ref(false)
const showPassword = ref(false)

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))

function validate() {
  if (!form.identifier.trim()) {
    window.$toast?.error('Email is required.')
    return false
  }

  if (!form.password) {
    window.$toast?.error('Password is required.')
    return false
  }

  return true
}

async function onSubmit() {
  if (!validate()) return

  isLoading.value = true
  try {
    await loginUser({
      identifier: form.identifier.trim(),
      password: form.password
    })
    window.$toast?.success('Welcome back!')
    router.replace('/upload')
  } catch (err) {
    const message = err?.message || 'Login failed'
    window.$toast?.error(message)
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

function handleForgotPassword() {
  router.push('/forgot-password')
}

function handleGoogleLogin() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
  window.location.href = `${API_BASE}/api/auth/oauth/google/start`
}

function handleGitHubLogin() {
  window.$toast?.info('GitHub sign-in is coming soon!')
}
</script>

<template>
  <AuthLayout
    title="Welcome back"
    subtitle="Log in to continue learning smarter."
    :show-back="true"
    back-label="Back to Home"
    @back="goHome"
  >
    <template #back-icon>
      <ArrowLeft :size="16" />
    </template>


    <form class="auth-form" @submit.prevent="onSubmit" novalidate>
      <FormField
        label="Email"
        required
        for="login-email"
      >
        <BaseInput
          id="login-email"
          v-model="form.identifier"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
        >
          <template #prefix>
            <Mail :size="18" />
          </template>
        </BaseInput>
      </FormField>

      <FormField
        label="Password"
        required
        for="login-password"
      >
        <BaseInput
          id="login-password"
          v-model="form.password"
          :type="passwordType"
          placeholder="Enter your password"
          autocomplete="current-password"
        >
          <template #prefix>
            <Lock :size="18" />
          </template>
          <template #suffix>
            <button
              type="button"
              class="icon-button"
              @click="togglePassword"
              :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </template>
        </BaseInput>
      </FormField>

      <div class="auth-form__row">
        <button class="text-button" type="button" @click="handleForgotPassword">
          Forgot password?
        </button>
      </div>

      <BaseButton
        variant="primary"
        size="md"
        block
        type="submit"
        :loading="isLoading"
      >
        <LogIn :size="18" />
        Sign in
      </BaseButton>
    </form>

    <div class="auth-divider">
      <span>Or continue with</span>
    </div>

    <div class="social-buttons">
      <BaseButton variant="secondary" block @click="handleGoogleLogin">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </BaseButton>

      <BaseButton variant="secondary" block @click="handleGitHubLogin">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M12 0C5.37 0 0 5.46 0 12.2c0 5.4 3.44 9.97 8.21 11.6.6.12.82-.27.82-.59v-2.28c-3.34.75-4.05-1.45-4.05-1.45-.55-1.41-1.33-1.78-1.33-1.78-1.1-.76.08-.74.08-.74 1.2.09 1.84 1.27 1.84 1.27 1.07 1.85 2.81 1.32 3.5 1.01.11-.8.42-1.32.76-1.62-2.66-.31-5.47-1.35-5.47-6 0-1.33.46-2.41 1.23-3.26-.12-.31-.52-1.58.12-3.3 0 0 1.01-.33 3.31 1.25.96-.27 1.98-.4 3-.4 1.02 0 2.04.14 3 .4 2.3-1.58 3.31-1.25 3.31-1.25.64 1.72.24 2.99.12 3.3.77.85 1.23 1.93 1.23 3.26 0 4.66-2.81 5.68-5.49 5.99.43.38.82 1.13.82 2.29v3.39c0 .32.21.71.82.59C20.56 22.17 24 17.6 24 12.2 24 5.46 18.63 0 12 0z"
          />
        </svg>
        GitHub
      </BaseButton>
    </div>

    <template #footer>
      <div class="auth-footer">
        <span>Don't have an account?</span>
        <router-link class="auth-footer__link" to="/register">
          Sign up
        </router-link>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: var(--space-5);
}

.auth-form__row {
  display: flex;
  justify-content: flex-end;
}

.text-button {
  border: none;
  background: none;
  padding: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  cursor: pointer;
  transition: color var(--transition-base);
}

.text-button:hover {
  color: var(--color-primary-dark);
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

.auth-divider {
  position: relative;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
}

.auth-divider::before {
  content: '';
  position: absolute;
  inset: 50% 0 auto 0;
  height: 1px;
  background: var(--color-border);
  transform: translateY(-50%);
}

.auth-divider span {
  position: relative;
  z-index: 1;
  padding: 0 var(--space-3);
  background: var(--color-surface);
}

.social-buttons {
  display: grid;
  gap: var(--space-3);
}

.auth-footer {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.auth-footer__link {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.auth-footer__link:hover {
  color: var(--color-primary-dark);
}

body.dark .auth-divider span {
  background: var(--color-surface);
}
</style>
