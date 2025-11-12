<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useRouter } from 'vue-router';
import BeatLoader from 'vue-spinner/src/BeatLoader.vue';
import { authService } from '@/services/authService'

const router = useRouter()

const isLoading = ref(false)
const isUpdatingPassword = ref(false)
const isDeletingAccount = ref(false)
const isUpdatingNotifications = ref(false)
const activeSection = ref('profile-section')
const scrollContainer = ref(null)

// Settings sidebar navigation
const settingsSections = ref([
  { 
    id: 'profile-section', 
    label: 'Profile',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
  },
  { 
    id: 'subscription-section', 
    label: 'Subscription',
    icon: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12'
  },
  { 
    id: 'preferences-section', 
    label: 'Preferences',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'
  },
  { 
    id: 'notifications-section', 
    label: 'Notifications',
    icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0'
  },
  { 
    id: 'security-section', 
    label: 'Security',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
  },
  { 
    id: 'danger-section', 
    label: 'Danger Zone',
    icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01'
  }
])

// Profile-related state
const isEditing = ref(false)
const isSaving = ref(false)

// User profile data
const userProfile = ref({
  id: '',
  username: '',
  displayName: '',
  email: '',
  bio: '',
  profilePicture: '',
  createdAt: '',
  lastLogin: ''
})

// Form data for editing
const editForm = ref({
  displayName: '',
  bio: ''
})

// Account statistics
const accountStats = ref({
  quizzesCreated: 0,
  quizzesTaken: 0,
  averageScore: 0,
  totalTimeSpent: 0
})

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const currentTheme = ref('system')
const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

// Notification preferences
const notificationPreferences = ref({
  emailNotifications: true,
  quizReminders: true,
  weeklyDigest: false
})

// Password update form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Account deletion
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')

// Subscription and usage limits
const subscriptionTier = ref('free')
const usageLimits = ref({
  quizzesUsed: 3,
  quizzesLimit: 10,
  summariesUsed: 2,
  summariesLimit: 10,
  questionTypesAvailable: 2
})

function getScrollContainer() {
  if (scrollContainer.value) return scrollContainer.value
  const container = document.querySelector('.app-shell__main')
  if (container instanceof HTMLElement) {
    scrollContainer.value = container
    return container
  }
  return null
}

function scrollToSection(sectionId) {
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  const container = getScrollContainer()
  if (element && container) {
    const offset = 100
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const position = container.scrollTop + elementRect.top - containerRect.top - offset
    container.scrollTo({
      top: position,
      behavior: 'smooth'
    })
    return
  }

  if (element) {
    const offset = 100
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    })
  }
}

// Track active section on scroll
function handleScroll() {
  const container = getScrollContainer()
  const sections = settingsSections.value.map(s => s.id)

  if (!container) {
    const scrollPosition = window.scrollY + 200

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId)
      if (!element) continue

      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + window.scrollY
      const elementBottom = elementTop + rect.height

      if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
        activeSection.value = sectionId
        return
      }
    }

    return
  }

  const scrollPosition = container.scrollTop + 150
  const containerRect = container.getBoundingClientRect()

  for (const sectionId of sections) {
    const element = document.getElementById(sectionId)
    if (!element) continue

    const rect = element.getBoundingClientRect()
    const elementTop = container.scrollTop + rect.top - containerRect.top
    const elementBottom = elementTop + rect.height

    if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
      activeSection.value = sectionId
      return
    }
  }
}

// Initialize theme on mount
onMounted(() => {
  initializeTheme()
  loadNotificationPreferences()
  loadUserProfile()

  nextTick(() => {
    const container = getScrollContainer()
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
    }
  })
})

onUnmounted(() => {
  const container = scrollContainer.value
  if (container) {
    container.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
})

function loadNotificationPreferences() {
  try {
    const saved = localStorage.getItem('notificationPreferences')
    if (saved) {
      notificationPreferences.value = { ...notificationPreferences.value, ...JSON.parse(saved) }
    }
  } catch (error) {
    console.warn('Failed to load notification preferences:', error)
  }
}

async function updateNotificationPreferences() {
  try {
    isUpdatingNotifications.value = true
    
    // Save to localStorage for now (will be replaced with API call)
    localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value))
    
    window.$toast?.success('Notification preferences updated')
  } catch (error) {
    window.$toast?.error('Failed to update notification preferences')
  } finally {
    isUpdatingNotifications.value = false
  }
}

function initializeTheme() {
  try {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || savedTheme === 'light') {
      currentTheme.value = savedTheme
    } else {
      currentTheme.value = 'system'
    }
  } catch (error) {
    console.warn('Failed to initialize theme:', error)
  }
}

function updateTheme(theme) {
  try {
    currentTheme.value = theme
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }
      localStorage.removeItem('theme')
    } else {
      if (theme === 'dark') {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }
      localStorage.setItem('theme', theme)
    }
    
    // Update window theme object if available
    if (window.$theme && typeof window.$theme.set === 'function') {
      window.$theme.set(theme)
    }
  } catch (error) {
    console.warn('Failed to update theme:', error)
  }
}

async function updatePassword() {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    window.$toast?.error('Please fill in all password fields')
    return
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    window.$toast?.error('New passwords do not match')
    return
  }
  
  if (passwordForm.value.newPassword.length < 6) {
    window.$toast?.error('New password must be at least 6 characters long')
    return
  }
  
  try {
    isUpdatingPassword.value = true
    
    await authService.updatePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    window.$toast?.success('Password updated successfully')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    window.$toast?.error(error.message || 'Failed to update password')
  } finally {
    isUpdatingPassword.value = false
  }
}

function openDeleteModal() {
  showDeleteModal.value = true
  deleteConfirmation.value = ''
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteConfirmation.value = ''
}

async function deleteAccount() {
  if (deleteConfirmation.value !== 'DELETE') {
    window.$toast?.error('Please type "DELETE" to confirm')
    return
  }
  
  try {
    isDeletingAccount.value = true
    
    await authService.deleteAccount()
    
    window.$toast?.success('Account deleted successfully')
    
    // Clear tokens and redirect to login
    authService.clearLegacyTokens()
    router.push('/login')
  } catch (error) {
    window.$toast?.error(error.message || 'Failed to delete account')
  } finally {
    isDeletingAccount.value = false
    closeDeleteModal()
  }
}

// Subscription functions
function handleUpgrade() {
  window.$toast?.info('Coming soon! Premium features will be available shortly.')
}

function getUsagePercentage(used, limit) {
  return Math.min(100, (used / limit) * 100)
}

// Profile management functions
async function loadUserProfile() {
  try {
    isLoading.value = true
    const response = await fetch(`${API_BASE}/api/user/profile`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch profile data')
    }

    const data = await response.json()
    userProfile.value = {
      id: data.id,
      username: data.username,
      displayName: data.displayName || data.username,
      email: data.email,
      bio: data.bio || '',
      profilePicture: data.profilePicture || '',
      createdAt: data.createdAt,
      lastLogin: data.lastLogin
    }
    
    // Load account statistics
    await loadAccountStats()
  } catch (error) {
    console.error('Error loading user profile:', error)
    window.$toast?.error('Failed to load profile data')
  } finally {
    isLoading.value = false
  }
}

async function loadAccountStats() {
  try {
    const response = await fetch(`${API_BASE}/api/user/profile/statistics`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch statistics')
    }

    const data = await response.json()
    accountStats.value = {
      quizzesCreated: data.quizzesCreated,
      quizzesTaken: data.quizzesTaken,
      averageScore: data.averageScore,
      totalTimeSpent: data.totalTimeSpent
    }
  } catch (error) {
    console.error('Error loading account stats:', error)
    window.$toast?.error('Failed to load statistics')
  }
}

function startEditing() {
  isEditing.value = true
  editForm.value = {
    displayName: userProfile.value.displayName,
    bio: userProfile.value.bio
  }
}

function cancelEditing() {
  isEditing.value = false
  editForm.value = {
    displayName: '',
    bio: ''
  }
}

async function saveProfile() {
  try {
    isSaving.value = true
    
    const response = await fetch(`${API_BASE}/api/user/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editForm.value)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update profile')
    }
    
    // Update local profile data
    userProfile.value = {
      ...userProfile.value,
      displayName: editForm.value.displayName,
      bio: editForm.value.bio
    }
    
    isEditing.value = false
    window.$toast?.success('Profile updated successfully!')
  } catch (error) {
    console.error('Error updating profile:', error)
    window.$toast?.error(error.message || 'Failed to update profile')
  } finally {
    isSaving.value = false
  }
}

async function handleProfilePictureUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    window.$toast?.error('Please select an image file')
    return
  }
  
  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    window.$toast?.error('Image size must be less than 5MB')
    return
  }
  
  try {
    isSaving.value = true
    
    const formData = new FormData()
    formData.append('profilePicture', file)
    
    const response = await fetch(`${API_BASE}/api/user/profile/picture`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload profile picture')
    }
    
    const data = await response.json()
    userProfile.value.profilePicture = data.profilePictureUrl
    
    window.$toast?.success('Profile picture updated!')
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    window.$toast?.error(error.message || 'Failed to upload profile picture')
  } finally {
    isSaving.value = false
  }
}

async function deleteProfilePicture() {
  try {
    const result = await window.$toast?.confirm(
      'Delete Profile Picture',
      'Are you sure you want to delete your profile picture?',
      'Delete'
    )
    
    if (!result.isConfirmed) return
    
    isSaving.value = true
    
    const response = await fetch(`${API_BASE}/api/user/profile/picture`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete profile picture')
    }
    
    userProfile.value.profilePicture = ''
    window.$toast?.success('Profile picture deleted!')
  } catch (error) {
    console.error('Error deleting profile picture:', error)
    window.$toast?.error(error.message || 'Failed to delete profile picture')
  } finally {
    isSaving.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTimeSpent(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

</script>

<template>
  <AppShell
    title="Settings"
    subtitle="Manage your account, preferences, and security."
    content-width="wide"
  >
    <div v-if="isLoading" class="loading-container">
      <BeatLoader
        :loading="true"
        color="#667eea"
        size="20px"
      />
    </div>

    <div v-else class="settings-wrapper">
      <!-- Sidebar Navigation -->
      <aside class="settings-sidebar">
        <nav class="settings-nav">
          <button 
            v-for="section in settingsSections" 
            :key="section.id"
            class="nav-item"
            :class="{ active: activeSection === section.id }"
            @click="scrollToSection(section.id)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="section.icon" />
            </svg>
            <span>{{ section.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="settings-main">
        <!-- Profile Section -->
        <section id="profile-section" class="settings-section">
          <div class="section-header">
            <div class="section-icon profile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2>Profile</h2>
              <p>Manage your personal information and profile picture</p>
            </div>
          </div>

          <div class="section-content">
            <!-- Profile Card -->
            <div class="profile-card">
              <div class="profile-main">
                <div class="profile-avatar-container">
                  <div class="profile-avatar">
                    <img 
                      v-if="userProfile.profilePicture" 
                      :src="userProfile.profilePicture" 
                      :alt="userProfile.displayName || userProfile.username"
                      class="avatar-img"
                    />
                    <div v-else class="avatar-placeholder">
                      {{ userProfile.displayName?.charAt(0)?.toUpperCase() || userProfile.username?.charAt(0)?.toUpperCase() || 'U' }}
                    </div>
                  </div>
                  <div class="avatar-actions">
                    <input 
                      type="file" 
                      accept="image/*" 
                      @change="handleProfilePictureUpload"
                      class="file-input"
                      id="avatar-upload"
                    />
                    <label for="avatar-upload" class="avatar-upload-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Upload
                    </label>
                    <button 
                      v-if="userProfile.profilePicture" 
                      @click="deleteProfilePicture" 
                      class="avatar-delete-btn"
                      :disabled="isSaving"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>

                <div class="profile-details">
                  <div v-if="!isEditing" class="details-view">
                    <h3 class="username">{{ userProfile.displayName || userProfile.username }}</h3>
                    <p class="email">{{ userProfile.email }}</p>
                    <p class="bio" v-if="userProfile.bio">{{ userProfile.bio }}</p>
                    <p class="bio placeholder" v-else>No bio yet. Tell us about yourself!</p>
                    <button @click="startEditing" class="btn-secondary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit Profile
                    </button>
                  </div>

                  <div v-else class="details-edit">
                    <div class="input-group">
                      <label for="displayName">Display Name</label>
                      <input 
                        id="displayName"
                        v-model="editForm.displayName" 
                        type="text" 
                        class="input-field"
                        placeholder="Your display name"
                      />
                    </div>
                    
                    <div class="input-group">
                      <label for="bio">Bio</label>
                      <textarea 
                        id="bio"
                        v-model="editForm.bio" 
                        class="input-field textarea"
                        placeholder="Tell us about yourself..."
                        rows="3"
                      ></textarea>
                    </div>
                    
                    <div class="button-group">
                      <button @click="cancelEditing" class="btn-secondary" :disabled="isSaving">
                        Cancel
                      </button>
                      <button @click="saveProfile" class="btn-primary" :disabled="isSaving">
                        <BeatLoader v-if="isSaving" :loading="true" color="#fff" size="8px" />
                        <span v-else>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Account Stats -->
              <div class="stats-container">
                <div class="stat-item">
                  <div class="stat-value">{{ accountStats.quizzesCreated }}</div>
                  <div class="stat-label">Quizzes Created</div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <div class="stat-value">{{ accountStats.quizzesTaken }}</div>
                  <div class="stat-label">Quizzes Taken</div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <div class="stat-value">{{ accountStats.averageScore }}%</div>
                  <div class="stat-label">Avg Score</div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <div class="stat-value">{{ formatTimeSpent(accountStats.totalTimeSpent) }}</div>
                  <div class="stat-label">Time Spent</div>
                </div>
              </div>
            </div>

            <!-- Account Info -->
            <div class="info-cards">
              <div class="info-card">
                <div class="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div class="info-content">
                  <div class="info-label">Member Since</div>
                  <div class="info-value">{{ formatDate(userProfile.createdAt) }}</div>
                </div>
              </div>
              <div class="info-card">
                <div class="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div class="info-content">
                  <div class="info-label">Last Login</div>
                  <div class="info-value">{{ formatDate(userProfile.lastLogin) }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Subscription Section -->
        <section id="subscription-section" class="settings-section">
          <div class="section-header">
            <div class="section-icon subscription-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"/>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
            </div>
            <div>
              <h2>Subscription</h2>
              <p>Manage your plan and track your usage</p>
            </div>
          </div>

          <div class="section-content">
            <!-- Plan Card -->
            <div class="plan-card">
              <div class="plan-header">
                <div>
                  <div class="plan-badge" :class="subscriptionTier">{{ subscriptionTier.toUpperCase() }}</div>
                  <h3 class="plan-title">{{ subscriptionTier === 'free' ? 'Free Plan' : 'Premium Plan' }}</h3>
                  <p class="plan-description">{{ subscriptionTier === 'free' ? 'Perfect for getting started' : 'All features unlocked' }}</p>
                </div>
                <button class="btn-primary btn-upgrade" @click="handleUpgrade">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                  Upgrade Plan
                </button>
              </div>

              <!-- Usage Progress -->
              <div class="usage-section">
                <h4>Monthly Usage</h4>
                <div class="usage-items">
                  <div class="usage-row">
                    <div class="usage-info">
                      <span class="usage-name">Quizzes Generated</span>
                      <span class="usage-numbers">{{ usageLimits.quizzesUsed }} / {{ usageLimits.quizzesLimit }}</span>
                    </div>
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: getUsagePercentage(usageLimits.quizzesUsed, usageLimits.quizzesLimit) + '%' }"
                        :class="{ warning: getUsagePercentage(usageLimits.quizzesUsed, usageLimits.quizzesLimit) > 80 }"
                      ></div>
                    </div>
                  </div>

                  <div class="usage-row">
                    <div class="usage-info">
                      <span class="usage-name">AI Summaries</span>
                      <span class="usage-numbers">{{ usageLimits.summariesUsed }} / {{ usageLimits.summariesLimit }}</span>
                    </div>
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: getUsagePercentage(usageLimits.summariesUsed, usageLimits.summariesLimit) + '%' }"
                        :class="{ warning: getUsagePercentage(usageLimits.summariesUsed, usageLimits.summariesLimit) > 80 }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Features -->
              <div class="features-section">
                <h4>Plan Features</h4>
                <div class="feature-list">
                  <div class="feature">
                    <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Up to 20 questions per quiz</span>
                  </div>
                  <div class="feature">
                    <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{{ usageLimits.questionTypesAvailable }} question types available</span>
                  </div>
                  <div class="feature">
                    <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Basic AI analysis</span>
                  </div>
                  <div class="feature">
                    <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Standard processing speed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Preferences Section -->
        <section id="preferences-section" class="settings-section">
          <div class="section-header">
            <div class="section-icon preferences-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
            </div>
            <div>
              <h2>Preferences</h2>
              <p>Customize your experience</p>
            </div>
          </div>

          <div class="section-content">
            <!-- Theme Settings -->
            <div class="preference-card">
              <div class="preference-header">
                <h3>Appearance</h3>
                <p>Choose your preferred theme</p>
              </div>
              <div class="theme-grid">
                <div 
                  v-for="theme in themes" 
                  :key="theme.value"
                  class="theme-card"
                  :class="{ active: currentTheme === theme.value }"
                  @click="updateTheme(theme.value)"
                >
                  <div class="theme-visual">
                    <div class="theme-preview-light" v-if="theme.value === 'light'">
                      <div class="preview-header"></div>
                      <div class="preview-body">
                        <div class="preview-item"></div>
                        <div class="preview-item"></div>
                      </div>
                    </div>
                    <div class="theme-preview-dark" v-else-if="theme.value === 'dark'">
                      <div class="preview-header"></div>
                      <div class="preview-body">
                        <div class="preview-item"></div>
                        <div class="preview-item"></div>
                      </div>
                    </div>
                    <div class="theme-preview-system" v-else>
                      <div class="half-light"></div>
                      <div class="half-dark"></div>
                    </div>
                  </div>
                  <div class="theme-name">{{ theme.label }}</div>
                  <div v-if="currentTheme === theme.value" class="active-indicator">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Notifications Section -->
        <section id="notifications-section" class="settings-section">
          <div class="section-header">
            <div class="section-icon notifications-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h2>Notifications</h2>
              <p>Manage how you receive updates</p>
            </div>
          </div>

          <div class="section-content">
            <div class="notification-card">
              <div class="notification-item">
                <div class="notification-info">
                  <h4>Email Notifications</h4>
                  <p>Receive email updates about your account and quizzes</p>
                </div>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.emailNotifications"
                    @change="updateNotificationPreferences"
                  />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="notification-item">
                <div class="notification-info">
                  <h4>Quiz Reminders</h4>
                  <p>Get notified about incomplete quizzes</p>
                </div>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.quizReminders"
                    @change="updateNotificationPreferences"
                    :disabled="!notificationPreferences.emailNotifications"
                  />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="notification-item">
                <div class="notification-info">
                  <h4>Weekly Digest</h4>
                  <p>Receive a weekly summary of your activity</p>
                </div>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.weeklyDigest"
                    @change="updateNotificationPreferences"
                    :disabled="!notificationPreferences.emailNotifications"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Security Section -->
        <section id="security-section" class="settings-section">
          <div class="section-header">
            <div class="section-icon security-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2>Security</h2>
              <p>Protect your account with a strong password</p>
            </div>
          </div>

          <div class="section-content">
            <div class="security-card">
              <form @submit.prevent="updatePassword" class="password-update-form">
                <div class="input-group">
                  <label for="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    v-model="passwordForm.currentPassword"
                    type="password"
                    class="input-field"
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div class="input-row">
                  <div class="input-group">
                    <label for="newPassword">New Password</label>
                    <input
                      id="newPassword"
                      v-model="passwordForm.newPassword"
                      type="password"
                      class="input-field"
                      placeholder="Enter new password"
                      minlength="6"
                      required
                    />
                  </div>
                  <div class="input-group">
                    <label for="confirmPassword">Confirm New Password</label>
                    <input
                      id="confirmPassword"
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      class="input-field"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  class="btn-primary"
                  :disabled="isUpdatingPassword"
                >
                  <BeatLoader
                    v-if="isUpdatingPassword"
                    :loading="true"
                    color="#ffffff"
                    size="10px"
                  />
                  <span v-else>Update Password</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        <!-- Danger Zone Section -->
        <section id="danger-section" class="settings-section danger-section">
          <div class="section-header">
            <div class="section-icon danger-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2>Danger Zone</h2>
              <p>Irreversible and destructive actions</p>
            </div>
          </div>

          <div class="section-content">
            <div class="danger-card">
              <div class="danger-warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <h4>Delete Account</h4>
                  <p>Once you delete your account, there is no going back. All your quizzes, files, and data will be permanently removed.</p>
                </div>
              </div>
              <button 
                class="btn-danger"
                @click="openDeleteModal"
                :disabled="isDeletingAccount"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete Account"
      :message="`This action cannot be undone. This will permanently delete your account and remove all data from our servers.`"
      confirm-text="Delete Account"
      cancel-text="Cancel"
      :confirm-disabled="deleteConfirmation !== 'DELETE'"
      @confirm="deleteAccount"
      @cancel="closeDeleteModal"
    >
      <template #customContent>
        <div class="delete-confirmation">
          <label for="deleteConfirmation">Type <strong>DELETE</strong> to confirm:</label>
          <input
            id="deleteConfirmation"
            v-model="deleteConfirmation"
            type="text"
            placeholder="DELETE"
            class="delete-input"
            @keyup.enter="deleteConfirmation === 'DELETE' && deleteAccount()"
          />
        </div>
      </template>
    </ConfirmModal>
  </AppShell>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* Main Layout */
.settings-wrapper {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 40px;
  min-height: calc(100vh - 200px);
}

/* Sidebar Navigation */
.settings-sidebar {
  position: sticky;
  top: 100px;
  height: fit-content;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: #f8fafc;
  color: #334155;
}

.nav-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.nav-item svg {
  flex-shrink: 0;
}

/* Main Content Area */
.settings-main {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Section Styles */
.settings-section {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  scroll-margin-top: 100px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
}

.section-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.profile-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.subscription-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.preferences-icon {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
}

.notifications-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.security-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.danger-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.section-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.section-header p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.6;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Profile Card Styles */
.profile-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.profile-main {
  display: flex;
  gap: 32px;
  padding: 32px;
  align-items: flex-start;
}

.profile-avatar-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  position: relative;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  font-weight: 700;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.file-input {
  display: none;
}

.avatar-upload-btn,
.avatar-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.avatar-upload-btn {
  background: #667eea;
  color: white;
}

.avatar-upload-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.avatar-delete-btn {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.avatar-delete-btn:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

.avatar-delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-details {
  flex: 1;
}

.details-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.username {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
}

.email {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.bio {
  font-size: 15px;
  color: #475569;
  line-height: 1.7;
  margin: 8px 0 0;
}

.bio.placeholder {
  color: #94a3b8;
  font-style: italic;
}

.details-edit {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #e5e7eb;
  border-top: 1px solid #e5e7eb;
}

.stat-item {
  background: white;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-divider {
  width: 1px;
  background: #e5e7eb;
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.info-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.info-value {
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
}

/* Subscription / Plan Card */
.plan-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e5e7eb;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
}

.plan-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.plan-badge.free {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  color: white;
}

.plan-badge.pro,
.plan-badge.premium {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.plan-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
}

.plan-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.btn-upgrade {
  white-space: nowrap;
}

.usage-section {
  margin-bottom: 32px;
}

.usage-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px;
}

.usage-items {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.usage-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usage-name {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.usage-numbers {
  font-size: 14px;
  font-weight: 700;
  color: #667eea;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  transition: width 0.3s ease;
}

.progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
}

.features-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  color: #475569;
}

.check-icon {
  color: #10b981;
  flex-shrink: 0;
}

/* Preference Card (Theme Selector) */
.preference-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid #e5e7eb;
}

.preference-header {
  margin-bottom: 24px;
}

.preference-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.preference-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.theme-card {
  position: relative;
  padding: 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.theme-card.active {
  border-color: #667eea;
  background: #f8fafc;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.theme-visual {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
}

.theme-preview-light,
.theme-preview-dark {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.theme-preview-light .preview-header {
  height: 20px;
  background: #f1f5f9;
  border-bottom: 1px solid #e5e7eb;
}

.theme-preview-light .preview-body {
  flex: 1;
  background: white;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.theme-preview-light .preview-item {
  height: 12px;
  background: #f1f5f9;
  border-radius: 4px;
}

.theme-preview-dark .preview-header {
  height: 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.theme-preview-dark .preview-body {
  flex: 1;
  background: #0f172a;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.theme-preview-dark .preview-item {
  height: 12px;
  background: #1e293b;
  border-radius: 4px;
}

.theme-preview-system {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.half-light {
  background: white;
}

.half-dark {
  background: #0f172a;
}

.theme-name {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  text-align: center;
}

.theme-card.active .theme-name {
  color: #667eea;
}

.active-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* Notification Card */
.notification-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid #e5e7eb;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-info {
  flex: 1;
}

.notification-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px;
}

.notification-info p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

input:disabled + .slider {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Security Card & Forms */
.security-card,
.danger-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid #e5e7eb;
}

.password-update-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.input-field {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  color: #1e293b;
  background: white;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.input-field.textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.6;
}

.input-field:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-height: 44px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Danger Section Styles */
.danger-section {
  border: 2px solid #fecaca !important;
  background: #fef2f2 !important;
}

.danger-section .section-header {
  border-color: #fecaca;
}

.danger-section .section-header h2 {
  color: #dc2626;
}

.danger-section .section-header p {
  color: #b91c1c;
}

.danger-card {
  background: white !important;
  border: 2px solid #fecaca !important;
}

.danger-warning {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fef2f2;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
}

.danger-warning svg {
  color: #dc2626;
  flex-shrink: 0;
}

.danger-warning h4 {
  font-size: 16px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 8px;
}

.danger-warning p {
  font-size: 14px;
  color: #991b1b;
  margin: 0;
  line-height: 1.6;
}

/* Delete Confirmation Modal */
.delete-confirmation {
  margin-top: 20px;
  padding: 20px;
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 12px;
}

.delete-confirmation label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #dc2626;
  font-size: 14px;
}

.delete-confirmation label strong {
  font-weight: 700;
}

.delete-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #fecaca;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  box-sizing: border-box;
  font-family: monospace;
}

.delete-input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
}

.delete-input::placeholder {
  color: #cbd5e1;
  font-weight: 500;
}

/* Responsive Styles */
@media (max-width: 1200px) {
  .settings-wrapper {
    grid-template-columns: 240px 1fr;
    gap: 32px;
  }
}

@media (max-width: 1024px) {
  .settings-wrapper {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .settings-sidebar {
    position: static;
  }

  .settings-nav {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
  }

  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .input-row {
    grid-template-columns: 1fr;
  }

  .theme-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .settings-section {
    padding: 24px 20px;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
  }

  .section-icon {
    width: 48px;
    height: 48px;
  }

  .section-header h2 {
    font-size: 24px;
  }

  .profile-main {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
  }

  .stats-container {
    grid-template-columns: 1fr 1fr;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .plan-header {
    flex-direction: column;
    gap: 16px;
  }

  .btn-upgrade {
    width: 100%;
  }

  .theme-grid {
    grid-template-columns: 1fr;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .button-group {
    flex-direction: column-reverse;
  }

  .button-group .btn-primary,
  .button-group .btn-secondary {
    width: 100%;
  }

  .details-view .btn-secondary {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .settings-nav {
    grid-template-columns: 1fr;
  }

  .settings-section {
    padding: 20px 16px;
    border-radius: 16px;
  }

  .section-header h2 {
    font-size: 22px;
  }

  .username {
    font-size: 24px;
  }

  .stats-container {
    grid-template-columns: 1fr;
  }

  .avatar-actions {
    flex-direction: column;
    width: 100%;
  }

  .avatar-upload-btn,
  .avatar-delete-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Dark Mode Styles */
body.dark .settings-nav {
  background: #1e293b;
  border-color: #334155;
}

body.dark .nav-item {
  color: #cbd5e1;
}

body.dark .nav-item:hover {
  background: #334155;
  color: #e2e8f0;
}

body.dark .nav-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

body.dark .settings-section {
  background: #1e293b;
  border-color: #334155;
}

body.dark .section-header {
  border-color: #334155;
}

body.dark .section-header h2 {
  color: #e2e8f0;
}

body.dark .section-header p {
  color: #94a3b8;
}

body.dark .profile-card,
body.dark .plan-card,
body.dark .preference-card,
body.dark .notification-card,
body.dark .security-card {
  background: linear-gradient(135deg, #1e293b 0%, #1e293b 100%) !important;
  border-color: #334155;
}

body.dark .username {
  color: #e2e8f0;
}

body.dark .email {
  color: #94a3b8;
}

body.dark .bio {
  color: #cbd5e1;
}

body.dark .stat-item {
  background: #1e293b;
}

body.dark .stat-value {
  color: #e2e8f0;
}

body.dark .stat-label {
  color: #94a3b8;
}

body.dark .info-card {
  background: #1e293b;
  border-color: #334155;
}

body.dark .info-label {
  color: #94a3b8;
}

body.dark .info-value {
  color: #e2e8f0;
}

body.dark .plan-title,
body.dark .usage-section h4,
body.dark .features-section h4 {
  color: #e2e8f0;
}

body.dark .plan-description,
body.dark .usage-name {
  color: #94a3b8;
}

body.dark .progress-bar {
  background: #334155;
}

body.dark .feature {
  background: #1e293b;
  border-color: #334155;
  color: #cbd5e1;
}

body.dark .preference-header h3,
body.dark .notification-info h4 {
  color: #e2e8f0;
}

body.dark .preference-header p,
body.dark .notification-info p {
  color: #94a3b8;
}

body.dark .theme-card {
  background: #1e293b;
  border-color: #334155;
}

body.dark .theme-card:hover {
  border-color: #667eea;
}

body.dark .theme-card.active {
  background: #334155;
}

body.dark .theme-name {
  color: #cbd5e1;
}

body.dark .theme-visual {
  border-color: #334155;
}

body.dark .input-group label {
  color: #cbd5e1;
}

body.dark .input-field {
  background: #0f172a;
  border-color: #334155;
  color: #e2e8f0;
}

body.dark .input-field:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

body.dark .input-field:disabled {
  background: #1e293b;
  color: #64748b;
}

body.dark .slider {
  background-color: #475569;
}

body.dark .danger-section {
  background: #1f1419 !important;
  border-color: #7f1d1d !important;
}

body.dark .danger-section .section-header h2 {
  color: #f87171;
}

body.dark .danger-section .section-header p {
  color: #fca5a5;
}

body.dark .danger-card {
  background: #1e293b !important;
  border-color: #7f1d1d !important;
}

body.dark .danger-warning {
  background: #1f1419;
  border-color: #7f1d1d;
}

body.dark .danger-warning h4 {
  color: #f87171;
}

body.dark .danger-warning p {
  color: #fca5a5;
}

body.dark .delete-confirmation {
  background: #1f1419;
  border-color: #7f1d1d;
}

body.dark .delete-input {
  background: #0f172a;
  border-color: #7f1d1d;
  color: #e2e8f0;
}

body.dark .delete-input:focus {
  border-color: #f87171;
  box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.1);
}

</style>
