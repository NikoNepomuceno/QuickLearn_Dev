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
