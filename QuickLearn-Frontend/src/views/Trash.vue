<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import cloudQuizService from '../services/cloudQuizService'
import { Trash2, RotateCcw, XCircle } from 'lucide-vue-next'

const items = ref([])
const isLoading = ref(false)
const error = ref('')

// Modal state
const showRestoreModal = ref(false)
const itemToRestore = ref(null)
const showDeleteModal = ref(false)
const itemToDelete = ref(null)

const restoreMessage = computed(() => {
  if (!itemToRestore.value) return 'Restore this quiz?'
  return `Restore "${itemToRestore.value.title || 'Untitled Quiz'}" to your quizzes?`
})

const deleteMessage = computed(() => {
  if (!itemToDelete.value) return 'Permanently delete this quiz? This cannot be undone.'
  return `Permanently delete "${itemToDelete.value.title || 'Untitled Quiz'}"? This cannot be undone.`
})

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

function requestRestore(item) {
  itemToRestore.value = item
  showRestoreModal.value = true
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

function requestDelete(item) {
  itemToDelete.value = item
  showDeleteModal.value = true
}

async function permanentlyDelete(item) {
  try {
    await cloudQuizService.permanentlyDeleteQuiz(item.id)
    window.$toast?.success('Quiz permanently deleted')
    await loadTrash()
  } catch (e) {
    window.$toast?.error('Failed to permanently delete quiz')
  }
}

async function confirmRestore() {
  if (!itemToRestore.value) return
  try {
    await restore(itemToRestore.value)
  } finally {
    showRestoreModal.value = false
    itemToRestore.value = null
  }
}

function cancelRestore() {
  showRestoreModal.value = false
  itemToRestore.value = null
}

async function confirmDelete() {
  if (!itemToDelete.value) return
  try {
    await permanentlyDelete(itemToDelete.value)
  } finally {
    showDeleteModal.value = false
    itemToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteModal.value = false
  itemToDelete.value = null
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
          <div class="card-header">
            <div class="card-icon">🗑️</div>
            <div class="card-title-group">
              <div class="card-title">{{ item.title || 'Untitled Quiz' }}</div>
              <div class="card-subtitle">Deleted {{ new Date(item.metadata?.deletedAt).toLocaleString() }}</div>
            </div>
            <div class="badge">Trashed</div>
          </div>

          <div class="card-body">
            <div class="meta-pills">
              <span class="pill">Quiz</span>
              <span v-if="item.metadata?.questionCount" class="pill">{{ item.metadata.questionCount }} questions</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn btn-primary" @click="() => requestRestore(item)"><RotateCcw :size="16" /> Restore</button>
            <button class="btn btn-danger" @click="() => requestDelete(item)"><XCircle :size="16" /> Delete</button>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        v-model="showRestoreModal"
        title="Restore Quiz"
        :message="restoreMessage"
        confirm-text="Restore"
        variant="primary"
        cancel-text="Cancel"
        @confirm="confirmRestore"
        @cancel="cancelRestore"
      />

      <ConfirmModal
        v-model="showDeleteModal"
        title="Delete Quiz"
        :message="deleteMessage"
        confirm-text="Delete"
        variant="danger"
        cancel-text="Cancel"
        @confirm="confirmDelete"
        @cancel="cancelDelete"
      />
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04),
    0 6px 12px rgba(0, 0, 0, 0.06),
    0 18px 36px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  position: relative;
}
.card:hover {}
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  color: #4338ca;
  flex-shrink: 0;
}
.card-title-group { flex: 1; min-width: 0; }
.card-title {
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-subtitle {
  color: #6b7280;
  font-size: 12px;
  margin-top: 2px;
}
.badge {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 3px 6px rgba(0,0,0,0.06);
}
.card-body { margin: 12px 0 6px; }
.meta-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 3px 6px rgba(0,0,0,0.06);
}
.card-header {
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
  padding: 8px;
  margin: -8px -8px 8px;
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
}
.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.card-icon {
  box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06);
  position: relative;
}
.card-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7);
  pointer-events: none;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  box-shadow: 0 1px 1px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06);
}
.btn-primary {
  background: #4338ca;
  color: #fff;
}
.btn-primary:hover {}
.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.btn-danger:hover {}

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

/* Dark mode variants */
body.dark .content { color: #e5e7eb; }
body.dark .subtitle { color: #9ca3af; }
body.dark .empty-card { background: #0f172a; border-color: #1f2a44; }
body.dark .empty-card .title { color: #e5e7eb; }
body.dark .empty-card .hint { color: #9ca3af; }
body.dark .card { background: #1e293b; border-color: #334155; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.38), 0 22px 44px rgba(0,0,0,0.5); }
body.dark .card::before { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06); }
body.dark .card-header { background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
body.dark .card-title { color: #e5e7eb; }
body.dark .card-subtitle { color: #94a3b8; }
body.dark .card-icon { background: #334155; color: #e0e7ff; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4); }
body.dark .card-icon::after { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); }
body.dark .badge { background: #0f172a; color: #cbd5e1; border-color: #334155; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.35); }
body.dark .pill { background: #0f172a; color: #cbd5e1; border-color: #334155; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.35); }
body.dark .btn-primary { background: #6366f1; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4); }
body.dark .btn-primary:hover {}
body.dark .btn-danger { background: #7f1d1d; color: #fecaca; border-color: #991b1b; box-shadow: 0 1px 1px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4); }
body.dark .btn-danger:hover {}
</style>

 


