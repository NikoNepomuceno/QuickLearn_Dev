<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser, clearLegacyTokens } from '../services/authService'
import ConfirmModal from './ConfirmModal.vue'
import { BookOpen, Upload, Brain, LogOut, Trash } from 'lucide-vue-next'

const router = useRouter()
const showConfirm = ref(false)

function requestLogout() {
  showConfirm.value = true
}

async function confirmLogout() {
  try {
    await logoutUser({})
  } catch {}
  clearLegacyTokens()
  window.$toast?.success('Logged out successfully')
  router.replace('/login')
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <BookOpen class="logo" :size="24" />
      <span class="brand-text">QuickLearn</span>
    </div>

    <nav class="nav">
      <router-link class="nav-item" to="/upload">
        <Upload class="icon" :size="20" />
        <span>Upload</span>
      </router-link>
      <router-link class="nav-item" to="/my-quizzes">
        <Brain class="icon" :size="20" />
        <span>My Quizzes</span>
      </router-link>
      <router-link class="nav-item" to="/trash">
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
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 230px;
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
  overflow: hidden; /* prevent scrollbars */
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
