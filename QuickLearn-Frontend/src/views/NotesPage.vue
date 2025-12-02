<script setup>
import { ref, onMounted, computed } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ExportModal from '@/components/ExportModal.vue'
import { useRouter } from 'vue-router'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'
import cloudQuizService from '@/services/cloudQuizService.js'
import { FolderOpen, Download, Trash2, FileText, Copy, Plus, MoreVertical, Edit, Pencil } from 'lucide-vue-next'
import ExportService from '@/services/exportService.js'
import { onBeforeUnmount } from 'vue'

const router = useRouter()
const { confirmDialog } = useConfirmDialog()

const isLoading = ref(false)
const error = ref(null)
const notes = ref([])
const flashcards = ref([])
const filterType = ref('all')
const filterKeys = ['all', 'summary', 'flashcards']
const showExportModal = ref(false)
const noteToExport = ref(null)
const openDropdownId = ref(null)


onMounted(async () => {
  await loadNotes()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function loadNotes() {
  try {
    isLoading.value = true
    error.value = null

    if (!(await cloudQuizService.isAuthenticated())) {
      router.push('/login')
      return
    }

    const [summaries, cards] = await Promise.all([
      cloudQuizService.getUserSummaries(),
      cloudQuizService.getUserFlashcards()
    ])
    notes.value = summaries || []
    flashcards.value = cards || []
  } catch (err) {
    console.error('Error loading notes:', err)
    error.value = err.message || 'Failed to load notes'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
}

const filteredItems = computed(() => {
  if (filterType.value === 'summary') return { summaries: notes.value, flashcards: [] }
  if (filterType.value === 'flashcards') return { summaries: [], flashcards: flashcards.value }
  return { summaries: notes.value, flashcards: flashcards.value }
})

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

function formatDate(dateString) {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function getFileTypeClass(type) {
  const t = type?.toLowerCase()
  if (t === 'pdf') return 'file-icon--red'
  if (t === 'docx' || t === 'doc') return 'file-icon--blue'
  return 'file-icon--gray'
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





function toggleDropdown(itemId) {
  openDropdownId.value = openDropdownId.value === itemId ? null : itemId
}

function closeDropdown() {
  openDropdownId.value = null
}

function isDropdownOpen(itemId) {
  return openDropdownId.value === itemId
}

function handleEditSummary(note) {
  openDownloadModal(note)
  closeDropdown()
}

async function handleDeleteSummary(note) {
  closeDropdown()

  const title = note?.title || 'Untitled summary'
  const result = await confirmDialog({
    title: 'Delete summary',
    message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
    confirmText: 'Delete',
    icon: 'warning'
  })

  if (!result?.isConfirmed) {
    return
  }

  try {
    await cloudQuizService.deleteSummary(note.id)
    window.$toast?.success('Summary deleted')
    await loadNotes()
  } catch (e) {
    window.$toast?.error('Failed to delete summary')
  }
}

function handleExportSummary(note) {
  openDownloadModal(note)
  closeDropdown()
}

function handleCopySummary(note) {
  copyNote(note)
  closeDropdown()
}

function handleEditFlashcard(flashcard) {
  router.push(`/flashcards/${flashcard.id}`)
  closeDropdown()
}

async function handleDeleteFlashcard(flashcard) {
  closeDropdown()

  const title = flashcard?.title || 'Untitled flashcard'
  const result = await confirmDialog({
    title: 'Delete flashcard',
    message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
    confirmText: 'Delete',
    icon: 'warning'
  })

  if (!result?.isConfirmed) {
    return
  }

  try {
    await cloudQuizService.deleteFlashcard(flashcard.id)
    window.$toast?.success('Flashcard deleted')
    await loadNotes()
  } catch (e) {
    window.$toast?.error('Failed to delete flashcard')
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
  if (!event.target.closest('.dropdown-wrapper') && !event.target.closest('.dropdown-trigger')) {
    closeDropdown()
  }
}

function focusTab(tab) {
  const el = document.getElementById(`notes-filter-tab-${tab}`)
  el?.focus()
}

function handleTabKeydown(event, tab) {
  const index = filterKeys.indexOf(tab)
  if (index === -1) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    const nextTab = filterKeys[(index + 1) % filterKeys.length]
    filterType.value = nextTab
    focusTab(nextTab)
    event.preventDefault()
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    const prevTab = filterKeys[(index - 1 + filterKeys.length) % filterKeys.length]
    filterType.value = prevTab
    focusTab(prevTab)
    event.preventDefault()
  }
}
</script>

<template>
  <AppShell
    title="My notes"
    subtitle="All summaries generated from your uploads. Export, copy, or revisit them anytime."
    content-width="wide"
  >
    <div class="page-toolbar">
      <div class="tab-group" role="tablist" aria-label="Note filters">
        <button
          id="notes-filter-tab-all"
          class="tab"
          :class="{ 'tab--active': filterType === 'all' }"
          type="button"
          role="tab"
          :aria-selected="filterType === 'all'"
          :tabindex="filterType === 'all' ? 0 : -1"
          aria-controls="notes-panel"
          @click="filterType = 'all'"
          @keydown="handleTabKeydown($event, 'all')"
        >
          All
        </button>
        <button
          id="notes-filter-tab-summary"
          class="tab"
          :class="{ 'tab--active': filterType === 'summary' }"
          type="button"
          role="tab"
          :aria-selected="filterType === 'summary'"
          :tabindex="filterType === 'summary' ? 0 : -1"
          aria-controls="notes-panel"
          @click="filterType = 'summary'"
          @keydown="handleTabKeydown($event, 'summary')"
        >
          Summaries
        </button>
        <button
          id="notes-filter-tab-flashcards"
          class="tab"
          :class="{ 'tab--active': filterType === 'flashcards' }"
          type="button"
          role="tab"
          :aria-selected="filterType === 'flashcards'"
          :tabindex="filterType === 'flashcards' ? 0 : -1"
          aria-controls="notes-panel"
          @click="filterType = 'flashcards'"
          @keydown="handleTabKeydown($event, 'flashcards')"
        >
          Flashcards
        </button>
      </div>
      <div class="page-toolbar__actions">
        <BaseButton variant="primary" size="sm" @click="router.push('/upload')">
          <Plus :size="16" />
          Generate
        </BaseButton>
      </div>
    </div>

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
      <div v-if="filteredItems.summaries.length === 0 && filteredItems.flashcards.length === 0" class="empty-state">
        <BaseCard padding="lg">
          <div class="empty-card">
            <FolderOpen :size="48" />
            <h3>Nothing here yet</h3>
            <p>Generate a summary or flashcards from the Upload page to see it here.</p>
            <BaseButton variant="primary" @click="router.push('/upload')">
              <Plus :size="16" />
              Generate
            </BaseButton>
          </div>
        </BaseCard>
      </div>

        <section
          v-if="filteredItems.summaries.length"
          class="library-section"
        >
          <header class="library-section__header">
            <h2>Summaries</h2>
            <span class="library-section__count">{{ filteredItems.summaries.length }} total</span>
          </header>
          <div class="library-grid">
            <BaseCard v-for="note in filteredItems.summaries" :key="note.id" class="styled-card" :padding="'none'">
              <div class="card-content">
                <!-- Header: File Info & Actions -->
                <div class="card-header">
                  <div class="file-info">
                    <div class="file-icon" :class="getFileTypeClass(note.sourceFile?.type)">
                      <FileText v-if="!note.sourceFile?.type" :size="24" />
                      <span v-else class="file-type-text">{{ note.sourceFile.type.toUpperCase() }}</span>
                    </div>
                    <div class="file-meta">
                      <div class="file-meta-top">
                        <span class="file-type">{{ note.sourceFile?.type?.toUpperCase() || 'FILE' }}</span>
                        <span class="dot">•</span>
                        <span class="file-size">{{ formatFileSize(note.sourceFile?.size) }}</span>
                      </div>
                      <div class="file-date">{{ formatDate(note.createdAt) }}</div>
                    </div>
                  </div>
                  
                  <div class="dropdown-wrapper">
                    <button
                      class="dropdown-trigger"
                      :aria-label="'More actions for ' + (note.title || 'Untitled summary')"
                      @click.stop="toggleDropdown(`summary-${note.id}`)"
                    >
                      <MoreVertical :size="20" />
                    </button>
                    <div
                      v-if="isDropdownOpen(`summary-${note.id}`)"
                      class="dropdown-menu"
                      @click.stop
                    >
                      <button class="dropdown-item" @click="handleExportSummary(note)">
                        <Download :size="16" />
                        Export
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteSummary(note)">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Body: Title & Description -->
                <div class="card-body">
                  <h3 class="card-title" :title="note.title">{{ note.title || 'Untitled note' }}</h3>
                  <p class="card-description">
                    {{ note.description || 'Summary created by QuickLearn' }}
                  </p>
                  
                  <!-- Optional: Tags (Mocked for now as data structure doesn't show tags explicitly, 
                       but layout supports it if we add them later) -->
                  <div class="card-tags" v-if="note.tags && note.tags.length">
                    <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>

                <!-- Footer: Stats -->
                <div class="card-footer">
                  <div class="stat-block">
                    <span class="stat-value">{{ note.keyPoints?.length || 0 }}</span>
                    <span class="stat-label">POINTS</span>
                  </div>
                  <div class="stat-block">
                    <span class="stat-value">{{ note.sections?.length || 0 }}</span>
                    <span class="stat-label">SECTIONS</span>
                  </div>
                  <div class="stat-block">
                    <span class="stat-value">{{ note.conclusions?.length || 0 }}</span>
                    <span class="stat-label">INSIGHTS</span>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>

        <section
          v-if="filteredItems.flashcards.length"
          class="library-section"
        >
          <header class="library-section__header">
            <h2>Flashcards</h2>
            <span class="library-section__count">{{ filteredItems.flashcards.length }} total</span>
          </header>
          <div class="library-grid">
            <BaseCard v-for="fc in filteredItems.flashcards" :key="fc.id" class="styled-card" :padding="'none'">
              <div class="card-content">
                <!-- Header: File Info & Actions -->
                <div class="card-header">
                  <div class="file-info">
                    <div class="file-icon file-icon--blue">
                      <span class="file-type-text">FC</span>
                    </div>
                    <div class="file-meta">
                      <div class="file-meta-top">
                        <span class="file-type">FLASHCARDS</span>
                        <span class="dot">•</span>
                        <span class="file-size">{{ formatFileSize(fc.sourceFile?.size) }}</span>
                      </div>
                      <div class="file-date">{{ formatDate(fc.createdAt) }}</div>
                    </div>
                  </div>

                  <div class="dropdown-wrapper">
                    <button
                      class="dropdown-trigger"
                      :aria-label="'More actions for ' + (fc.title || 'Untitled flashcards')"
                      @click.stop="toggleDropdown(`flashcard-${fc.id}`)"
                    >
                      <MoreVertical :size="20" />
                    </button>
                    <div
                      v-if="isDropdownOpen(`flashcard-${fc.id}`)"
                      class="dropdown-menu"
                      @click.stop
                    >
                      <button class="dropdown-item" @click="handleEditFlashcard(fc)">
                        <Pencil :size="16" />
                        Edit
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteFlashcard(fc)">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Body: Title & Description -->
                <div class="card-body">
                  <h3 class="card-title" :title="fc.title">{{ fc.title || 'Flashcards' }}</h3>
                  <p class="card-description">
                    {{ fc.description || 'Flashcards generated by QuickLearn' }}
                  </p>
                </div>

                <!-- Footer: Stats & Action -->
                <div class="card-footer card-footer--single">
                  <div class="stat-block">
                    <span class="stat-value">{{ fc.cardsCount || 0 }}</span>
                    <span class="stat-label">CARDS</span>
                  </div>
                  <BaseButton 
                    variant="primary" 
                    size="sm" 
                    class="study-btn"
                    @click="router.push(`/flashcards/${fc.id}/study`)"
                  >
                    Study Now
                  </BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>
    </div>

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
/* New Card Styles */
.styled-card {
  height: 100%;
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

/* Force BaseCard body to fill height so footer pushes to bottom */
.styled-card :deep(.base-card__body) {
  flex: 1;
  height: 100%;
}

.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-header {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

.file-info {
  display: flex;
  gap: var(--space-3);
}

.file-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}

.file-icon--red {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.file-icon--blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.file-icon--gray {
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}

.file-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.file-meta-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dot {
  color: var(--color-border-strong);
}

.file-date {
  font-size: 12px;
  color: var(--color-text-soft);
}

.card-body {
  padding: 0 var(--space-4);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
}

.tag {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--color-surface-subtle);
  border-radius: var(--radius-pill);
  color: var(--color-text-muted);
  font-weight: 500;
}

.card-footer {
  margin-top: auto;
  padding: var(--space-4);
  background: transparent;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.card-footer--single {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0;
}

.card-footer--single .stat-block {
  min-width: 100px;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-1);
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.study-btn {
  font-size: 12px;
  padding: 6px 16px;
}

/* Dark mode adjustments */
body.dark .styled-card {
  background: var(--color-surface);
  border-color: var(--color-border);
}

body.dark .card-footer {
  background: rgba(0, 0, 0, 0.1);
  border-color: var(--color-border);
}

body.dark .file-icon--red {
  background: rgba(239, 68, 68, 0.2);
}

body.dark .file-icon--blue {
  background: rgba(59, 130, 246, 0.2);
}

body.dark .tag {
  background: rgba(255, 255, 255, 0.05);
}

/* Dropdown styles override for this card context if needed */
.dropdown-trigger {
  opacity: 0.6;
}
.dropdown-trigger:hover {
  opacity: 1;
  background: var(--color-surface-subtle);
}

/* Keep existing toolbar styles */
.page-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.page-toolbar__actions {
  display: flex;
  gap: var(--space-2);
}

.tab-group {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
}

.tab {
  border: none;
  background: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.tab:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.45);
  outline-offset: 2px;
}

.tab--active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

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

.library-section {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.library-section__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.library-section__header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.library-section__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
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

.dropdown-wrapper {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.dropdown-trigger:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.dropdown-trigger:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.45);
  outline-offset: 2px;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  min-width: 180px;
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border: none;
  background: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: left;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-base);
}

.dropdown-item:hover {
  background: var(--color-surface-subtle);
}

.dropdown-item:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.45);
  outline-offset: -2px;
}

.dropdown-item--danger {
  color: var(--color-danger);
}

.dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

body.dark .tab-group {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .tab {
  color: var(--color-text-muted);
}

body.dark .tab--active {
  background: var(--color-surface);
  color: var(--color-primary);
}

</style>
