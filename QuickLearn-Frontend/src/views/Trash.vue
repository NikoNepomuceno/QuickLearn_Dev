<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import cloudQuizService from '../services/cloudQuizService'
import { Trash2, RotateCcw, XCircle } from 'lucide-vue-next'

const items = ref([])
const isLoading = ref(false)
const error = ref('')

async function loadTrash() {
  try {
    isLoading.value = true
    error.value = ''
    items.value = await cloudQuizService.getTrashedQuizzes()
  } catch (e) {
    error.value = e?.message || 'Failed to load trash'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

async function restore(item) {
  try {
    await cloudQuizService.restoreQuiz(item.id)
    window.$toast?.success('Quiz restored')
    await loadTrash()
  } catch (e) {
    window.$toast?.error('Failed to restore quiz')
  }
}

async function permanentlyDelete(item) {
  if (!confirm('Permanently delete this quiz? This cannot be undone.')) return
  try {
    await cloudQuizService.permanentlyDeleteQuiz(item.id)
    window.$toast?.success('Quiz permanently deleted')
    await loadTrash()
  } catch (e) {
    window.$toast?.error('Failed to permanently delete quiz')
  }
}

onMounted(loadTrash)
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <h1><Trash2 :size="22" /> Trash</h1>
        <p class="subtitle">Deleted quizzes are kept for 30 days before auto-removal.</p>
      </div>

      <div v-if="isLoading" class="loading">Loading…</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <div v-else-if="items.length === 0" class="empty">
        <div class="empty-card">
          <div class="icon">🗑️</div>
          <div class="title">Trash is empty</div>
          <div class="hint">Deleted quizzes will show up here for 30 days.</div>
        </div>
      </div>

      <div v-else class="grid">
        <div v-for="item in items" :key="item.id" class="card">
          <div class="row">
            <div class="meta">
              <div class="name">{{ item.title || 'Untitled Quiz' }}</div>
              <div class="desc">Deleted: {{ new Date(item.metadata?.deletedAt).toLocaleString() }}</div>
            </div>
            <div class="actions">
              <button class="secondary" @click="() => restore(item)"><RotateCcw :size="16" /> Restore</button>
              <button class="danger" @click="() => permanentlyDelete(item)"><XCircle :size="16" /> Delete</button>
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
  min-height: 100vh;
}

.content {
  flex: 1;
  padding: 24px;
  max-width: none;
  margin-left: 40px;
}

.header h1{
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
}

.subtitle {
  color: #6b7280;
  margin: 0 0 16px;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  flex: 0 0 320px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meta .name {
  font-weight: 700;
  color: #111827;
}

.meta .desc {
  color: #6b7280;
  font-size: 12px;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
}

.secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.danger {
  background: #fee2e2;
  color: #b91c1c;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.empty {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-card {
  text-align: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
  width: 520px;
}

.empty-card .icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.empty-card .title {
  font-weight: 700;
  margin-bottom: 6px;
}

.empty-card .hint {
  color: #6b7280;
}
</style>


