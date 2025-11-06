<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ExportModal from '@/components/ExportModal.vue'
import { useRouter } from 'vue-router'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'
import cloudQuizService from '@/services/cloudQuizService.js'
import { FolderOpen, MoreVertical, Download, Trash2, FileText, Copy } from 'lucide-vue-next'
import ExportService from '@/services/exportService.js'

const router = useRouter()

const isLoading = ref(false)
const error = ref(null)
const notes = ref([])
const openMenuId = ref(null)
const showDeleteModal = ref(false)
const noteToDelete = ref(null)
const showExportModal = ref(false)
const noteToExport = ref(null)

const deleteMessage = computed(() => {
  if (!noteToDelete.value) return 'Are you sure you want to delete this note?'
  return `Are you sure you want to delete "${noteToDelete.value.title || 'Untitled Note'}"? This action cannot be undone.`
})

onMounted(async () => {
  await loadNotes()
  document.addEventListener('click', onOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick)
})

async function loadNotes() {
  try {
    isLoading.value = true
    error.value = null

    if (!(await cloudQuizService.isAuthenticated())) {
      router.push('/login')
      return
    }

    notes.value = await cloudQuizService.getUserSummaries()
  } catch (err) {
    console.error('Error loading notes:', err)
    error.value = err.message || 'Failed to load notes'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

function onOutsideClick() {
  openMenuId.value = null
}

function toggleMenu(note, event) {
  event?.stopPropagation?.()
  openMenuId.value = openMenuId.value === note.id ? null : note.id
}

function openDownloadModal(note) {
  noteToExport.value = note
  showExportModal.value = true
  openMenuId.value = null
}

function closeExportModal() {
  showExportModal.value = false
  noteToExport.value = null
}

function getFileIcon(fileType) {
  switch (fileType?.toLowerCase()) {
    case 'pdf':
      return '📕'
    case 'docx':
    case 'doc':
      return '📘'
    case 'txt':
      return '📄'
    default:
      return '📄'
  }
}

function formatFileSize(bytes) {
  return cloudQuizService.formatFileSize(bytes)
}

async function downloadAsPDF(note) {
  try {
    await ExportService.exportToPDF(note, note.title || 'summary')
    window.$toast?.success('Downloaded PDF')
  } catch (e) {
    window.$toast?.error('Failed to download PDF')
  }
}

async function downloadAsDOCX(note) {
  try {
    await ExportService.exportToDOCX(note, note.title || 'summary')
    window.$toast?.success('Downloaded DOC')
  } catch (e) {
    window.$toast?.error('Failed to download DOC')
  }
}

function downloadAsTXT(note) {
  try {
    ExportService.exportToTXT(note, note.title || 'summary')
    window.$toast?.success('Downloaded TXT')
  } catch (e) {
    window.$toast?.error('Failed to download TXT')
  }
}

function copyNote(note) {
  const content = generateSummaryContent(note)
  navigator.clipboard.writeText(content).then(() => {
    window.$toast?.success('Copied to clipboard')
  }).catch(() => {
    window.$toast?.error('Failed to copy')
  })
}

function generateSummaryContent(summary) {
  if (!summary) return ''
  let content = ''
  if (summary.title) content += `# ${summary.title}\n\n`
  if (summary.description) content += `${summary.description}\n\n`
  if (summary.keyPoints?.length) {
    content += '## Key Points\n\n'
    summary.keyPoints.forEach((p, i) => { content += `${i + 1}. ${p}\n` })
    content += '\n'
  }
  if (summary.sections?.length) {
    summary.sections.forEach(s => {
      content += `## ${s.title}\n\n`
      if (s.content) content += `${s.content}\n\n`
      if (s.subpoints?.length) {
        s.subpoints.forEach(sp => { content += `• ${sp}\n` })
        content += '\n'
      }
    })
  }
  if (summary.conclusions?.length) {
    content += '## Key Takeaways\n\n'
    summary.conclusions.forEach((c, i) => { content += `${i + 1}. ${c}\n` })
  }
  return content
}

function requestDelete(note) {
  noteToDelete.value = note
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!noteToDelete.value) return
  try {
    await cloudQuizService.deleteSummary(noteToDelete.value.id)
    window.$toast?.success('Note deleted')
    await loadNotes()
  } catch (e) {
    window.$toast?.error('Failed to delete note')
  } finally {
    showDeleteModal.value = false
    noteToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteModal.value = false
  noteToDelete.value = null
}
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <h1>My Notes</h1>
        <p class="subtitle">All summaries generated from your files.</p>
      </div>

      <div v-if="isLoading" class="loading">
        <BeatLoader :loading="true" text="Loading your notes..." color="#667eea" size="20px" />
      </div>

      <div v-else-if="error" class="error">
        <div class="error-card">
          <div class="icon">
            <FolderOpen :size="48" />
          </div>
          <div class="title">Failed to load notes</div>
          <div class="hint">{{ error }}</div>
          <button class="primary" @click="loadNotes">Try Again</button>
        </div>
      </div>

      <div v-else-if="notes.length === 0" class="empty">
        <div class="empty-card">
          <div class="icon">
            <FolderOpen :size="48" />
          </div>
          <div class="title">No notes yet</div>
          <div class="hint">Generate a summary from the Upload page.</div>
          <button class="primary" @click="() => router.push('/upload')">
            Generate a Summary
          </button>
        </div>
      </div>

      <div v-else class="grid">
        <div v-for="note in notes" :key="note.id" class="card">
          <div class="row">
            <div class="meta">
              <div class="name">{{ note.title || 'Untitled Note' }}</div>
              <div class="desc">{{ note.description }}</div>
            </div>
            <div class="menu">
              <button class="icon-btn" title="More" @click="(e) => toggleMenu(note, e)">
                <MoreVertical :size="16" />
              </button>
              <div class="dropdown" v-if="openMenuId === note.id">
                <button class="dropdown-item" @click="() => openDownloadModal(note)">
                  <Download :size="16" />
                  Download
                </button>
                <button class="dropdown-item" @click="() => copyNote(note)">
                  <Copy :size="16" />
                  Copy
                </button>
                <button class="dropdown-item danger" @click="() => requestDelete(note)">
                  <Trash2 :size="16" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div v-if="note.sourceFile && note.sourceFile.name" class="file-info">
            <div class="file-icon">{{ getFileIcon(note.sourceFile.type) }}</div>
            <div class="file-details">
              <div class="file-name">{{ note.sourceFile.name }}</div>
              <div class="file-meta">
                {{ note.sourceFile.type?.toUpperCase() || 'FILE' }} •
                {{ formatFileSize(note.sourceFile.size) }}
              </div>
            </div>
          </div>
          <div v-else class="file-info placeholder" aria-hidden="true"></div>

          <div class="summary-stats">
            <span>Key Points: {{ note.keyPoints?.length || 0 }}</span>
            <span>Sections: {{ note.sections?.length || 0 }}</span>
            <span>Takeaways: {{ note.conclusions?.length || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete Note"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <ExportModal
      :visible="showExportModal"
      :summary="noteToExport"
      title="Download Summary"
      message="Choose a format and download your summary."
      @close="closeExportModal"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  max-height: 100vh;
}

.content {
  flex: 1;
  max-width: none;
  margin-left: 40px;
}

@media (max-width: 1024px) {
  .content {
    padding-bottom: 120px;
  }
}

.header h1 {
  margin: 0 0 6px;
}
.subtitle {
  color: #6b7280;
  margin: 0 0 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #6b7280;
}

.empty,
.error {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.empty-card,
.error-card {
  text-align: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
  width: 520px;
}
.empty-card .icon,
.error-card .icon {
  color: #9ca3af;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}
.empty-card .title,
.error-card .title {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
}
.empty-card .hint,
.error-card .hint {
  color: #6b7280;
  margin-bottom: 16px;
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
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  flex: 0 0 320px;
  min-width: 320px;
}

.row {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  min-height: 68px;
}
.meta .name {
  font-weight: 700;
  color: #111827;
}
.meta .desc {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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
.icon-btn:hover { background: #e5e7eb; transform: scale(1.05); }
.dropdown {
  position: absolute;
  right: 0;
  margin-top: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  min-width: 140px;
  z-index: 10;
}
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

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 12px 0;
  min-height: 56px;
}
.file-info.placeholder { visibility: hidden; }
.file-icon { font-size: 20px; flex-shrink: 0; }
.file-details { flex: 1; min-width: 0; }
.file-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-meta { color: #6b7280; font-size: 11px; margin-top: 2px; }

.summary-stats { display: flex; justify-content: space-between; color: #6b7280; font-size: 12px; margin-top: 8px; }

@media (max-width: 768px) {
  .content {
    padding: 16px;
    padding-bottom: 100px;
  }

  .header h1 { font-size: 24px; }
  .subtitle { font-size: 14px; }

  .grid { grid-template-columns: 1fr; gap: 12px; }

  .card { flex: 1 1 100%; min-width: auto; padding: 16px; }
}

@media (max-width: 480px) {
  .content {
    padding: 12px;
    padding-bottom: 80px;
  }

  .header h1 { font-size: 20px; }
  .card { padding: 12px; }
  .file-info { flex-direction: column; align-items: flex-start; gap: 8px; }
  .file-details { width: 100%; }
  .dropdown { right: -10px; min-width: 120px; }
}

/* Dark mode variants */
body.dark .content { color: #e5e7eb; }
body.dark .subtitle { color: #9ca3af; }
body.dark .empty-card { background: #0f172a; border-color: #1f2a44; }
body.dark .empty-card .title { color: #e5e7eb; }
body.dark .empty-card .hint { color: #9ca3af; }
body.dark .card { background: #0f172a; border-color: #1f2a44; box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
body.dark .meta .name { color: #e5e7eb; }
body.dark .meta .desc { color: #9ca3af; }
body.dark .icon-btn { background: #1f2a44; border-color: #334155; color: #e5e7eb; }
body.dark .icon-btn:hover { background: #334155; }
body.dark .dropdown { background: #0f172a; border-color: #1f2a44; box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
body.dark .dropdown-item { color: #e5e7eb; }
body.dark .dropdown-item:hover { background: #1f2a44; color: #a5b4fc; }
</style>