<script setup>
</script>

<script setup>
import Swal from 'sweetalert2'

// Configure a Toast instance
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

function showToast(message, icon = 'info', timer = 3000) {
  Toast.fire({ icon, title: message, timer })
}

// Expose on window for easy use from any component without global store
if (typeof window !== 'undefined') {
  window.$toast = {
    show: (m, t=3000) => showToast(m, 'info', t),
    success: (m, t=3000) => showToast(m, 'success', t),
    error: (m, t=4000) => showToast(m, 'error', t),
    info: (m, t=3000) => showToast(m, 'info', t),
    confirm: (title, text, confirmButtonText='OK') =>
      Swal.fire({ title, text, icon: 'question', showCancelButton: true, confirmButtonText })
  }
}
</script>

<template>
  <router-view />
</template>

<style scoped></style>
