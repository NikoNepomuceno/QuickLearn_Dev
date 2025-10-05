<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logoutUser, clearLegacyTokens } from '../services/authService'
import ConfirmModal from './ConfirmModal.vue'

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
    <div class="brand">QuickLearn</div>

    <nav class="nav">
      <router-link class="nav-item" to="/upload">Upload</router-link>
      <router-link class="nav-item" to="/quiz">My Quizzes</router-link>
    </nav>

    <button class="logout" @click="requestLogout">Logout</button>
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
  align-self: start;
  height: 100vh;
  padding: 20px 16px;
  border-right: 1px solid #e6e8ec;
  background: #ffffff;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}

.brand {
  font-weight: 800;
  font-size: 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav {
  display: grid;
  gap: 8px;
}

.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #374151;
}

.nav-item.router-link-active {
  background: #f3f4ff;
  color: #4b53c5;
  font-weight: 600;
}


.logout {
  padding: 10px 12px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  color: #b00020;
  cursor: pointer;
}

@media (max-width: 900px) {
  .sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e6e8ec;
    grid-template-rows: auto auto auto;
  }
}
</style>


