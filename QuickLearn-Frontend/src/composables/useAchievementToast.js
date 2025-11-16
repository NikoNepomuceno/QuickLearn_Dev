import { ref } from 'vue'
import { gsap } from 'gsap'
import { soundService } from '@/services/soundService'

// Singleton state - shared across all instances
const toasts = ref([])
let toastIdCounter = 0

/**
 * Composable for managing achievement toast notifications
 * Uses singleton pattern to share state across components
 */
export function useAchievementToast() {

  /**
   * Show an achievement toast
   */
  function showAchievementToast(achievement) {
    const toastId = `achievement-toast-${++toastIdCounter}`
    const toast = {
      id: toastId,
      achievement: {
        ...achievement,
        rarity: achievement.rarity || 'common'
      },
      visible: false,
      dismissed: false
    }

    toasts.value.push(toast)

    // Play sound effect
    soundService.playAchievementSound(toast.achievement.rarity)

    // Trigger entrance animation on next tick
    setTimeout(() => {
      animateToastIn(toastId)
    }, 10)

    // Auto-dismiss after duration (longer for higher rarity)
    const duration = getDurationForRarity(toast.achievement.rarity)
    setTimeout(() => {
      dismissToast(toastId)
    }, duration)

    return toastId
  }

  /**
   * Get auto-dismiss duration based on rarity
   */
  function getDurationForRarity(rarity) {
    const durationMap = {
      common: 4000,
      rare: 5000,
      epic: 6000,
      legendary: 8000
    }
    return durationMap[rarity] || 4000
  }

  /**
   * Animate toast entrance
   */
  function animateToastIn(toastId) {
    const toastElement = document.getElementById(toastId)
    if (!toastElement) return

    // Set initial state
    gsap.set(toastElement, {
      opacity: 0,
      scale: 0.8,
      x: 100
    })

    // Animate in
    gsap.to(toastElement, {
      opacity: 1,
      scale: 1,
      x: 0,
      duration: 0.4,
      ease: 'back.out(1.7)',
      onComplete: () => {
        const toast = toasts.value.find(t => t.id === toastId)
        if (toast) {
          toast.visible = true
        }
      }
    })
  }

  /**
   * Dismiss a toast with exit animation
   */
  function dismissToast(toastId) {
    const toast = toasts.value.find(t => t.id === toastId)
    if (!toast || toast.dismissed) return

    toast.dismissed = true
    const toastElement = document.getElementById(toastId)

    if (toastElement) {
      // Animate out
      gsap.to(toastElement, {
        opacity: 0,
        scale: 0.8,
        x: 100,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          // Remove from array
          const index = toasts.value.findIndex(t => t.id === toastId)
          if (index > -1) {
            toasts.value.splice(index, 1)
          }
        }
      })
    } else {
      // Remove immediately if element not found
      const index = toasts.value.findIndex(t => t.id === toastId)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }
  }

  /**
   * Clear all toasts
   */
  function clearAllToasts() {
    toasts.value.forEach(toast => {
      if (!toast.dismissed) {
        dismissToast(toast.id)
      }
    })
  }

  return {
    toasts,
    showAchievementToast,
    dismissToast,
    clearAllToasts
  }
}

