<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import BeatLoader from '@/components/BeatLoader.vue'
import { downloadQuizAsPDF } from '@/services/quizService'
import cloudQuizService from '@/services/cloudQuizService'
import { useRouter } from 'vue-router'
import { formatUpdatedAt } from '@/utils/format'
import {
  FolderOpen,
  Plus,
  Share2,
  Download,
  Play,
  BarChart3,
  FileText,
  Trash2,
  Target,
  MoreVertical,
} from 'lucide-vue-next'

const router = useRouter()
const quizzes = ref([])
const adaptiveSessions = ref([])
const isLoading = ref(false)
const error = ref(null)
const showDeleteModal = ref(false)
const quizToDelete = ref(null)
const activeTab = ref('all')
const tabKeys = ['all', 'quicklearn', 'custom', 'adaptive']
const openDropdownId = ref(null)

const deleteMessage = computed(() => {
  if (!quizToDelete.value) {
    return 'Are you sure you want to delete this quiz? This action cannot be undone.'
  }
  return `Are you sure you want to delete "${quizToDelete.value.title || 'Untitled Quiz'}"? This action cannot be undone.`
})

onMounted(async () => {
  await loadQuizzes()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(event) {
  const dropdown = event.target.closest('.dropdown-wrapper')
  if (!dropdown) {
    closeDropdown()
  }
}

// Separate quizzes into QuickLearn and Custom
const quickLearnQuizzes = computed(() => {
  return quizzes.value.filter(quiz => !quiz.metadata?.isCustomQuiz)
})

const customQuizzes = computed(() => {
  return quizzes.value.filter(quiz => quiz.metadata?.isCustomQuiz === true)
})

const filteredQuizzes = computed(() => {
  if (activeTab.value === 'adaptive' || activeTab.value === 'custom') return []
  if (activeTab.value === 'quicklearn') return quickLearnQuizzes.value
  return quickLearnQuizzes.value // 'all' shows QuickLearn quizzes first
})

const filteredCustomQuizzes = computed(() => {
  if (activeTab.value === 'quicklearn' || activeTab.value === 'adaptive') return []
  if (activeTab.value === 'custom') return customQuizzes.value
  return customQuizzes.value // 'all' shows custom quizzes
})

const filteredAdaptiveSessions = computed(() => {
  if (activeTab.value === 'quicklearn' || activeTab.value === 'custom') return []
  if (activeTab.value === 'adaptive') return adaptiveSessions.value
  return adaptiveSessions.value // 'all' shows adaptive sessions
})

const hasAnyContent = computed(() => {
  return quizzes.value.length > 0 || adaptiveSessions.value.length > 0
})

function focusTab(tab) {
  const el = document.getElementById(`my-quizzes-tab-${tab}`)
  el?.focus()
}

function handleTabKeydown(event, tab) {
  const index = tabKeys.indexOf(tab)
  if (index === -1) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    const nextTab = tabKeys[(index + 1) % tabKeys.length]
    activeTab.value = nextTab
    focusTab(nextTab)
    event.preventDefault()
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    const prevTab = tabKeys[(index - 1 + tabKeys.length) % tabKeys.length]
    activeTab.value = prevTab
    focusTab(prevTab)
    event.preventDefault()
  }
}

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

    // Load both regular quizzes and adaptive sessions
    // Handle errors separately to show actual error messages
    let regularQuizzes = []
    let sessions = []

    try {
      regularQuizzes = await cloudQuizService.getUserQuizzes()
    } catch (err) {
      console.error('Failed to load quizzes:', err)
      const errorMsg = err.message || 'Unknown error'
      error.value = `Failed to load quizzes: ${errorMsg}`
      window.$toast?.error(error.value)
      // Still set empty array so UI doesn't break, but error is shown
      regularQuizzes = []
    }

    try {
      sessions = await cloudQuizService.getUserAdaptiveSessions()
    } catch (err) {
      console.error('Failed to load adaptive sessions:', err)
      // Only show error if we don't already have one for quizzes
      if (!error.value) {
        const errorMsg = err.message || 'Unknown error'
        error.value = `Failed to load adaptive sessions: ${errorMsg}`
        window.$toast?.error(error.value)
      }
      sessions = []
    }

    quizzes.value = regularQuizzes
    adaptiveSessions.value = sessions
  } catch (err) {
    console.error('Error loading quizzes:', err)
    error.value = err.message || 'Failed to load quizzes'
    window.$toast?.error(error.value)
  } finally {
    isLoading.value = false
  }
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

function openAdaptiveSession(session) {
  if (session.status === 'completed') {
    router.push(`/adaptive/${session.id}/summary`)
  } else {
    router.push(`/adaptive/${session.id}`)
  }
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

function showDeleteConfirmation(quiz) {
  quizToDelete.value = quiz
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!quizToDelete.value) return

  try {
    await cloudQuizService.deleteQuiz(quizToDelete.value.id)
    window.$toast?.success('Moved to Trash. Items are auto-deleted after 30 days.')
    await loadQuizzes() // Reload the list
  } catch (err) {
    console.error('Error deleting quiz:', err)
    window.$toast?.error('Failed to delete quiz')
  } finally {
    showDeleteModal.value = false
    quizToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteModal.value = false
  quizToDelete.value = null
}

function formatFileSize(bytes) {
  return cloudQuizService.formatFileSize(bytes)
}

function getFileIcon(fileType) {
  switch (fileType?.toLowerCase()) {
    case 'pdf':
      return '📕'
    case 'docx':
      return '📘'
    case 'doc':
      return '📘'
    case 'txt':
      return '📄'
    default:
      return '📄'
  }
}

function toggleDropdown(quizId) {
  openDropdownId.value = openDropdownId.value === quizId ? null : quizId
}

function closeDropdown() {
  openDropdownId.value = null
}

function isDropdownOpen(quizId) {
  return openDropdownId.value === quizId
}

function viewResults(quiz) {
  router.push({ name: 'quiz-results', params: { quizId: quiz.id } })
}
</script>

<template>
  <AppShell
    title="My quizzes"
    subtitle="Review your generated quizzes, track attempts, and share them with learners."
    content-width="wide"
  >
    <div class="page-toolbar">
      <div class="page-toolbar__actions">
        <BaseButton variant="primary" size="sm" @click="router.push('/upload')">
          <Plus :size="16" />
          New quiz
        </BaseButton>
      </div>
      <div class="tab-group" role="tablist" aria-label="Quiz filters">
        <button
          id="my-quizzes-tab-all"
          class="tab"
          :class="{ 'tab--active': activeTab === 'all' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'all'"
          :tabindex="activeTab === 'all' ? 0 : -1"
          aria-controls="my-quizzes-panel-quicklearn my-quizzes-panel-custom my-quizzes-panel-adaptive"
          @click="activeTab = 'all'"
          @keydown="handleTabKeydown($event, 'all')"
        >
          All
        </button>
        <button
          id="my-quizzes-tab-quicklearn"
          class="tab"
          :class="{ 'tab--active': activeTab === 'quicklearn' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'quicklearn'"
          :tabindex="activeTab === 'quicklearn' ? 0 : -1"
          aria-controls="my-quizzes-panel-quicklearn"
          @click="activeTab = 'quicklearn'"
          @keydown="handleTabKeydown($event, 'quicklearn')"
        >
          QuickLearn
        </button>
        <button
          id="my-quizzes-tab-custom"
          class="tab"
          :class="{ 'tab--active': activeTab === 'custom' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'custom'"
          :tabindex="activeTab === 'custom' ? 0 : -1"
          aria-controls="my-quizzes-panel-custom"
          @click="activeTab = 'custom'"
          @keydown="handleTabKeydown($event, 'custom')"
        >
          Custom Quizzes
        </button>
        <button
          id="my-quizzes-tab-adaptive"
          class="tab"
          :class="{ 'tab--active': activeTab === 'adaptive' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'adaptive'"
          :tabindex="activeTab === 'adaptive' ? 0 : -1"
          aria-controls="my-quizzes-panel-adaptive"
          @click="activeTab = 'adaptive'"
          @keydown="handleTabKeydown($event, 'adaptive')"
        >
          Adaptive
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <BeatLoader :loading="true" text="Loading your quizzes..." color="#667eea" size="20px" />
    </div>

    <div v-else-if="error" class="error-state">
      <BaseCard padding="lg">
        <div class="empty-card">
          <FolderOpen :size="40" />
          <h3>Failed to load quizzes</h3>
          <p>{{ error }}</p>
          <BaseButton variant="primary" size="sm" @click="loadQuizzes">
            Try again
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <div v-else>
      <div v-if="!hasAnyContent" class="empty-state">
        <BaseCard padding="lg">
          <div class="empty-card">
            <FolderOpen :size="48" />
            <h3>No quizzes yet</h3>
            <p>Create your first quiz by uploading a document.</p>
            <BaseButton variant="primary" @click="router.push('/upload')">
              <Plus :size="16" />
              Create a quiz
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <template v-else>
        <section
          v-if="filteredQuizzes.length"
          id="my-quizzes-panel-quicklearn"
          class="library-section"
          role="tabpanel"
          :hidden="activeTab === 'adaptive' || activeTab === 'custom'"
          aria-labelledby="my-quizzes-tab-quicklearn my-quizzes-tab-all"
          tabindex="0"
        >
          <header class="library-section__header">
            <h2>QuickLearn quizzes</h2>
            <span class="library-section__count">{{ filteredQuizzes.length }} total</span>
          </header>
          <div class="library-grid">
            <BaseCard
              v-for="quiz in filteredQuizzes"
              :key="quiz.id"
              padding="lg"
            >
              <div class="quiz-card">
                <div class="quiz-card__header">
                  <div class="quiz-card__meta">
                    <FileText :size="20" />
                    <div>
                      <h3>{{ quiz.title || 'Untitled quiz' }}</h3>
                      <p class="quiz-card__subtitle">
                        {{ formatUpdatedAt(quiz.updatedAt || quiz.createdAt) }}
                      </p>
                    </div>
                  </div>
                  <div class="dropdown-wrapper">
                    <button 
                      class="dropdown-trigger"
                      :aria-label="'More actions for ' + (quiz.title || 'Untitled quiz')"
                      @click="toggleDropdown(quiz.id)"
                    >
                      <MoreVertical :size="20" />
                    </button>
                    <div 
                      v-if="isDropdownOpen(quiz.id)" 
                      class="dropdown-menu"
                      @click.stop
                    >
                      <button class="dropdown-item" @click="shareQuiz(quiz); closeDropdown()">
                        <Share2 :size="16" />
                        Share
                      </button>
                      <button class="dropdown-item" @click="downloadQuiz(quiz); closeDropdown()">
                        <Download :size="16" />
                        Download PDF
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="showDeleteConfirmation(quiz); closeDropdown()">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div class="quiz-card__stats">
                  <div class="stat-chip">
                    <BarChart3 :size="16" />
                    {{ cloudQuizService.getQuizSummary(quiz).attemptsCount }} attempts
                  </div>
                  <div
                    v-if="cloudQuizService.getQuizSummary(quiz).averageScore !== null"
                    class="stat-chip"
                  >
                    <Share2 :size="16" />
                    Avg. score {{ cloudQuizService.getQuizSummary(quiz).averageScore }}%
                  </div>
                  <div class="stat-chip">
                    <Download :size="16" />
                    {{ quiz.questionCount || quiz.questions?.length || 0 }} questions
                  </div>
                </div>

                <div class="quiz-card__actions">
                  <BaseButton variant="primary" size="sm" @click="openQuiz(quiz)">
                    <Play :size="16" />
                    Take quiz
                  </BaseButton>
                  <BaseButton 
                    v-if="cloudQuizService.getQuizSummary(quiz).attemptsCount > 0"
                    variant="secondary" 
                    size="sm" 
                    @click="viewResults(quiz)"
                  >
                    <BarChart3 :size="16" />
                    View Results
                  </BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>

        <section
          v-if="filteredCustomQuizzes.length"
          id="my-quizzes-panel-custom"
          class="library-section"
          role="tabpanel"
          :hidden="activeTab === 'quicklearn' || activeTab === 'adaptive'"
          aria-labelledby="my-quizzes-tab-custom my-quizzes-tab-all"
          tabindex="0"
        >
          <header class="library-section__header">
            <h2>Custom Quizzes</h2>
            <span class="library-section__count">{{ filteredCustomQuizzes.length }} total</span>
          </header>
          <div class="library-grid">
            <BaseCard
              v-for="quiz in filteredCustomQuizzes"
              :key="quiz.id"
              padding="lg"
            >
              <div class="quiz-card">
                <div class="quiz-card__header">
                  <div class="quiz-card__meta">
                    <FileText :size="20" />
                    <div>
                      <h3>{{ quiz.title || 'Untitled quiz' }}</h3>
                      <p class="quiz-card__subtitle">
                        {{ formatUpdatedAt(quiz.updatedAt || quiz.createdAt) }}
                      </p>
                    </div>
                  </div>
                  <div class="dropdown-wrapper">
                    <button 
                      class="dropdown-trigger"
                      :aria-label="'More actions for ' + (quiz.title || 'Untitled quiz')"
                      @click="toggleDropdown(quiz.id)"
                    >
                      <MoreVertical :size="20" />
                    </button>
                    <div 
                      v-if="isDropdownOpen(quiz.id)" 
                      class="dropdown-menu"
                      @click.stop
                    >
                      <button class="dropdown-item" @click="shareQuiz(quiz); closeDropdown()">
                        <Share2 :size="16" />
                        Share
                      </button>
                      <button class="dropdown-item" @click="downloadQuiz(quiz); closeDropdown()">
                        <Download :size="16" />
                        Download PDF
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="showDeleteConfirmation(quiz); closeDropdown()">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div class="quiz-card__stats">
                  <div class="stat-chip">
                    <BarChart3 :size="16" />
                    {{ cloudQuizService.getQuizSummary(quiz).attemptsCount }} attempts
                  </div>
                  <div
                    v-if="cloudQuizService.getQuizSummary(quiz).averageScore !== null"
                    class="stat-chip"
                  >
                    <Share2 :size="16" />
                    Avg. score {{ cloudQuizService.getQuizSummary(quiz).averageScore }}%
                  </div>
                  <div class="stat-chip">
                    <Download :size="16" />
                    {{ quiz.questionCount || quiz.questions?.length || 0 }} questions
                  </div>
                </div>

                <div class="quiz-card__actions">
                  <BaseButton variant="primary" size="sm" @click="openQuiz(quiz)">
                    <Play :size="16" />
                    Take quiz
                  </BaseButton>
                  <BaseButton 
                    v-if="cloudQuizService.getQuizSummary(quiz).attemptsCount > 0"
                    variant="secondary" 
                    size="sm" 
                    @click="viewResults(quiz)"
                  >
                    <BarChart3 :size="16" />
                    View Results
                  </BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>

        <section
          v-if="filteredAdaptiveSessions.length"
          id="my-quizzes-panel-adaptive"
          class="library-section"
          role="tabpanel"
          :hidden="activeTab === 'quicklearn' || activeTab === 'custom'"
          aria-labelledby="my-quizzes-tab-adaptive my-quizzes-tab-all"
          tabindex="0"
        >
          <header class="library-section__header">
            <h2>Adaptive sessions</h2>
            <span class="library-section__count">{{ filteredAdaptiveSessions.length }} active</span>
          </header>
          <div class="library-grid">
            <BaseCard
              v-for="session in filteredAdaptiveSessions"
              :key="session.id"
              padding="lg"
            >
              <div class="quiz-card">
                <div class="quiz-card__header">
                  <div class="quiz-card__meta">
                    <Target :size="20" />
                    <div>
                      <h3>{{ session.title || 'Adaptive session' }}</h3>
                      <p class="quiz-card__subtitle">
                        {{ formatUpdatedAt(session.updatedAt || session.createdAt) }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="quiz-card__stats">
                  <div class="stat-chip">
                    <BarChart3 :size="16" />
                    {{ session.questionsAnswered || 0 }} answered
                  </div>
                  <div class="stat-chip">
                    <Share2 :size="16" />
                    Difficulty {{ session.currentDifficulty || 'N/A' }}
                  </div>
                </div>

                <div class="quiz-card__actions">
                  <BaseButton variant="primary" size="sm" @click="openAdaptiveSession(session)">
                    <Play :size="16" />
                    Resume
                  </BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>
      </template>
    </div>

    <ConfirmModal
      v-model="showDeleteModal"
      title="Delete quiz"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </AppShell>
</template>

<style scoped>
.page-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
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

.quiz-card {
  display: grid;
  gap: var(--space-4);
}

.quiz-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.quiz-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
}

.quiz-card__meta h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.quiz-card__subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.quiz-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface-subtle);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.quiz-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.form-error {
  margin: var(--space-4) 0 0;
  text-align: center;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
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
</style>
