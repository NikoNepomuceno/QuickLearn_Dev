<script setup>
import { ref, onMounted, computed } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ExportModal from '@/components/ExportModal.vue'
import { useRouter } from 'vue-router'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'
import cloudQuizService from '@/services/cloudQuizService.js'
import { FolderOpen, Download, Trash2, FileText, Copy, Plus } from 'lucide-vue-next'
import ExportService from '@/services/exportService.js'

const router = useRouter()

const isLoading = ref(false)
const error = ref(null)
const notes = ref([])
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

function openDownloadModal(note) {
  noteToExport.value = note
  showExportModal.value = true
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
  <AppShell
    title="My notes"
    subtitle="All summaries generated from your uploads. Export, copy, or revisit them anytime."
    content-width="wide"
  >
    <template #header-actions>
      <BaseButton variant="primary" size="sm" @click="router.push('/upload')">
        <Plus :size="16" />
        Generate summary
      </BaseButton>
    </template>

    <div v-if="isLoading" class="loading-state">
      <BeatLoader :loading="true" text="Loading your notes..." color="#667eea" size="20px" />
    </div>

    <div v-else-if="error" class="error-state">
      <BaseCard padding="lg">
        <div class="empty-card">
          <FolderOpen :size="40" />
          <h3>Failed to load notes</h3>
          <p>{{ error }}</p>
          <BaseButton variant="primary" size="sm" @click="loadNotes">
            Try again
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <div v-else>
      <div v-if="notes.length === 0" class="empty-state">
        <BaseCard padding="lg">
          <div class="empty-card">
            <FolderOpen :size="48" />
            <h3>No notes yet</h3>
            <p>Generate a summary from the Upload page to see it here.</p>
            <BaseButton variant="primary" @click="router.push('/upload')">
              <Plus :size="16" />
              Generate a summary
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <div v-else class="library-grid">
        <BaseCard v-for="note in notes" :key="note.id" padding="lg">
          <div class="note-card">
            <div class="note-card__header">
              <div class="note-card__meta">
                <FileText :size="20" />
                <div>
                  <h3>{{ note.title || 'Untitled note' }}</h3>
                  <p class="note-card__subtitle">
                    {{ note.description || 'Summary created by QuickLearn' }}
                  </p>
                </div>
              </div>
              <BaseButton variant="danger" size="sm" @click="requestDelete(note)">
                <Trash2 :size="16" />
                Delete
              </BaseButton>
            </div>

            <div class="note-card__details" v-if="note.sourceFile && note.sourceFile.name">
              <span>{{ note.sourceFile.name }}</span>
              <span>•</span>
              <span>{{ note.sourceFile.type?.toUpperCase() || 'FILE' }}</span>
              <span>•</span>
              <span>{{ formatFileSize(note.sourceFile.size) }}</span>
            </div>

            <div class="note-card__stats">
              <div class="stat-chip">Key points: {{ note.keyPoints?.length || 0 }}</div>
              <div class="stat-chip">Sections: {{ note.sections?.length || 0 }}</div>
              <div class="stat-chip">Takeaways: {{ note.conclusions?.length || 0 }}</div>
            </div>

            <div class="note-card__actions">
              <BaseButton variant="secondary" size="sm" @click="() => openDownloadModal(note)">
                <Download :size="16" />
                Export
              </BaseButton>
              <BaseButton variant="outline" size="sm" @click="() => copyNote(note)">
                <Copy :size="16" />
                Copy to clipboard
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete note"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <ExportModal
      :visible="showExportModal"
      :summary="noteToExport"
      title="Download summary"
      message="Choose a format and download your summary."
      @close="closeExportModal"
    />
  </AppShell>
</template>

<style scoped>
.loading-state,
.error-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: var(--space-6);
}

.empty-card {
  display: grid;
  gap: var(--space-3);
  justify-items: center;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-card h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--color-text);
}

.library-grid {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 900px) {
  .library-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

.note-card {
  display: grid;
  gap: var(--space-4);
}

.note-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.note-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.note-card__meta h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.note-card__subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.note-card__details {
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
  flex-wrap: wrap;
}

.note-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface-subtle);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.note-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

body.dark .note-card__details {
  color: var(--color-text-muted);
}

body.dark .stat-chip {
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}
</style>
