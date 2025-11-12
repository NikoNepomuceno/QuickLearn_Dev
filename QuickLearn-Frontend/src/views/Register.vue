<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-vue-next'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal.vue'
import { registerUser } from '@/services/authService'

const router = useRouter()
const route = useRoute()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptedPrivacy = ref(false)
const showPrivacy = ref(false)
const passwordTouched = ref(false)

const passwordChecklist = reactive({
  length: false,
  uppercase: false,
  digit: false,
  special: false
})

watch(
  () => form.password,
  (value) => {
    if (value.length > 0) {
      passwordTouched.value = true
    }
    passwordChecklist.length = value.length >= 8
    passwordChecklist.uppercase = /[A-Z]/.test(value)
    passwordChecklist.digit = /\d/.test(value)
    passwordChecklist.special = /[^A-Za-z0-9]/.test(value)
  }
)

const passwordValid = computed(() => Object.values(passwordChecklist).every(Boolean))

function validate() {
  if (!form.username.trim()) {
    window.$toast?.error('Username is required.')
    return false
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(form.email)) {
    window.$toast?.error('Enter a valid email address.')
    return false
  }

  if (!passwordValid.value) {
    window.$toast?.error('Password does not meet the requirements.')
    return false
  }

  const passwordsMatch = form.password && form.password === form.confirmPassword
  if (!passwordsMatch) {
    window.$toast?.error('Passwords must match.')
    return false
  }

  if (!acceptedPrivacy.value) {
    window.$toast?.error('Please accept the Privacy Policy.')
    return false
  }

  return true
}

async function onSubmit() {
  if (!validate()) return

  isLoading.value = true
  try {
    await registerUser({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword
    })
    window.$toast?.success('Account created! Check your email for the verification code.')
    try {
      sessionStorage.setItem('verifyEmailPending', form.email.trim())
    } catch {}
    router.push({ name: 'verify-email', query: { email: form.email.trim() } })
  } catch (err) {
    const message = err?.message || 'Registration failed'
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

function toggleConfirmPassword() {
  showConfirmPassword.value = !showConfirmPassword.value
}

function handleGoogleLogin() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
  window.location.href = `${API_BASE}/api/auth/oauth/google/start`
}

function handleGitHubLogin() {
  window.$toast?.info('GitHub sign-up is coming soon!')
}

function handlePrivacyAccept() {
  acceptedPrivacy.value = true
  showPrivacy.value = false
}

if (route.query.pp === '1') {
  showPrivacy.value = true
}
</script>

<template>
  <AuthLayout
    title="Create your account"
    subtitle="Generate quizzes, flashcards, and notes in seconds."
    :show-back="true"
    back-label="Back to Home"
    @back="goHome"
  >
    <template #back-icon>
      <ArrowLeft :size="16" />
    </template>

    <template #avatar>
      <div class="auth-icon" aria-hidden="true">
        <User :size="24" />
      </div>
    </template>

    <form class="auth-form" @submit.prevent="onSubmit" novalidate autocomplete="off">
      <FormField
        label="Username"
        required
        for="register-username"
      >
        <BaseInput
          id="register-username"
          v-model="form.username"
          placeholder="Choose a username"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
        >
          <template #prefix>
            <User :size="18" />
          </template>
        </BaseInput>
      </FormField>

      <FormField
        label="Email"
        required
        for="register-email"
      >
        <BaseInput
          id="register-email"
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          autocapitalize="none"
          autocorrect="off"
        >
          <template #prefix>
            <Mail :size="18" />
          </template>
        </BaseInput>
      </FormField>

      <FormField
        label="Password"
        required
        for="register-password"
      >
        <BaseInput
          id="register-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Create a strong password"
          autocomplete="new-password"
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

      <div v-if="passwordTouched" class="password-checklist" aria-live="polite">
        <div
          v-for="(met, key) in passwordChecklist"
          :key="key"
          :class="['password-checklist__item', { 'is-met': met }]"
        >
          <span class="password-checklist__icon" aria-hidden="true">
            {{ met ? '✓' : '○' }}
          </span>
          <span class="password-checklist__text">
            {{
              key === 'length'
                ? 'At least 8 characters'
                : key === 'uppercase'
                  ? 'One uppercase letter (A-Z)'
                  : key === 'digit'
                    ? 'One number (0-9)'
                    : 'One special character (!@#$%^&*)'
            }}
          </span>
        </div>
      </div>

      <FormField
        label="Confirm password"
        required
        for="register-confirm"
      >
        <BaseInput
          id="register-confirm"
          v-model="form.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          placeholder="Retype your password"
          autocomplete="new-password"
        >
          <template #prefix>
            <Lock :size="18" />
          </template>
          <template #suffix>
            <button
              type="button"
              class="icon-button"
              @click="toggleConfirmPassword"
              :aria-pressed="showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
            >
              <EyeOff v-if="showConfirmPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </template>
        </BaseInput>
      </FormField>

      <div class="privacy-row">
        <label class="privacy-row__label">
          <input v-model="acceptedPrivacy" type="checkbox" />
          <span>
            I agree to the
            <button type="button" class="privacy-row__link" @click="showPrivacy = true">
              Privacy Policy
            </button>
          </span>
        </label>
      </div>

      <BaseButton
        variant="primary"
        size="md"
        block
        type="submit"
        :loading="isLoading"
      >
        <UserPlus :size="18" />
        Create account
      </BaseButton>

    </form>

    <div class="auth-divider">
      <span>Or continue with</span>
    </div>

    <div class="social-buttons">
      <BaseButton variant="secondary" block @click="handleGoogleLogin">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </BaseButton>

      <BaseButton variant="secondary" block @click="handleGitHubLogin">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.46 0 12.2c0 5.4 3.44 9.97 8.21 11.6.6.12.82-.27.82-.59v-2.28c-3.34.75-4.05-1.45-4.05-1.45-.55-1.41-1.33-1.78-1.33-1.78-1.1-.76.08-.74.08-.74 1.2.09 1.84 1.27 1.84 1.27 1.07 1.85 2.81 1.32 3.5 1.01.11-.8.42-1.32.76-1.62-2.66-.31-5.47-1.35-5.47-6 0-1.33.46-2.41 1.23-3.26-.12-.31-.52-1.58.12-3.3 0 0 1.01-.33 3.31 1.25.96-.27 1.98-.4 3-.4 1.02 0 2.04.14 3 .4 2.3-1.58 3.31-1.25 3.31-1.25.64 1.72.24 2.99.12 3.3.77.85 1.23 1.93 1.23 3.26 0 4.66-2.81 5.68-5.49 5.99.43.38.82 1.13.82 2.29v3.39c0 .32.21.71.82.59C20.56 22.17 24 17.6 24 12.2 24 5.46 18.63 0 12 0z" />
        </svg>
        GitHub
      </BaseButton>
    </div>

    <template #footer>
      <div class="auth-footer">
        <span>Already have an account?</span>
        <router-link class="auth-footer__link" to="/login">
          Sign in
        </router-link>
      </div>
    </template>
  </AuthLayout>

  <PrivacyPolicyModal v-model="showPrivacy" @accept="handlePrivacyAccept" />
</template>

<style scoped>
:global(html),
:global(body) {
  overflow-x: hidden;
}

.auth-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: var(--shadow-md);
}

.auth-form {
  display: grid;
  gap: var(--space-5);
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

.password-checklist {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  font-size: var(--font-size-sm);
}

.password-checklist__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.password-checklist__item.is-met {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.password-checklist__icon {
  font-size: 0.9rem;
  width: 1.25rem;
}

.privacy-row {
  display: grid;
  gap: var(--space-2);
}

.privacy-row__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.privacy-row__link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  padding: 0;
}

.privacy-row__link:hover {
  color: var(--color-primary-dark);
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

@media (max-width: 480px) {
  .auth-icon {
    width: 56px;
    height: 56px;
  }
}

body.dark .password-checklist {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .auth-divider span {
  background: var(--color-surface);
}
</style>
