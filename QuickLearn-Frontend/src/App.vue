<script setup>
import { onMounted, onUnmounted } from 'vue'
import Swal from 'sweetalert2'
import GlobalLoader from './components/GlobalLoader.vue'
import AchievementToastContainer from './components/AchievementToastContainer.vue'
import { useAchievementToast } from './composables/useAchievementToast'
import { achievementSocket } from './services/achievementSocket'
import { soundService } from './services/soundService'

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

// Achievement Toast System
const { showAchievementToast } = useAchievementToast()

// Test function for achievement toasts (exposed on window for console testing)
if (typeof window !== 'undefined') {
  window.$testAchievement = {
    // Test a common achievement
    common: () => {
      showAchievementToast({
        id: 'test-common',
        code: 'test_common',
        name: 'First Steps',
        description: 'You completed your first quiz!',
        icon: 'star',
        rarity: 'common',
        points: 10,
        lottieUrl: null
      })
    },
    // Test a rare achievement
    rare: () => {
      showAchievementToast({
        id: 'test-rare',
        code: 'test_rare',
        name: 'Speed Demon',
        description: 'Completed a quiz in under 2 minutes!',
        icon: 'bolt',
        rarity: 'rare',
        points: 50,
        lottieUrl: null
      })
    },
    // Test an epic achievement
    epic: () => {
      showAchievementToast({
        id: 'test-epic',
        code: 'test_epic',
        name: 'Perfect Score',
        description: 'Achieved 100% on a quiz!',
        icon: 'trophy',
        rarity: 'epic',
        points: 100,
        lottieUrl: null
      })
    },
    // Test a legendary achievement
    legendary: () => {
      showAchievementToast({
        id: 'test-legendary',
        code: 'test_legendary',
        name: 'Master Scholar',
        description: 'Earned 1000 total points!',
        icon: 'crown',
        rarity: 'legendary',
        points: 500,
        lottieUrl: null
      })
    },
    // Test all rarities in sequence
    all: () => {
      const achievements = [
        {
          id: 'test-common',
          code: 'test_common',
          name: 'First Steps',
          description: 'You completed your first quiz!',
          icon: 'star',
          rarity: 'common',
          points: 10
        },
        {
          id: 'test-rare',
          code: 'test_rare',
          name: 'Speed Demon',
          description: 'Completed a quiz in under 2 minutes!',
          icon: 'bolt',
          rarity: 'rare',
          points: 50
        },
        {
          id: 'test-epic',
          code: 'test_epic',
          name: 'Perfect Score',
          description: 'Achieved 100% on a quiz!',
          icon: 'trophy',
          rarity: 'epic',
          points: 100
        },
        {
          id: 'test-legendary',
          code: 'test_legendary',
          name: 'Master Scholar',
          description: 'Earned 1000 total points!',
          icon: 'crown',
          rarity: 'legendary',
          points: 500
        }
      ]
      
      achievements.forEach((achievement, index) => {
        setTimeout(() => {
          showAchievementToast(achievement)
        }, index * 2000) // Show each 2 seconds apart
      })
    }
  }
}

// Initialize sound service and socket connection
onMounted(() => {
  try {
    // Initialize sound service (loads sounds in background)
    soundService.init()

    // Set up achievement socket connection
    achievementSocket.connect((achievement) => {
      showAchievementToast(achievement)
    })
  } catch (error) {
    console.error('Error initializing achievement system:', error)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  achievementSocket.disconnect()
  soundService.destroy()
})
</script>

<template>
  <router-view />
  <GlobalLoader />
  <AchievementToastContainer />
</template>

<style scoped></style>
