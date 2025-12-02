<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
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
  Timer,
  MoreVertical,
  Info,
} from 'lucide-vue-next'

const router = useRouter()
const { confirmDialog } = useConfirmDialog()
const quizzes = ref([])
const adaptiveSessions = ref([])
const isLoading = ref(false)
const error = ref(null)
const activeTab = ref('all')
const tabKeys = ['all', 'quicklearn', 'custom', 'adaptive']
const openDropdownId = ref(null)
const showDetailsModal = ref(false)
const detailsQuiz = ref(null)
const originalBodyOverflow = ref('')
const detailSummary = computed(() => {
  if (!detailsQuiz.value) {
    return {
      attemptsCount: 0,
      averageScore: null,
    }
  }
  const summary = getQuizSummary(detailsQuiz.value) || {}
  return {
    attemptsCount: summary.attemptsCount ?? 0,
    averageScore: summary.averageScore ?? null,
  }
})

const detailMode = computed(() => {
  if (!detailsQuiz.value) {
    return {
      label: 'Standard',
      details: 'No time limit',
    }
  }
  const mode = getQuizMode(detailsQuiz.value) || {}
  return {
    label: mode.label || 'Standard',
    details: mode.details || (mode.label === 'Timed' ? 'Timer enabled' : 'No time limit'),
  }
})

const detailQuestionCount = computed(() => {
  if (!detailsQuiz.value) return 0
  return detailsQuiz.value.questionCount || detailsQuiz.value.questions?.length || 0
})


onMounted(async () => {
  await loadQuizzes()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  restoreBodyScroll()
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

function getQuizSummary(quiz) {
  return cloudQuizService.getQuizSummary(quiz)
}

function normalizeTimerSeconds(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.max(10, Math.min(300, Math.round(num)))
}

function getQuizMode(quiz) {
  const metadata = quiz?.metadata || {}
  const options = metadata.options || quiz?.options || {}
  const legacy = metadata.timedSettings || metadata.timedMode || {}

  const enabledRaw =
    quiz?.timedModeEnabled ??
    options.timedModeEnabled ??
    legacy.timedModeEnabled ??
    metadata.timedModeEnabled ??
    metadata.timedQuiz

  const secondsRaw =
    quiz?.questionTimerSeconds ??
    options.questionTimerSeconds ??
    legacy.questionTimerSeconds ??
    metadata.questionTimerSeconds

  const enabled = Boolean(enabledRaw)
  const seconds = enabled ? normalizeTimerSeconds(secondsRaw) : null

  return {
    label: enabled ? 'Timed' : 'Standard',
    details: enabled && seconds ? `${seconds}s per question` : null,
  }
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

async function handleDeleteQuiz(quiz) {
  const title = quiz?.title || 'Untitled Quiz'
  const message = `Are you sure you want to delete "${title}"? This action cannot be undone.`
  const result = await confirmDialog({
    title: 'Delete quiz',
    message,
    confirmText: 'Delete',
    icon: 'warning',
    danger: true
  })

  if (!result?.isConfirmed) {
    return
  }

  try {
    await cloudQuizService.deleteQuiz(quiz.id)
    window.$toast?.success('Moved to Trash. Items are auto-deleted after 30 days.')
    await loadQuizzes()
  } catch (err) {
    console.error('Error deleting quiz:', err)
    window.$toast?.error('Failed to delete quiz')
  }
}

async function handleDeleteSession(session) {
  const title = session?.title || 'Adaptive Session'
  const message = `Are you sure you want to delete "${title}"? This action cannot be undone.`
  const result = await confirmDialog({
    title: 'Delete session',
    message,
    confirmText: 'Delete',
    icon: 'warning',
    danger: true
  })

  if (!result?.isConfirmed) return

  try {
    await cloudQuizService.deleteAdaptiveSession(session.id)
    window.$toast?.success('Session deleted')
    await loadQuizzes()
  } catch (err) {
    console.error('Error deleting session:', err)
    window.$toast?.error('Failed to delete session')
  }
}



function formatFileSize(bytes) {
  return cloudQuizService.formatFileSize(bytes)
}

function formatDate(dateString) {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date)
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

function openDetails(quiz) {
  detailsQuiz.value = quiz
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  detailsQuiz.value = null
}

watch(showDetailsModal, isOpen => {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  if (isOpen) {
    originalBodyOverflow.value = body.style.overflow
    body.style.overflow = 'hidden'
  } else {
    restoreBodyScroll()
  }
})

function restoreBodyScroll() {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  body.style.overflow = originalBodyOverflow.value || ''
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
              class="styled-quiz-card"
              :padding="'none'"
            >
              <div class="quiz-card-content">
                <div class="quiz-card-header">
                  <div class="quiz-file-icon">
                    <FileText :size="24" />
                  </div>
                  <div class="quiz-info">
                    <h3 :title="quiz.title">{{ quiz.title || 'Untitled quiz' }}</h3>
                    <p class="quiz-date">
                      {{ formatDate(quiz.updatedAt || quiz.createdAt) }}
                    </p>
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
                      <button class="dropdown-item" @click="openDetails(quiz); closeDropdown()">
                        <Info :size="16" />
                        Details
                      </button>
                      <button class="dropdown-item" @click="shareQuiz(quiz); closeDropdown()">
                        <Share2 :size="16" />
                        Share
                      </button>
                      <button class="dropdown-item" @click="downloadQuiz(quiz); closeDropdown()">
                        <Download :size="16" />
                        Download PDF
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteQuiz(quiz); closeDropdown()">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div class="quiz-card-footer">
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
              class="styled-quiz-card"
              :padding="'none'"
            >
              <div class="quiz-card-content">
                <div class="quiz-card-header">
                  <div class="quiz-file-icon">
                    <FileText :size="24" />
                  </div>
                  <div class="quiz-info">
                    <h3 :title="quiz.title">{{ quiz.title || 'Untitled quiz' }}</h3>
                    <p class="quiz-date">
                      {{ formatDate(quiz.updatedAt || quiz.createdAt) }}
                    </p>
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
                      <button class="dropdown-item" @click="openDetails(quiz); closeDropdown()">
                        <Info :size="16" />
                        Details
                      </button>
                      <button class="dropdown-item" @click="shareQuiz(quiz); closeDropdown()">
                        <Share2 :size="16" />
                        Share
                      </button>
                      <button class="dropdown-item" @click="downloadQuiz(quiz); closeDropdown()">
                        <Download :size="16" />
                        Download PDF
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteQuiz(quiz); closeDropdown()">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div class="quiz-card-footer">
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
              class="styled-quiz-card"
              :padding="'none'"
            >
              <div class="quiz-card-content">
                <div class="quiz-card-header">
                  <div class="quiz-file-icon quiz-file-icon--adaptive">
                    <Target :size="24" />
                  </div>
                  <div class="quiz-info">
                    <h3 :title="session.title">{{ session.title || 'Adaptive session' }}</h3>
                    <p class="quiz-date">
                      {{ formatDate(session.updatedAt || session.createdAt) }}
                    </p>
                  </div>
                  <div class="dropdown-wrapper">
                    <button 
                      class="dropdown-trigger"
                      :aria-label="'More actions for ' + (session.title || 'Adaptive session')"
                      @click="toggleDropdown(session.id)"
                    >
                      <MoreVertical :size="20" />
                    </button>
                    <div 
                      v-if="isDropdownOpen(session.id)" 
                      class="dropdown-menu"
                      @click.stop
                    >
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteSession(session); closeDropdown()">
                        <Trash2 :size="16" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div class="adaptive-stats-grid">
                  <div class="adaptive-stat-block">
                    <div class="adaptive-stat-icon">
                      <BarChart3 :size="18" />
                    </div>
                    <div class="adaptive-stat-info">
                      <span class="adaptive-stat-label">ANSWERED</span>
                      <span class="adaptive-stat-value">{{ session.questionsAnswered || 0 }}</span>
                    </div>
                  </div>
                  <div class="adaptive-stat-block">
                    <div class="adaptive-stat-icon">
                      <Share2 :size="18" />
                    </div>
                    <div class="adaptive-stat-info">
                      <span class="adaptive-stat-label">DIFFICULTY</span>
                      <span class="adaptive-stat-value">{{ session.currentDifficulty || 'N/A' }}</span>
                    </div>
                  </div>
                </div>

                <div class="quiz-card-footer">
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

    <div
      v-if="showDetailsModal && detailsQuiz"
      class="details-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-details-title"
      @click.self="closeDetailsModal"
    >
      <div class="details-modal">
        <header class="details-modal__header">
          <div class="details-modal__heading">
            <span class="details-modal__badge">Quiz details</span>
            <div class="details-modal__title-row">
              <div class="details-modal__icon">
                <FileText :size="22" />
              </div>
              <div>
                <h3 id="quiz-details-title">{{ detailsQuiz.title || 'Untitled quiz' }}</h3>
                <p class="details-modal__subtext">
                  Updated {{ formatUpdatedAt(detailsQuiz.updatedAt || detailsQuiz.createdAt) }}
                </p>
              </div>
            </div>
          </div>
          <button class="details-modal__close" type="button" aria-label="Close details" @click="closeDetailsModal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div class="details-modal__body">
          <p v-if="detailsQuiz.description" class="details-modal__description">
            {{ detailsQuiz.description }}
          </p>

          <div class="details-grid">
            <div class="details-tile">
              <p class="details-label">Attempts</p>
              <p class="details-value">{{ detailSummary.attemptsCount }}</p>
              <p class="details-hint">Total learner tries</p>
            </div>
            <div class="details-tile">
              <p class="details-label">Average score</p>
              <p class="details-value">
                {{ detailSummary.averageScore !== null ? `${detailSummary.averageScore}%` : '—' }}
              </p>
              <p class="details-hint">Across all attempts</p>
            </div>
            <div class="details-tile">
              <p class="details-label">Mode</p>
              <p class="details-value">{{ detailMode.label }}</p>
              <p class="details-hint">{{ detailMode.details }}</p>
            </div>
            <div class="details-tile">
              <p class="details-label">Questions</p>
              <p class="details-value">{{ detailQuestionCount }}</p>
              <p class="details-hint">Total in quiz</p>
            </div>
          </div>
        </div>

        <footer class="details-modal__footer">
          <BaseButton variant="primary" size="sm" @click="openQuiz(detailsQuiz)">
            <Play :size="16" />
            Open quiz
          </BaseButton>
        </footer>
      </div>
    </div>
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
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.quiz-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.quiz-card__meta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--color-text);
}

.quiz-card__meta > svg {
  margin-top: 2px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.quiz-card__meta h3 {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz-card__subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
  font-weight: var(--font-weight-medium);
}

.quiz-card__stats {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .quiz-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.stat-chip:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.08);
  border-color: rgba(102, 126, 234, 0.25);
}

.stat-chip__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: rgba(102, 126, 234, 0.12);
  color: var(--color-primary);
  flex-shrink: 0;
}

.stat-chip__content {
  display: flex;
  flex-direction: column;
}

.stat-chip__label {
  margin: 0;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.stat-chip__value {
  margin: 4px 0 0;
  font-size: calc(var(--font-size-lg) + 2px);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.stat-chip__meta {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-soft);
}

.quiz-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding-top: var(--space-1);
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

body.dark .quiz-card__meta h3 {
  color: var(--color-text);
}

body.dark .quiz-card__subtitle {
  color: var(--color-text-soft);
}

body.dark .stat-chip {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.8);
}

body.dark .stat-chip:hover {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 22px 45px rgba(2, 6, 23, 0.9);
}

body.dark .stat-chip__icon {
  background: rgba(99, 102, 241, 0.2);
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

.details-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 1000;
  animation: detailsOverlayFade 0.25s ease;
}

.details-modal {
  width: min(520px, 100%);
  background: var(--color-surface);
  border-radius: 32px;
  box-shadow: 0 50px 120px rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  animation: detailsModalSlide 0.3s ease;
  overflow: hidden;
}

.details-modal__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.details-modal__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(226, 232, 255, 0.9);
}

.details-modal__badge {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
  background: rgba(102, 126, 234, 0.12);
}

.details-modal__header h3 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 700;
  color: #0f172a;
}

.details-modal__subtext {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-sm);
  color: #475569;
}

.details-modal__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.details-modal__icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: #eef2ff;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.details-modal__close {
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.details-modal__close:hover {
  color: var(--color-text);
}

.details-modal__body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.details-modal__description {
  margin: 0;
  font-size: var(--font-size-sm);
  color: #0f172a;
  line-height: 1.7;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

@media (max-width: 520px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.details-tile {
  padding: var(--space-4);
  border-radius: 20px;
  background: #f8faff;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.details-label {
  margin: 0;
  font-size: var(--font-size-xs);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.details-value {
  margin: var(--space-2) 0 0;
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}

.details-hint {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-soft);
}

.details-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

body.dark .details-modal {
  background: #0f172a;
  border-color: #1e293b;
}

body.dark .details-modal__header {
  background: rgba(99, 102, 241, 0.18);
}

body.dark .details-modal__header h3 {
  color: #f8fafc;
}

body.dark .details-modal__badge {
  color: #c7d2fe;
  background: rgba(99, 102, 241, 0.3);
}

body.dark .details-modal__icon {
  background: rgba(76, 29, 149, 0.25);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

body.dark .details-modal__header {
  border-bottom-color: #1e293b;
}

body.dark .details-modal__subtext,
body.dark .details-modal__description,
body.dark .details-hint {
  color: #94a3b8;
}

body.dark .details-tile {
  background: rgba(30, 41, 59, 0.8);
  border-color: #1e293b;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

body.dark .details-value {
  color: #f8fafc;
}

@keyframes detailsOverlayFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes detailsModalSlide {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* New Quiz Card Styles */
.styled-quiz-card {
  height: 100%;
  border: 1px solid var(--color-border);
  transition: box-shadow 0.2s ease;
}

.styled-quiz-card:hover {
  box-shadow: var(--shadow-md);
}

/* Force BaseCard body to fill height */
.styled-quiz-card :deep(.base-card__body) {
  flex: 1;
  height: 100%;
}

.quiz-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-5);
}

.quiz-card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.quiz-file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  flex-shrink: 0;
}

.quiz-info {
  flex: 1;
  min-width: 0; /* For truncation */
}

.quiz-info h3 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quiz-date {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.quiz-card-footer {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Dark mode adjustments */
body.dark .styled-quiz-card {
  border-color: var(--color-border);
}

body.dark .quiz-file-icon {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.quiz-file-icon--adaptive {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

body.dark .quiz-file-icon--adaptive {
  background: rgba(124, 58, 237, 0.2);
  color: #a78bfa;
}

.adaptive-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.adaptive-stat-block {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
}

.adaptive-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.adaptive-stat-info {
  display: flex;
  flex-direction: column;
}

.adaptive-stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.adaptive-stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.2;
}

body.dark .adaptive-stat-block {
  background: rgba(30, 41, 59, 0.5);
}

body.dark .adaptive-stat-icon {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

</style>
