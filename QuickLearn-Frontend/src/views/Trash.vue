<script setup>
import { ref, onMounted, computed } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import cloudQuizService from '@/services/cloudQuizService'
import { Trash2, RotateCcw, XCircle, FolderOpen } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'

const { confirmDialog } = useConfirmDialog()
const items = ref([])
const isLoading = ref(false)
const error = ref('')
const activeFilter = ref('all')
const filterKeys = ['all', 'quizzes', 'summaries', 'flashcards']

// Modal state
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
    value.includes('summary') || value.includes('note') || value.includes('quiz') || value.includes('flashcard')
  )

  if (declaredType) {
    if (declaredType.includes('flashcard')) return 'flashcard'
    if (declaredType.includes('summary') || declaredType.includes('note')) return 'summary'
    if (declaredType.includes('quiz')) return 'quiz'
  }

  // Check for flashcard indicators
  if (
    typeof metadata.cardsCount === 'number' ||
    Array.isArray(metadata.cards) ||
    metadata.type === 'flashcard' ||
    item.type === 'flashcard'
  ) {
    return 'flashcard'
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
  const type = resolveItemType(item)
  if (type === 'summary') return 'Summary'
  if (type === 'flashcard') return 'Flashcard'
  return 'Quiz'
}

function getCollectionLabel(type) {
  if (type === 'summary') return 'summaries'
  if (type === 'flashcard') return 'flashcards'
  return 'quizzes'
}





const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return items.value
  if (activeFilter.value === 'quizzes') {
    return items.value.filter(item => resolveItemType(item) === 'quiz')
  }
  if (activeFilter.value === 'summaries') {
    return items.value.filter(item => resolveItemType(item) === 'summary')
  }
  if (activeFilter.value === 'flashcards') {
    return items.value.filter(item => resolveItemType(item) === 'flashcard')
  }
  return items.value
})

function getFilterLabel(filter) {
  if (filter === 'quizzes') return 'quizzes'
  if (filter === 'summaries') return 'summaries'
  if (filter === 'flashcards') return 'flashcards'
  return 'items'
}

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

async function handleRestore(item) {
  const result = await confirmDialog({
    title: item ? `Restore ${getItemTypeLabel(item)}` : 'Restore Item',
    message: item ? `Restore "${item.title || getItemTypeLabel(item)}" to your ${getCollectionLabel(resolveItemType(item))}?` : 'Restore this item?',
    confirmText: 'Restore',
    icon: 'question'
  })

  if (!result?.isConfirmed) {
    return
  }

  await restore(item)
}

async function handlePermanentDelete(item) {
  const result = await confirmDialog({
    title: item ? `Delete ${getItemTypeLabel(item)}` : 'Delete Item',
    message: item ? `Permanently delete "${item.title || getItemTypeLabel(item)}"? This cannot be undone.` : 'Permanently delete this item? This cannot be undone.',
    confirmText: 'Delete',
    icon: 'warning',
    danger: true
  })

  if (!result?.isConfirmed) {
    return
  }

  await permanentlyDelete(item)
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


async function restore(item) {
  try {
    await cloudQuizService.restoreQuiz(item.id)
    window.$toast?.success(`${getItemTypeLabel(item)} restored`)
    await loadTrash()
  } catch (e) {
    window.$toast?.error(`Failed to restore ${getItemTypeLabel(item).toLowerCase()}`)
  }
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
        <button
          id="trash-filter-tab-flashcards"
          class="tab"
          :class="{ 'tab--active': activeFilter === 'flashcards' }"
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'flashcards'"
          :tabindex="activeFilter === 'flashcards' ? 0 : -1"
          aria-controls="trash-items-panel"
          @click="activeFilter = 'flashcards'"
          @keydown="handleFilterKeydown($event, 'flashcards')"
        >
          Flashcards
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
          <h3>No {{ getFilterLabel(activeFilter) }} in trash</h3>
          <p>Try selecting a different filter to view other items.</p>
        </div>
      </BaseCard>
    </div>

    <div v-else id="trash-items-panel" class="library-grid" role="tabpanel" tabindex="0">
      <BaseCard
        v-for="item in filteredItems"
        :key="item.id"
        class="styled-trash-card"
        :padding="'none'"
      >
        <div class="trash-card-content">
          <div class="trash-card-header">
            <div class="trash-title-row">
              <h3 :title="item.title">{{ item.title || 'Untitled item' }}</h3>
              <span class="trash-badge">TRASHED</span>
            </div>
            <p class="trash-date">
              Deleted {{ new Date(item.metadata?.deletedAt).toLocaleDateString() }}
            </p>
          </div>

          <div class="trash-tags">
            <span class="trash-tag">{{ getItemTypeLabel(item) }}</span>
            <template v-if="resolveItemType(item) === 'quiz'">
              <span v-if="item.metadata?.questionCount" class="trash-tag">
                {{ item.metadata.questionCount }} Questions
              </span>
            </template>
            <template v-else-if="resolveItemType(item) === 'summary'">
              <span v-if="item.metadata?.keyPointCount" class="trash-tag">
                {{ item.metadata.keyPointCount }} Key Points
              </span>
            </template>
            <template v-else-if="resolveItemType(item) === 'flashcard'">
              <span v-if="item.metadata?.cardsCount" class="trash-tag">
                {{ item.metadata.cardsCount }} Cards
              </span>
            </template>
          </div>

          <div class="trash-card-footer">
            <BaseButton variant="outline" size="sm" @click="() => handleRestore(item)">
              <RotateCcw :size="16" />
              Restore
            </BaseButton>
            <BaseButton variant="danger" size="sm" @click="() => handlePermanentDelete(item)">
              <XCircle :size="16" />
              Delete
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

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

/* Styled Trash Card */
.styled-trash-card {
  height: 100%;
  border: 1px solid var(--color-border);
  transition: box-shadow 0.2s ease;
  background: var(--color-surface);
}

.styled-trash-card:hover {
  box-shadow: var(--shadow-md);
}

/* Force BaseCard body to fill height */
.styled-trash-card :deep(.base-card__body) {
  flex: 1;
  height: 100%;
}

.trash-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-5);
}

.trash-card-header {
  margin-bottom: var(--space-4);
}

.trash-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.trash-title-row h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.trash-badge {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: #fee2e2;
  color: #ef4444;
  letter-spacing: 0.05em;
}

.trash-date {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.trash-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.trash-tag {
  padding: 4px 12px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 500;
}

.trash-card-footer {
  margin-top: auto;
  display: flex;
  gap: var(--space-3);
}

.trash-card-footer > * {
  flex: 1;
  justify-content: center;
}

/* Dark mode adjustments */
body.dark .styled-trash-card {
  border-color: var(--color-border);
}

body.dark .trash-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

body.dark .trash-tag {
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




