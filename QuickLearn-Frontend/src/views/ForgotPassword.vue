<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Mail, Send } from 'lucide-vue-next'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import { forgotPassword } from '@/services/authService'

const router = useRouter()

const form = reactive({
  email: ''
})

const isLoading = ref(false)

function validate() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(form.email)) {
    window.$toast?.error('Enter a valid email address.')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true
  try {
    await forgotPassword({ email: form.email.trim() })
    window.$toast?.success('Check your inbox for the reset link. It is valid for 30 minutes.')
  } catch (err) {
    const message = err?.message || 'Unable to send reset link. Please try again.'
    window.$toast?.error(message)
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push('/login')
}
</script>

<template>
  <AuthLayout
    title="Forgot your password?"
    subtitle="Enter the email associated with your account and we will send you a reset link."
    :show-back="true"
    back-label="Back to Login"
    @back="goBack"
  >
    <template #back-icon>
      <ArrowLeft :size="16" />
    </template>

    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <FormField
        label="Email address"
        required
        for="forgot-email"
      >
        <BaseInput
          id="forgot-email"
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
        >
          <template #prefix>
            <Mail :size="18" />
          </template>
        </BaseInput>
      </FormField>

      <BaseButton
        variant="primary"
        size="md"
        block
        type="submit"
        :loading="isLoading"
      >
        <Send :size="18" />
        Send reset link
      </BaseButton>
    </form>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: var(--space-5);
}

@media (max-width: 480px) {
  .auth-form {
    gap: var(--space-4);
  }
}
</style>
