import { io } from 'socket.io-client'
import { API_BASE } from '@/config/api.config'

/**
 * Achievement Socket Service
 * Manages WebSocket connection for achievement notifications
 */
class AchievementSocketService {
  constructor() {
    this.socket = null
    this.onAchievementCallback = null
    this.isConnected = false
  }

  /**
   * Initialize socket connection and listen for achievements
   * @param {Function} onAchievement - Callback when achievement is earned
   */
  connect(onAchievement) {
    if (this.socket?.connected) {
      console.warn('Achievement socket already connected')
      return
    }

    this.onAchievementCallback = onAchievement

    const API = API_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3000'

    this.socket = io(API, {
      transports: ['websocket'],
      withCredentials: true
    })

    // Handle connection
    this.socket.on('connect', () => {
      this.isConnected = true
      console.log('Achievement socket connected')
    })

    // Handle disconnection
    this.socket.on('disconnect', () => {
      this.isConnected = false
      console.log('Achievement socket disconnected')
    })

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.warn('Achievement socket connection error:', error)
      this.isConnected = false
    })

    // Listen for achievement_earned events
    this.socket.on('achievement_earned', (data) => {
      try {
        if (this.onAchievementCallback && data?.achievements) {
          // Handle multiple achievements (though typically one at a time)
          data.achievements.forEach(achievement => {
            this.onAchievementCallback(achievement)
          })
        }
      } catch (error) {
        console.error('Error handling achievement event:', error)
      }
    })

    // The backend automatically assigns users to their room (user:${userId})
    // based on the authenticated session, so we don't need to emit a subscribe event
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.off('achievement_earned')
      this.socket.off('connect')
      this.socket.off('disconnect')
      this.socket.off('connect_error')
      this.socket.close()
      this.socket = null
      this.isConnected = false
      this.onAchievementCallback = null
    }
  }

  /**
   * Check if socket is connected
   */
  get connected() {
    return this.isConnected && this.socket?.connected
  }
}

// Export singleton instance
export const achievementSocket = new AchievementSocketService()

