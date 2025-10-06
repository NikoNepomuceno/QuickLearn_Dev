<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { downloadQuizAsPDF } from '../services/quizService'
import cloudQuizService from '../services/cloudQuizService'
import { useRouter } from 'vue-router'
import { FolderOpen, Plus, MoreVertical, Share2, Download, Play, BarChart3, FileText, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const quizzes = ref([])
const openMenuId = ref(null)
const isLoading = ref(false)
const error = ref(null)

onMounted(async () => {
  await loadQuizzes()
  document.addEventListener('click', onOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick)
})

async function loadQuizzes() {
  try {
    isLoading.value = true
    error.value = null

    if (!(await cloudQuizService.isAuthenticated())) {
      // Try to migrate localStorage data first
      try {
        const migrationResult = await cloudQuizService.migrateLocalStorageData()
        if (migrationResult.migrated > 0) {
          window.$toast?.success(migrationResult.message)
        }
      } catch (migrationError) {
        console.warn('Migration failed:', migrationError)
      }

      // If still not authenticated, redirect to login
      if (!(await cloudQuizService.isAuthenticated())) {
        router.push('/login')
        return
      }
    }

    quizzes.value = await cloudQuizService.getUserQuizzes()
  } catch (err) {
    console.error('Error loading quizzes:', err)
    error.value = err.message || 'Failed to load quizzes'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

function onOutsideClick() {
  openMenuId.value = null
}

function getBarColor(score) {
  if (score == null) return '#d1d5db' // gray when no attempts
  if (score < 50) return '#ef4444' // red
  if (score < 80) return '#f59e0b' // yellow
  return '#10b981' // green
}

function getPrimaryCtaText(quiz) {
  const summary = cloudQuizService.getQuizSummary(quiz)
  return summary.attemptsCount > 0 ? 'Retake Quiz' : 'Take Quiz'
}

function openQuiz(quiz) {
  router.push({ name: 'quiz', params: { quizId: quiz.id } })
}

async function shareQuiz(quiz) {
  try {
    const link = cloudQuizService.generateShareableLink(quiz)
    await cloudQuizService.copyToClipboard(link)
    window.$toast?.success('Share link copied to clipboard')
  } catch (e) {
    window.$toast?.error('Failed to generate share link')
  }
}

function downloadQuiz(quiz) {
  downloadQuizAsPDF(quiz)
}

async function deleteQuiz(quiz) {
  if (!confirm(`Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`)) {
    return
  }

  try {
    await cloudQuizService.deleteQuiz(quiz.id)
    window.$toast?.success('Quiz deleted successfully')
    await loadQuizzes() // Reload the list
  } catch (err) {
    console.error('Error deleting quiz:', err)
    window.$toast?.error('Failed to delete quiz')
  }
}

function toggleMenu(quiz, event) {
  event?.stopPropagation?.()
  openMenuId.value = openMenuId.value === quiz.id ? null : quiz.id
}

function formatFileSize(bytes) {
  return cloudQuizService.formatFileSize(bytes)
}

function getFileIcon(fileType) {
  switch (fileType?.toLowerCase()) {
    case 'pdf': return '📕'
    case 'docx': return '📘'
    case 'doc': return '📘'
    case 'txt': return '📄'
    default: return '📄'
  }
}
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <h1>My Quizzes</h1>
        <p class="subtitle">Review your generated quizzes and track progress.</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>Loading your quizzes...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error">
        <div class="error-card">
          <div class="icon">
            <FolderOpen :size="48" />
          </div>
          <div class="title">Failed to load quizzes</div>
          <div class="hint">{{ error }}</div>
          <button class="primary" @click="loadQuizzes">
            Try Again
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="quizzes.length === 0" class="empty">
        <div class="empty-card">
          <div class="icon">
            <FolderOpen :size="48" />
          </div>
          <div class="title">No quizzes yet</div>
          <div class="hint">Upload a file to generate your first quiz.</div>
          <button class="primary" @click="() => router.push('/upload')">
            <Plus :size="18" />
            Create a Quiz
          </button>
        </div>
      </div>

      <!-- Quiz Grid -->
      <div v-else class="grid">
        <div v-for="quiz in quizzes" :key="quiz.id" class="card">
          <div class="row">
            <div class="meta">
              <div class="name">{{ quiz.title || 'Untitled Quiz' }}</div>
              <div class="desc">{{ quiz.description }}</div>
            </div>
            <div class="menu">
              <button class="icon-btn" title="More" @click="(e) => toggleMenu(quiz, e)">
                <MoreVertical :size="16" />
              </button>
              <div class="dropdown" v-if="openMenuId === quiz.id">
                <button class="dropdown-item" @click="() => shareQuiz(quiz)">
                  <Share2 :size="16" />
                  Share
                </button>
                <button class="dropdown-item" @click="() => downloadQuiz(quiz)">
                  <Download :size="16" />
                  Download
                </button>
                <button class="dropdown-item danger" @click="() => deleteQuiz(quiz)">
                  <Trash2 :size="16" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- File Information -->
          <div v-if="quiz.sourceFile && quiz.sourceFile.name" class="file-info">
            <div class="file-icon">{{ getFileIcon(quiz.sourceFile.type) }}</div>
            <div class="file-details">
              <div class="file-name">{{ quiz.sourceFile.name }}</div>
              <div class="file-meta">
                {{ quiz.sourceFile.type?.toUpperCase() || 'FILE' }} •
                {{ formatFileSize(quiz.sourceFile.size) }}
              </div>
            </div>
          </div>

          <div class="progress">
            <div class="bar-bg"></div>
            <div
              class="bar-fill"
              :style="{
                width: (cloudQuizService.getQuizSummary(quiz).lastScore ?? 0) + '%',
                background: getBarColor(cloudQuizService.getQuizSummary(quiz).lastScore)
              }"
            ></div>
          </div>
          <div class="progress-meta">
            <span v-if="cloudQuizService.getQuizSummary(quiz).lastScore != null" class="score">
              Last score: {{ cloudQuizService.getQuizSummary(quiz).lastScore }}%
            </span>
            <span v-else class="score none">Not taken yet</span>
            <span class="attempts">Attempts: {{ cloudQuizService.getQuizSummary(quiz).attemptsCount }}</span>
          </div>

          <div class="actions">
            <button class="primary" @click="() => openQuiz(quiz)">
              <Play :size="16" />
              {{ getPrimaryCtaText(quiz) }}
            </button>
            <button
              v-if="cloudQuizService.getQuizSummary(quiz).attemptsCount > 0"
              class="secondary"
              @click="() => router.push({ name: 'quiz-results', params: { quizId: quiz.id } })"
            >
              <BarChart3 :size="16" />
              View Results
            </button>
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
}

@media (max-width: 1024px) {
  .content {
    padding-bottom: 120px; /* Add space for floating sidebar */
  }
}

.header h1 { margin: 0 0 6px; }
.subtitle { color: #6b7280; margin: 0 0 20px; }

/* Loading State */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty and Error States */
.empty, .error { display: flex; justify-content: center; padding: 60px 0; }
.empty-card, .error-card { text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; width: 520px; }
.empty-card .icon, .error-card .icon {
  color: #9ca3af;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}
.empty-card .title, .error-card .title { font-weight: 700; color: #1f2937; margin-bottom: 6px; }
.empty-card .hint, .error-card .hint { color: #6b7280; margin-bottom: 16px; }

.grid { display: flex; flex-wrap: wrap; gap: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.03); display: flex; flex-direction: column; flex: 0 0 320px; min-width: 320px; }

.row { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.meta .name { font-weight: 700; color: #111827; }
.meta .desc { color: #6b7280; font-size: 13px; margin-top: 4px; }

.menu { position: relative; }
.icon-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.icon-btn:hover {
  background: #e5e7eb;
  transform: scale(1.05);
}

.dropdown { position: absolute; right: 0; margin-top: 8px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); display: flex; flex-direction: column; min-width: 140px; z-index: 10; }
.dropdown-item {
  background: transparent;
  border: none;
  text-align: left;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}
.dropdown-item:hover { background: #f8faff; color: #4338ca; }
.dropdown-item.danger { color: #dc2626; }
.dropdown-item.danger:hover { background: #fef2f2; color: #dc2626; }

/* File Information */
.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 12px 0;
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  color: #6b7280;
  font-size: 11px;
  margin-top: 2px;
}

.progress { position: relative; height: 10px; border-radius: 6px; margin: 14px 0 6px; }
.bar-bg { position: absolute; inset: 0; background: #e5e7eb; border-radius: 6px; }
.bar-fill { position: absolute; inset: 0; width: 0; border-radius: 6px; transition: width .3s ease; }

.progress-meta { display: flex; justify-content: space-between; color: #6b7280; font-size: 12px; margin-bottom: 8px; }
.score.none { font-style: italic; }

.actions { display: flex; gap: 8px; margin-top: auto; }
.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102,126,234,0.3);
}

.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.secondary:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .content { padding: 16px; }
}

/* Dark mode styles */
body.dark .header h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

body.dark .empty-card {
  background: #0f172a;
  border-color: #1f2a44;
}

body.dark .empty-card .icon {
  color: #6b7280;
}

body.dark .empty-card .title {
  color: #e5e7eb;
}

body.dark .empty-card .hint {
  color: #9ca3af;
}

body.dark .card {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 6px 18px rgba(0,0,0,0.2);
}

body.dark .meta .name {
  color: #e5e7eb;
}

body.dark .meta .desc {
  color: #9ca3af;
}

body.dark .icon-btn {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .icon-btn:hover {
  background: #334155;
}

body.dark .dropdown {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

body.dark .dropdown-item {
  color: #e5e7eb;
}

body.dark .dropdown-item:hover {
  background: #1f2a44;
  color: #a5b4fc;
}

body.dark .bar-bg {
  background: #1f2a44;
}

body.dark .progress-meta {
  color: #9ca3af;
}

body.dark .secondary {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .secondary:hover {
  background: #334155;
}

body.dark .primary {
  box-shadow: 0 4px 12px rgba(102,126,234,0.4);
}
</style>


