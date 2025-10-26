<script setup>
// import { SpeedInsights } from "@vercel/speed-insights/next"
import Swal from 'sweetalert2'
import GlobalLoader from './components/GlobalLoader.vue'

// Configure a Toast instance with dynamic dark mode support
function getToastConfig() {
  const isDark = document.body.classList.contains('dark')
  return {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#1f2937',
    customClass: {
      popup: isDark ? 'swal2-dark-toast' : 'swal2-light-toast',
      timerProgressBar: isDark ? 'swal2-dark-progress' : 'swal2-light-progress'
    }
  }
}

function showToast(message, icon = 'info', timer = 3000) {
  const Toast = Swal.mixin(getToastConfig())
  Toast.fire({ icon, title: message, timer })
}

// Expose on window for easy use from any component without global store
if (typeof window !== 'undefined') {
  window.$toast = {
    show: (m, t=3000) => showToast(m, 'info', t),
    success: (m, t=3000) => showToast(m, 'success', t),
    error: (m, t=4000) => showToast(m, 'error', t),
    info: (m, t=3000) => showToast(m, 'info', t),
    confirm: (title, text, confirmButtonText='OK') => {
      const isDark = document.body.classList.contains('dark')
      return Swal.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText,
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#1f2937',
        customClass: {
          popup: isDark ? 'swal2-dark-modal' : 'swal2-light-modal',
          confirmButton: isDark ? 'swal2-dark-confirm' : 'swal2-light-confirm',
          cancelButton: isDark ? 'swal2-dark-cancel' : 'swal2-light-cancel'
        }
      })
    }
  }
}

function toggleTheme() {
  try {
    if (window.$theme && typeof window.$theme.toggle === 'function') {
      window.$theme.toggle()
      return
    }
    // Fallback: toggle class directly and persist
    const isDark = document.body.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  } catch {}
}
</script>

<template>
  <router-view />
  <GlobalLoader />
</template>

<style scoped></style>
