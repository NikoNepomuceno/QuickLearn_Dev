import { Howl } from 'howler'

/**
 * Sound Service for Achievement Notifications
 * Manages achievement sound effects with howler.js
 */
class SoundService {
  constructor() {
    this.sounds = {}
    this.isEnabled = true
    this.volume = 0.6
    this.initialized = false
  }

  /**
   * Initialize and preload all achievement sounds
   */
  async init() {
    if (this.initialized) return

    const soundFiles = {
      common: '/sounds/common-achievement.mp3',
      rare: '/sounds/rare-achievement.mp3',
      epic: '/sounds/epic-achievement.mp3',
      legendary: '/sounds/legendary-achievement.mp3'
    }

    // Create Howl instances for each rarity
    Object.entries(soundFiles).forEach(([rarity, src]) => {
      this.sounds[rarity] = new Howl({
        src: [src],
        volume: this.getVolumeForRarity(rarity),
        preload: true,
        html5: false, // Use Web Audio API for better performance
        onloaderror: () => {
          // Silently fail if sound file doesn't exist (for development)
          console.warn(`Sound file not found for ${rarity} achievement`)
        }
      })
    })

    this.initialized = true
  }

  /**
   * Get volume based on rarity (higher rarity = higher volume)
   */
  getVolumeForRarity(rarity) {
    const volumeMap = {
      common: 0.4,
      rare: 0.5,
      epic: 0.6,
      legendary: 0.8
    }
    return (volumeMap[rarity] || 0.5) * this.volume
  }

  /**
   * Play sound for a specific rarity
   */
  playAchievementSound(rarity = 'common') {
    if (!this.isEnabled || !this.initialized) return

    const sound = this.sounds[rarity]
    if (!sound) {
      // Fallback to common if rarity sound doesn't exist
      this.sounds.common?.play()
      return
    }

    // Stop any currently playing sound of the same type
    sound.stop()

    // Play the sound
    try {
      sound.play()
    } catch (error) {
      // Handle browser autoplay restrictions gracefully
      console.warn('Could not play achievement sound:', error)
    }
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    // Update volumes for all sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        const rarity = Object.keys(this.sounds).find(
          key => this.sounds[key] === sound
        )
        if (rarity) {
          sound.volume(this.getVolumeForRarity(rarity))
        }
      }
    })
  }

  /**
   * Clean up resources
   */
  destroy() {
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.unload()
      }
    })
    this.sounds = {}
    this.initialized = false
  }
}

// Export singleton instance
export const soundService = new SoundService()

