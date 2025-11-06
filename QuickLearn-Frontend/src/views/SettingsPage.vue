<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useRoute, useRouter } from 'vue-router';
import BeatLoader from 'vue-spinner/src/BeatLoader.vue';
import { authService } from '@/services/authService'

const router = useRouter()

const isLoading = ref(false)
const isUpdatingPassword = ref(false)
const isDeletingAccount = ref(false)
const isUpdatingNotifications = ref(false)

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

// Initialize theme on mount
onMounted(() => {
  initializeTheme()
  loadNotificationPreferences()
  loadUserProfile()
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
  <div class="layout">
    <Sidebar />
    <div class="content">
      <!-- Professional Header -->
      <div class="header">
        <div class="header-content">
          <h1>Settings</h1>
          <p class="subtitle">Manage your account preferences and security settings</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading">
        <BeatLoader
          :loading="true"
          text="Loading..."
          color="#667eea"
          size="20px"
        />
      </div>

      <!-- Settings Content -->
      <div v-else class="settings-content">
        <!-- Settings Panels -->
        <div class="settings-panels">
          <!-- Profile Settings -->
          <div class="settings-panel">
            <div class="panel-header">
              <h2>Profile</h2>
              <p>Manage your profile and view your statistics</p>
            </div>

            <!-- Profile Header -->
            <div class="profile-header-inline">
              <div class="profile-picture-section">
                <div class="profile-picture">
                  <img 
                    v-if="userProfile.profilePicture" 
                    :src="userProfile.profilePicture" 
                    :alt="userProfile.displayName || userProfile.username"
                    class="profile-img"
                  />
                  <div v-else class="profile-placeholder">
                    {{ userProfile.displayName?.charAt(0)?.toUpperCase() || userProfile.username?.charAt(0)?.toUpperCase() || 'U' }}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    @change="handleProfilePictureUpload"
                    class="profile-upload-input"
                    id="profile-upload"
                  />
                  <label for="profile-upload" class="profile-upload-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </label>
                  <button 
                    v-if="userProfile.profilePicture" 
                    @click="deleteProfilePicture" 
                    class="profile-delete-btn"
                    :disabled="isSaving"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="profile-info">
                <div v-if="!isEditing" class="profile-display">
                  <h3 class="profile-name">{{ userProfile.displayName || userProfile.username }}</h3>
                  <p class="profile-email">{{ userProfile.email }}</p>
                  <p v-if="userProfile.bio" class="profile-bio">{{ userProfile.bio }}</p>
                  <p v-else class="profile-bio placeholder">No bio added yet</p>
                  <button @click="startEditing" class="edit-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Profile
                  </button>
                </div>
                
                <div v-else class="profile-edit">
                  <div class="form-group">
                    <label for="displayName">Display Name</label>
                    <input 
                      id="displayName"
                      v-model="editForm.displayName" 
                      type="text" 
                      class="form-input"
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label for="profile-email">Email</label>
                    <input 
                      id="profile-email"
                      :value="userProfile.email" 
                      type="email" 
                      class="form-input"
                      placeholder="Email (cannot be changed)"
                      disabled
                    />
                    <small class="form-help">Email cannot be changed</small>
                  </div>
                  
                  <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea 
                      id="bio"
                      v-model="editForm.bio" 
                      class="form-textarea"
                      placeholder="Tell us about yourself"
                      rows="3"
                    ></textarea>
                  </div>
                  
                  <div class="form-actions">
                    <button @click="cancelEditing" class="cancel-btn" :disabled="isSaving">
                      Cancel
                    </button>
                    <button @click="saveProfile" class="save-btn" :disabled="isSaving">
                      <BeatLoader v-if="isSaving" :loading="true" color="#fff" size="8px" />
                      <span v-else>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Statistics -->
            <div class="setting-group" style="margin-top: 32px;">
              <div class="setting-label">
                <h3>Account Statistics</h3>
                <p>Your quiz activity overview</p>
              </div>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                      <path d="M9 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                      <path d="M9 7h6v4H9z"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ accountStats.quizzesCreated }}</div>
                    <div class="stat-label">Quizzes Created</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 12l2 2 4-4"/>
                      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                      <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
                      <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ accountStats.quizzesTaken }}</div>
                    <div class="stat-label">Quizzes Taken</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ accountStats.averageScore }}%</div>
                    <div class="stat-label">Average Score</div>
                  </div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-number">{{ formatTimeSpent(accountStats.totalTimeSpent) }}</div>
                    <div class="stat-label">Time Spent</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Account Information -->
            <div class="setting-group">
              <div class="setting-label">
                <h3>Account Information</h3>
                <p>Your account details</p>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Member Since</span>
                  <span class="info-value">{{ formatDate(userProfile.createdAt) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Login</span>
                  <span class="info-value">{{ formatDate(userProfile.lastLogin) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">User ID</span>
                  <span class="info-value">{{ userProfile.id }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- General Settings -->
          <div class="settings-panel">
            <div class="panel-header">
              <h2>General Settings</h2>
              <p>Customize your app experience</p>
            </div>

            <!-- Theme Settings -->
            <div class="setting-group">
              <div class="setting-label">
                <h3>Theme</h3>
                <p>Choose your preferred color scheme</p>
              </div>
              <div class="theme-selector">
                <div 
                  v-for="theme in themes" 
                  :key="theme.value"
                  class="theme-option"
                  :class="{ active: currentTheme === theme.value }"
                  @click="updateTheme(theme.value)"
                >
                  <div class="theme-preview">
                    <div class="preview-light" v-if="theme.value === 'light'"></div>
                    <div class="preview-dark" v-else-if="theme.value === 'dark'"></div>
                    <div class="preview-system" v-else></div>
                  </div>
                  <span class="theme-label">{{ theme.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notification Settings -->
          <div class="settings-panel">
            <div class="panel-header">
              <h2>Notifications</h2>
              <p>Manage your email notification preferences</p>
            </div>

            <div class="setting-group">
              <div class="setting-label">
                <h3>Email Notifications</h3>
                <p>Receive email updates about your quizzes and account</p>
              </div>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.emailNotifications"
                    @change="updateNotificationPreferences"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">
                  {{ notificationPreferences.emailNotifications ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>

            <div class="setting-group">
              <div class="setting-label">
                <h3>Quiz Reminders</h3>
                <p>Get reminded about incomplete quizzes</p>
              </div>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.quizReminders"
                    @change="updateNotificationPreferences"
                    :disabled="!notificationPreferences.emailNotifications"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">
                  {{ notificationPreferences.quizReminders ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>

            <div class="setting-group">
              <div class="setting-label">
                <h3>Weekly Digest</h3>
                <p>Receive a weekly summary of your quiz activity</p>
              </div>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="notificationPreferences.weeklyDigest"
                    @change="updateNotificationPreferences"
                    :disabled="!notificationPreferences.emailNotifications"
                  />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">
                  {{ notificationPreferences.weeklyDigest ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Security Settings -->
          <div class="settings-panel">
            <div class="panel-header">
              <h2>Security</h2>
              <p>Manage your account security and password</p>
            </div>

            <div class="setting-group">
              <div class="setting-label">
                <h3>Change Password</h3>
                <p>Update your account password for better security</p>
              </div>
              
              <form @submit.prevent="updatePassword" class="password-form">
                <div class="form-row">
                  <div class="form-group">
                    <label for="currentPassword">Current Password</label>
                    <input
                      id="currentPassword"
                      v-model="passwordForm.currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="newPassword">New Password</label>
                    <input
                      id="newPassword"
                      v-model="passwordForm.newPassword"
                      type="password"
                      placeholder="Enter your new password"
                      minlength="6"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input
                      id="confirmPassword"
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  class="btn primary"
                  :disabled="isUpdatingPassword"
                >
                  <BeatLoader
                    v-if="isUpdatingPassword"
                    :loading="true"
                    color="#ffffff"
                    size="12px"
                  />
                  <span v-else>Update Password</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="settings-panel danger-zone">
            <div class="panel-header">
              <h2>Danger Zone</h2>
              <p>Irreversible actions that will permanently affect your account</p>
            </div>

            <div class="setting-group">
              <div class="danger-info">
                <div class="danger-icon">⚠️</div>
                <div class="danger-content">
                  <h3>Delete Account</h3>
                  <p>Permanently delete your account and all associated data. This action cannot be undone and will remove all your quizzes, files, and account information.</p>
                </div>
              </div>
              <button 
                class="btn danger"
                @click="openDeleteModal"
                :disabled="isDeletingAccount"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Deletion Confirmation Modal -->
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
            <label for="deleteConfirmation">Type 'DELETE' to confirm:</label>
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
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.layout {
  display: flex;
  max-height: 100vh;
  background: #f8fafc;
}

.content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  background: #f8fafc;
  scrollbar-width: none; 
  -ms-overflow-style: none;
  max-width: none;
  margin-left: 40px;
}

.content::-webkit-scrollbar {
  display: none; 
}

.header {
  background: transparent;
  color: #1f2937;
  padding: 40px 32px;
  margin-bottom: 0;
}

.header-content h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
  font-weight: 400;
}

/* Settings Content */
.settings-content {
  padding: 32px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Settings Panels */
.settings-panels {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-panel {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.panel-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.panel-header p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

/* Setting Groups */
.setting-group {
  margin-bottom: 32px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  margin-bottom: 16px;
}

.setting-label h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.setting-label p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

/* Theme Selector */
.theme-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #ffffff;
  position: relative;
}

.theme-option:hover {
  border-color: #667eea;
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.theme-option.active {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.theme-preview {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-light {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.preview-dark {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.preview-system {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #0f172a 100%);
  position: relative;
}

.preview-system::after {
  content: '⚙️';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
}

.theme-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.theme-option.active .theme-label {
  color: #667eea;
}

/* Toggle Switch */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .toggle-slider {
  background-color: #667eea;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

/* Password Form */
.password-form {
  max-width: 600px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.form-row:first-child {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: #ffffff;
  color: #374151;
  box-sizing: border-box;
  width: 100%;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Danger Zone */
.danger-zone {
  border-color: #fecaca;
  background: #fef2f2;
}

.danger-zone .panel-header h2 {
  color: #dc2626;
}

.danger-zone .panel-header p {
  color: #991b1b;
}

.danger-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 12px;
}

.danger-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.danger-content h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #dc2626;
}

.danger-content p {
  margin: 0;
  color: #991b1b;
  font-size: 14px;
  line-height: 1.5;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #667eea;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.btn.primary:hover:not(:disabled) {
  background: #5a67d8;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transform: translateY(-1px);
}

.btn.danger {
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

.btn.danger:hover:not(:disabled) {
  background: #b91c1c;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  transform: translateY(-1px);
}

/* Delete Confirmation Modal */
.delete-confirmation {
  margin-top: 16px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.delete-confirmation label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #dc2626;
  font-size: 14px;
}

.delete-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #fecaca;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: #ffffff;
  color: #374151;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.delete-input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.delete-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

/* Loading State */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* Dark Mode Styles */
body.dark {
  background: #0f172a;
}

body.dark .content {
  background: #0f172a;
}

/* Ensure the page wrapper matches dark background to avoid light gutters */
body.dark .layout {
  background: #0f172a;
}

body.dark .header-content h1 {
  color: #e2e8f0;
}

body.dark .subtitle {
  color: #94a3b8;
}


body.dark .settings-panel {
  background: #1e293b;
  border-color: #334155;
}

body.dark .panel-header {
  border-color: #334155;
}

body.dark .panel-header h2 {
  color: #e2e8f0;
}

body.dark .panel-header p {
  color: #94a3b8;
}

body.dark .setting-label h3 {
  color: #e2e8f0;
}

body.dark .setting-label p {
  color: #94a3b8;
}

body.dark .theme-option {
  background: #1e293b;
  border-color: #334155;
}

body.dark .theme-option:hover {
  background: #334155;
}

body.dark .theme-option.active {
  background: #1e40af;
}

body.dark .theme-label {
  color: #cbd5e1;
}

body.dark .theme-option.active .theme-label {
  color: #a5b4fc;
}

body.dark .toggle-label {
  color: #cbd5e1;
}

body.dark .form-group label {
  color: #cbd5e1;
}

body.dark .form-group input {
  background: #0f172a;
  border-color: #334155;
  color: #e2e8f0;
}

body.dark .form-group input:focus {
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}

body.dark .danger-zone {
  background: #1f1419;
  border-color: #7f1d1d;
}

body.dark .danger-zone .panel-header h2 {
  color: #f87171;
}

body.dark .danger-zone .panel-header p {
  color: #fca5a5;
}

body.dark .danger-info {
  background: #0f172a;
  border-color: #7f1d1d;
}

body.dark .danger-content h3 {
  color: #f87171;
}

body.dark .danger-content p {
  color: #fca5a5;
}

body.dark .delete-confirmation {
  background: #1f1419;
  border-color: #7f1d1d;
}

body.dark .delete-confirmation label {
  color: #f87171;
}

body.dark .delete-input {
  background: #0f172a;
  border-color: #7f1d1d;
  color: #e2e8f0;
}

body.dark .delete-input:focus {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
}

body.dark .delete-input::placeholder {
  color: #6b7280;
}

/* Profile Styles */
.profile-header-inline {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.profile-picture-section {
  flex-shrink: 0;
}

.profile-picture {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #e2e8f0;
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: 600;
}

.profile-upload-input {
  display: none;
}

.profile-upload-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-upload-btn:hover {
  background: #5a67d8;
  transform: scale(1.05);
}

.profile-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-delete-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: scale(1.05);
}

.profile-delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.profile-info {
  flex: 1;
}

.profile-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.profile-email {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.profile-bio {
  color: #475569;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
}

.profile-bio.placeholder {
  color: #94a3b8;
  font-style: italic;
}

.edit-btn {
  align-self: flex-start;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.profile-edit {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.form-help {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}

.form-input,
.form-textarea {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
  color: #1f2937;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.save-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.save-btn {
  background: #667eea;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.stat-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: #1e293b;
  font-weight: 600;
}

/* Profile Dark Mode Styles */
body.dark .profile-picture {
  border-color: #1f2a44;
}

body.dark .profile-name {
  color: #e5e7eb;
}

body.dark .profile-email {
  color: #9ca3af;
}

body.dark .profile-bio {
  color: #cbd5e1;
}

body.dark .profile-bio.placeholder {
  color: #64748b;
}

body.dark .form-help {
  color: #9ca3af;
}

body.dark .form-input,
body.dark .form-textarea {
  background: #0b1222;
  border-color: #1f2a44;
  color: #e5e7eb;
}

body.dark .form-input:focus,
body.dark .form-textarea:focus {
  border-color: #7b86f2;
  box-shadow: 0 0 0 3px rgba(123, 134, 242, 0.2);
}

body.dark .cancel-btn {
  background: #334155;
  color: #cbd5e1;
}

body.dark .cancel-btn:hover {
  background: #475569;
}

body.dark .stat-card {
  background: #0b1222;
  border: 1px solid #1f2a44;
}

body.dark .stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

body.dark .stat-number {
  color: #e5e7eb;
}

body.dark .stat-label {
  color: #9ca3af;
}

body.dark .info-item {
  background: #0b1222;
  border: 1px solid #1f2a44;
}

body.dark .info-label {
  color: #9ca3af;
}

body.dark .info-value {
  color: #e5e7eb;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .settings-content {
    padding: 24px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 0;
  }
  
  .header {
    padding: 24px 16px;
  }
  
  .header-content h1 {
    font-size: 28px;
  }
  
  .settings-content {
    padding: 16px;
  }
  
  
  .settings-panel {
    padding: 24px;
  }
  
  .theme-selector {
    grid-template-columns: 1fr;
  }
  
  .danger-info {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-header-inline {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
  }
  
  .profile-info {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .cancel-btn,
  .save-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header-content h1 {
    font-size: 24px;
  }
  
  .settings-panel {
    padding: 20px;
  }
  
  .panel-header h2 {
    font-size: 20px;
  }
}

</style>
