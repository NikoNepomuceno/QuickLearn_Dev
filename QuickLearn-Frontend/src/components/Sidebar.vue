<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser, clearLegacyTokens } from '../services/authService'
import ConfirmModal from './ConfirmModal.vue'
import { BookOpen, Upload, Brain, LogOut, Trash, Menu, X, Settings, User, Book } from 'lucide-vue-next'

const router = useRouter()
const showConfirm = ref(false)
const isOpen = ref(false)

function requestLogout() {
  showConfirm.value = true
}

async function confirmLogout() {
  try {
    await logoutUser({})
  } catch (error) {
    console.warn('Unable to Log User Out', error)
  }
  clearLegacyTokens()
  window.$toast?.success('Logged out successfully')
  router.replace('/login')
}

function toggleSidebar() {
  isOpen.value = !isOpen.value
}

function closeSidebar() {
  isOpen.value = false
}

function handleOverlayClick() {
  closeSidebar()
}

router.afterEach(() => {
  closeSidebar()
})

function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    closeSidebar()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Mobile menu button -->
  <button class="mobile-menu-btn" @click="toggleSidebar" aria-label="Toggle menu">
    <Menu v-if="!isOpen" :size="24" />
    <X v-else :size="24" />
  </button>

  <!-- Sidebar overlay for mobile -->
  <div
    v-if="isOpen"
    class="sidebar-overlay"
    :class="{ active: isOpen }"
    @click="handleOverlayClick"
  ></div>

  <!-- Sidebar -->
  <aside class="sidebar" :class="{ open: isOpen }">
    <div class="brand">
      <BookOpen class="logo" :size="24" />
      <span class="brand-text">QuickLearn</span>
    </div>

    <nav class="nav">
      <router-link class="nav-item" to="/upload" @click="closeSidebar">
        <Upload class="icon" :size="20" />
        <span>Upload</span>
      </router-link>

      <!-- My Quizzes Page -->
      <router-link class="nav-item" to="/my-quizzes" @click="closeSidebar">
        <Brain class="icon" :size="20" />
        <span>My Quizzes</span>
      </router-link>

      <!-- Notes Page -->
      <router-link class="nav-item" to="/notes" @click="closeSidebar">
        <Book class="icon" :size="20" />
        <span>Notes</span>
      </router-link>

      <!-- UserProfile -->
       <router-link class="nav-item" to="/user-profile" @click="closeSidebar">
        <User class="icon" :size="20" />
        <span>Profile</span>
      </router-link>

      <!-- Settings Page -->
      <router-link class="nav-item" to="/settings" @click="closeSidebar">
        <Settings  class="icon" :size="20" />
        <span>Settings</span>
      </router-link>

      <!-- Trash Menu -->
      <router-link class="nav-item" to="/trash" @click="closeSidebar">
        <Trash class="icon" :size="20" />
        <span>Trash</span>
      </router-link>
    </nav>

    <button class="logout" @click="requestLogout">
      <LogOut class="icon" :size="18" />
      <span>Logout</span>
    </button>

    <ConfirmModal
      v-model="showConfirm"
      title="Logout?"
      message="You will need to log in again to continue."
      confirm-text="Logout"
      cancel-text="Cancel"
      @confirm="confirmLogout"
    />
  </aside>
</template>

<style scoped>

.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1001;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

body.dark .mobile-menu-btn {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(31, 42, 68, 0.3);
  color: #e5e7eb;
}

body.dark .mobile-menu-btn:hover {
  background: rgba(15, 23, 42, 0.8);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 260px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px 18px;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  background: linear-gradient(145deg, #f8faff 0%, #eef2ff 100%);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow: hidden;
}

body.dark .sidebar {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-right-color: rgba(31, 42, 68, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 1024px) {
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: -230px;
    width: 230px;
    height: 100vh;
    z-index: 1000;
    transition: left 0.3s ease;
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  body.dark .sidebar {
    background: rgba(15, 23, 42, 0.95) !important;
    box-shadow: 0 0 0 1px rgba(31, 42, 68, 0.3);
  }

  .sidebar.open {
    left: 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    left: -280px;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 20px;
  color: #334155;
  letter-spacing: -0.5px;
  margin-bottom: 24px;
}

body.dark .brand {
  color: #e2e8f0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 60px;
  margin-bottom: auto;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  text-decoration: none;
  border-radius: 10px;
  color: #475569;
  font-weight: 500;
  transition: all 0.25s ease;
}

.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #3730a3;
  transform: translateX(3px);
}

.nav-item.router-link-active {
  background: rgba(99, 102, 241, 0.15);
  color: #4338ca;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #6366f1;
}

body.dark .nav-item {
  color: #94a3b8;
}

body.dark .nav-item:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

body.dark .nav-item.router-link-active {
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  box-shadow: inset 3px 0 0 #6366f1;
}

.logout {
  margin-top: 24px;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.logout:hover {
  background: #fecaca;
  transform: translateY(-2px);
}

/* Dark mode logout */
body.dark .logout {
  background: #7f1d1d;
  color: #fca5a5;
}

body.dark .logout:hover {
  background: #991b1b;
}

@media (max-height: 700px) {
  /* Ensure it fits smaller screens too */
  .sidebar {
    padding: 16px;
  }
  .brand {
    margin-bottom: 16px;
  }
  .nav-item {
    padding: 8px 12px;
  }
  .logout {
    margin-top: 12px;
  }
}
</style>
