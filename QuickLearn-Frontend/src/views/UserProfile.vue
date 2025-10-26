<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/Sidebar.vue';
import { useRoute, useRouter } from 'vue-router';
import BeatLoader from 'vue-spinner/src/BeatLoader.vue';
import { authService } from '@/services/authService.js';

const router = useRouter()
const route = useRoute()

// Reactive data
const isLoading = ref(false)
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

// Load user profile data
const loadUserProfile = async () => {
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

// Load account statistics
const loadAccountStats = async () => {
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

// Start editing profile
const startEditing = () => {
  isEditing.value = true
  editForm.value = {
    displayName: userProfile.value.displayName,
    bio: userProfile.value.bio
  }
}

// Cancel editing
const cancelEditing = () => {
  isEditing.value = false
  editForm.value = {
    displayName: '',
    bio: ''
  }
}

// Save profile changes
const saveProfile = async () => {
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

// Handle profile picture upload
const handleProfilePictureUpload = async (event) => {
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

// Delete profile picture
const deleteProfilePicture = async () => {
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

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Format time spent
const formatTimeSpent = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Lifecycle hooks
onMounted(() => {
  loadUserProfile()
})

</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <h1>Profile</h1>
        <p class="subtitle">Manage your profile and view your statistics.</p>
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

      <!-- Profile Content -->
      <div v-else class="profile-container">
        <!-- Profile Header -->
        <div class="profile-header">
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
              <h2 class="profile-name">{{ userProfile.displayName || userProfile.username }}</h2>
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
                <label for="email">Email</label>
                <input 
                  id="email"
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
        <div class="stats-section">
          <h3 class="stats-title">Account Statistics</h3>
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
        <div class="account-info">
          <h3 class="info-title">Account Information</h3>
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

    </div>
  </div>
</template>

<style scoped>

.layout {
  display: flex;
  max-height: 100vh;
}

.content {
  flex: 1;
  padding: 24px;
  max-width: none;
  margin-left: 0px;
  background: #f8fafc;
}

.header {
  margin-bottom: 32px;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* Profile Container */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Profile Header */
.profile-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 32px;
  align-items: flex-start;
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
  font-size: 1.875rem;
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

/* Profile Edit Form */
.profile-edit {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
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

/* Statistics Section */
.stats-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.stats-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 24px 0;
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

/* Account Information */
.account-info {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.info-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 24px 0;
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


/* Responsive Design */
@media (max-width: 768px) {
  .content {
    padding: 16px;
    margin-left: 0;
  }
  
  .profile-header {
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
  .header h1 {
    font-size: 1.5rem;
  }
  
  .profile-header {
    padding: 24px;
  }
  
  .stats-section,
  .account-info {
    padding: 24px;
  }
  
  .stat-card {
    padding: 20px;
  }
}

/* Dark Mode Styles */
body.dark .content {
  background: #0f172a;
}

body.dark .header h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

body.dark .profile-header {
  background: #0f172a;
  border: 1px solid #1f2a44;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

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

body.dark .form-group label {
  color: #e5e7eb;
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

body.dark .stats-section {
  background: #0f172a;
  border: 1px solid #1f2a44;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

body.dark .stats-title {
  color: #e5e7eb;
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

body.dark .account-info {
  background: #0f172a;
  border: 1px solid #1f2a44;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

body.dark .info-title {
  color: #e5e7eb;
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
</style>
