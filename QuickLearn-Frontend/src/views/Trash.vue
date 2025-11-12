<script setup>
import { ref, onMounted, computed } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import cloudQuizService from '@/services/cloudQuizService'
import { Trash2, RotateCcw, XCircle, FolderOpen } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'

const items = ref([])
const isLoading = ref(false)
const error = ref('')
const activeFilter = ref('all')
const filterKeys = ['all', 'quizzes', 'summaries']

// Modal state
const showRestoreModal = ref(false)
const itemToRestore = ref(null)
const showDeleteModal = ref(false)
const itemToDelete = ref(null)
const router = useRouter()

function resolveItemType(item) {
  if (!item) return 'quiz'
  const metadata = item.metadata || {}

  const candidates = [
    item.type,
    item.kind,
    item.category,
    metadata.itemType,
    metadata.type,
    metadata.contentType,
    metadata.kind,
    metadata.category
  ]
    .filter(Boolean)
    .map((value) => `${value}`.toLowerCase())

  const declaredType = candidates.find((value) =>
    value.includes('summary') || value.includes('note') || value.includes('quiz')
  )

  if (declaredType) {
    if (declaredType.includes('summary') || declaredType.includes('note')) return 'summary'
    return 'quiz'
  }

  if (typeof metadata.questionCount === 'number') return 'quiz'

  if (
    Array.isArray(metadata.keyPoints) ||
    Array.isArray(metadata.sections) ||
    Array.isArray(metadata.takeaways) ||
    typeof metadata.sectionCount === 'number' ||
    typeof metadata.keyPointCount === 'number'
  ) {
    return 'summary'
  }

  return 'quiz'
}

function getItemTypeLabel(item) {
  return resolveItemType(item) === 'summary' ? 'Summary' : 'Quiz'
}

function getCollectionLabel(type) {
  return type === 'summary' ? 'summaries' : 'quizzes'
}

const restoreMessage = computed(() => {
  if (!itemToRestore.value) return 'Restore this item?'
  const type = resolveItemType(itemToRestore.value)
  const typeLabel = getItemTypeLabel(itemToRestore.value)
  const title = itemToRestore.value.title || `Untitled ${typeLabel}`
  return `Restore "${title}" to your ${getCollectionLabel(type)}?`
})

const deleteMessage = computed(() => {
  if (!itemToDelete.value) return 'Permanently delete this item? This cannot be undone.'
  const type = resolveItemType(itemToDelete.value)
  const typeLabel = getItemTypeLabel(itemToDelete.value)
  const title = itemToDelete.value.title || `Untitled ${typeLabel}`
  return `Permanently delete "${title}"? This cannot be undone.`
})

const restoreModalTitle = computed(() => {
  if (!itemToRestore.value) return 'Restore Item'
  return `Restore ${getItemTypeLabel(itemToRestore.value)}`
})

const deleteModalTitle = computed(() => {
  if (!itemToDelete.value) return 'Delete Item'
  return `Delete ${getItemTypeLabel(itemToDelete.value)}`
})

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return items.value
  if (activeFilter.value === 'quizzes') {
    return items.value.filter(item => resolveItemType(item) === 'quiz')
  }
  if (activeFilter.value === 'summaries') {
    return items.value.filter(item => resolveItemType(item) === 'summary')
  }
  return items.value
})

function focusFilterTab(tab) {
  const el = document.getElementById(`trash-filter-tab-${tab}`)
  el?.focus()
}

function handleFilterKeydown(event, tab) {
  const index = filterKeys.indexOf(tab)
  if (index === -1) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    const nextTab = filterKeys[(index + 1) % filterKeys.length]
    activeFilter.value = nextTab
    focusFilterTab(nextTab)
    event.preventDefault()
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    const prevTab = filterKeys[(index - 1 + filterKeys.length) % filterKeys.length]
    activeFilter.value = prevTab
    focusFilterTab(prevTab)
    event.preventDefault()
  }
}

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
    window.$toast?.success(`${getItemTypeLabel(item)} restored`)
    await loadTrash()
  } catch (e) {
    window.$toast?.error(`Failed to restore ${getItemTypeLabel(item).toLowerCase()}`)
  }
}

function requestDelete(item) {
  itemToDelete.value = item
  showDeleteModal.value = true
}

async function permanentlyDelete(item) {
  try {
    await cloudQuizService.permanentlyDeleteQuiz(item.id)
    window.$toast?.success(`${getItemTypeLabel(item)} permanently deleted`)
    await loadTrash()
  } catch (e) {
    window.$toast?.error(`Failed to permanently delete ${getItemTypeLabel(item).toLowerCase()}`)
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
  <AppShell
    title="Trash"
    subtitle="Restore deleted quizzes or summaries within 30 days. Items here are permanently removed afterwards."
    content-width="wide"
  >
    <div class="page-toolbar">
      <div class="tab-group" role="tablist" aria-label="Trash filters">
        <button
          id="trash-filter-tab-all"
          class="tab"
          :class="{ 'tab--active': activeFilter === 'all' }"
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'all'"
          :tabindex="activeFilter === 'all' ? 0 : -1"
          aria-controls="trash-items-panel"
          @click="activeFilter = 'all'"
          @keydown="handleFilterKeydown($event, 'all')"
        >
          All
        </button>
        <button
          id="trash-filter-tab-quizzes"
          class="tab"
          :class="{ 'tab--active': activeFilter === 'quizzes' }"
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'quizzes'"
          :tabindex="activeFilter === 'quizzes' ? 0 : -1"
          aria-controls="trash-items-panel"
          @click="activeFilter = 'quizzes'"
          @keydown="handleFilterKeydown($event, 'quizzes')"
        >
          Quizzes
        </button>
        <button
          id="trash-filter-tab-summaries"
          class="tab"
          :class="{ 'tab--active': activeFilter === 'summaries' }"
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'summaries'"
          :tabindex="activeFilter === 'summaries' ? 0 : -1"
          aria-controls="trash-items-panel"
          @click="activeFilter = 'summaries'"
          @keydown="handleFilterKeydown($event, 'summaries')"
        >
          Summaries
        </button>
      </div>
      <div class="page-toolbar__actions">
        <BaseButton variant="outline" size="sm" :disabled="isLoading" @click="loadTrash">
          Refresh
        </BaseButton>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <BeatLoader :loading="true" text="Loading trash..." color="#667eea" size="20px" />
    </div>

    <div v-else-if="error" class="error-state">
      <BaseCard padding="lg">
        <div class="empty-card">
          <FolderOpen :size="40" />
          <h3>Unable to load trash</h3>
          <p>{{ error }}</p>
          <BaseButton variant="primary" size="sm" @click="loadTrash">
            Try again
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <div v-else-if="items.length === 0" class="empty-state">
      <BaseCard padding="lg">
        <div class="empty-card">
          <Trash2 :size="48" />
          <h3>Trash is empty</h3>
          <p>Deleted items will show up here and be removed automatically after 30 days.</p>
          <BaseButton variant="primary" @click="router.push('/my-quizzes')">
            Back to library
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <BaseCard padding="lg">
        <div class="empty-card">
          <FolderOpen :size="48" />
          <h3>No {{ activeFilter === 'quizzes' ? 'quizzes' : 'summaries' }} in trash</h3>
          <p>Try selecting a different filter to view other items.</p>
        </div>
      </BaseCard>
    </div>

    <div v-else id="trash-items-panel" class="library-grid" role="tabpanel" tabindex="0">
      <BaseCard
        v-for="item in filteredItems"
        :key="item.id"
        padding="lg"
      >
        <div class="trash-card">
          <div class="trash-card__header">
            <div class="trash-card__meta">
              <h3>{{ item.title || 'Untitled item' }}</h3>
              <p class="trash-card__subtitle">
                Deleted {{ new Date(item.metadata?.deletedAt).toLocaleString() }}
              </p>
            </div>
            <span class="trash-card__badge">Trashed</span>
          </div>

          <div class="trash-card__stats">
            <span class="stat-chip">{{ getItemTypeLabel(item) }}</span>
            <template v-if="resolveItemType(item) === 'quiz'">
              <span v-if="item.metadata?.questionCount" class="stat-chip">
                {{ item.metadata.questionCount }} questions
              </span>
              <span v-if="item.metadata?.attemptsCount" class="stat-chip">
                {{ item.metadata.attemptsCount }} attempts
              </span>
            </template>
            <template v-else>
              <span v-if="item.metadata?.keyPointCount" class="stat-chip">
                {{ item.metadata.keyPointCount }} key points
              </span>
              <span v-if="item.metadata?.sectionCount" class="stat-chip">
                {{ item.metadata.sectionCount }} sections
              </span>
            </template>
          </div>

          <div class="trash-card__actions">
            <BaseButton variant="secondary" size="sm" @click="() => requestRestore(item)">
              <RotateCcw :size="16" />
              Restore
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="() => requestDelete(item)">
              <XCircle :size="16" />
              Delete
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <ConfirmModal
      v-model="showRestoreModal"
      :title="restoreModalTitle"
      :message="restoreMessage"
      confirm-text="Restore"
      cancel-text="Cancel"
      @confirm="confirmRestore"
      @cancel="cancelRestore"
    />

    <ConfirmModal
      v-model="showDeleteModal"
      :title="deleteModalTitle"
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

.library-grid {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 900px) {
  .library-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

.trash-card {
  display: grid;
  gap: var(--space-4);
}

.trash-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.trash-card__meta h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.trash-card__subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.trash-card__badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.trash-card__stats {
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

.trash-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

body.dark .trash-card__badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

body.dark .stat-chip {
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
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




