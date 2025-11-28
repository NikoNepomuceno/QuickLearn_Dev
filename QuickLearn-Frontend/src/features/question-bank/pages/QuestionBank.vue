<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestionBankStore } from '../store/questionBank.store'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BeatLoader from '@/components/BeatLoader.vue'
import QuestionCard from '../components/QuestionCard.vue'
import QuestionFilters from '../components/QuestionFilters.vue'
import SelectedQuestionsPanel from '../components/SelectedQuestionsPanel.vue'
import { Database, AlertCircle, RefreshCw, ArrowLeft, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const store = useQuestionBankStore()

const showExtractModal = ref(false)
const showClearConfirm = ref(false)

const hasQuestions = computed(() => {
  return store.questions.length > 0
})

const hasSelectedQuestions = computed(() => {
  return store.selectedCount > 0
})

onMounted(async () => {
  try {
    await store.fetchQuestions()
    
    // If no questions, show extraction option
    if (store.questions.length === 0 && !store.isLoading) {
      showExtractModal.value = true
    }
  } catch (error) {
    console.error('Error loading questions:', error)
  }
})

async function handleExtractQuestions() {
  try {
    await store.extractQuestions()
    showExtractModal.value = false
    window.$toast?.success('Questions extracted successfully!')
  } catch (error) {
    window.$toast?.error(error.message || 'Failed to extract questions')
  }
}

function handleToggleSelection(questionId) {
  store.toggleQuestionSelection(questionId)
}

function handleUpdateFilters(newFilters) {
  store.applyFilters(newFilters)
}

function handleClearFilters() {
  store.applyFilters({
    topic: null,
    category: null,
    difficulty: [],
    type: [],
    search: ''
  })
}

function handleBuildQuiz() {
  if (hasSelectedQuestions.value) {
    router.push('/question-bank/build')
  }
}

function handleRemoveQuestion(questionId) {
  store.toggleQuestionSelection(questionId)
}

function handleClearSelection() {
  store.clearSelection()
}

function handlePageChange(page) {
  store.setPage(page)
}

async function handleClearAll() {
  showClearConfirm.value = true
}

async function confirmClearAll() {
  try {
    const result = await store.clearAllQuestions()
    showClearConfirm.value = false
    window.$toast?.success(result.message || 'Question bank cleared successfully!')
    // Refresh questions list (will show empty state)
    await store.fetchQuestions()
  } catch (error) {
    showClearConfirm.value = false
    window.$toast?.error(error.message || 'Failed to clear question bank')
  }
}
</script>

<template>
  <AppShell
    title="Question Bank"
    subtitle="Browse and select questions to build your custom quiz"
    content-width="wide"
  >
    <div class="question-bank">
      <!-- Header Actions -->
      <div class="question-bank__header">
        <BaseButton
          variant="secondary"
          size="sm"
          @click="router.push('/upload')"
        >
          <ArrowLeft :size="16" />
          Back to Upload
        </BaseButton>
        <div class="question-bank__header-actions">
          <BaseButton
            v-if="hasQuestions && !store.isLoading"
            variant="outline"
            size="sm"
            @click="handleClearAll"
            :disabled="store.isClearing"
          >
            <Trash2 :size="16" />
            {{ store.isClearing ? 'Clearing...' : 'Clear All' }}
          </BaseButton>
          <BaseButton
            v-if="!hasQuestions && !store.isLoading"
            variant="primary"
            size="sm"
            @click="handleExtractQuestions"
            :disabled="store.isExtracting"
          >
            <RefreshCw :size="16" :class="{ 'spinning': store.isExtracting }" />
            {{ store.isExtracting ? 'Extracting...' : 'Extract Questions' }}
          </BaseButton>
        </div>
      </div>

      <!-- Main Content -->
      <div class="question-bank__grid">
        <!-- Filters Sidebar -->
        <aside
          class="question-bank__sidebar"
          role="complementary"
          aria-label="Filter questions"
        >
          <div class="question-bank__sidebar-panel">
            <QuestionFilters
              :filters="store.filters"
              :available-topics="store.availableTopics"
              :available-categories="store.availableCategories"
              @update-filters="handleUpdateFilters"
              @clear-filters="handleClearFilters"
            />
          </div>
        </aside>

        <!-- Questions Area -->
        <main
          class="question-bank__main"
          role="region"
          aria-label="Question list"
        >
          <!-- Loading State -->
          <div v-if="store.isLoading && !hasQuestions" class="question-bank__loading">
            <BeatLoader
              :loading="true"
              text="Loading questions..."
              color="#667eea"
              size="20px"
            />
          </div>

          <!-- Empty State -->
          <BaseCard
            v-else-if="!hasQuestions && !store.isLoading"
            padding="lg"
            class="question-bank__empty"
          >
            <Database :size="48" class="empty-icon" />
            <h3>No Questions Found</h3>
            <p>Your question bank is empty. Extract questions from your existing quizzes to get started.</p>
            <BaseButton
              variant="primary"
              @click="handleExtractQuestions"
              :disabled="store.isExtracting"
            >
              <RefreshCw :size="16" :class="{ 'spinning': store.isExtracting }" />
              {{ store.isExtracting ? 'Extracting...' : 'Extract Questions' }}
            </BaseButton>
          </BaseCard>

          <!-- Questions Grid -->
          <div v-else class="question-bank__content">
            <div class="question-bank__stats" role="status" aria-live="polite">
              <p class="question-bank__stats-copy">
                Showing {{ store.questions.length }} of {{ store.pagination.total }} questions
              </p>
              <span
                v-if="store.selectedCount > 0"
                class="selected-count"
              >
                {{ store.selectedCount }} selected
              </span>
            </div>

            <div class="questions-grid">
              <QuestionCard
                v-for="question in store.questions"
                :key="question.uuid || question.id"
                :question="question"
                :selected="store.isQuestionSelected(question.uuid || question.id)"
                @toggle-selection="handleToggleSelection"
              />
            </div>

            <!-- Pagination -->
            <div v-if="store.pagination.totalPages > 1" class="pagination">
              <BaseButton
                variant="outline"
                size="sm"
                :disabled="store.pagination.page === 1"
                @click="handlePageChange(store.pagination.page - 1)"
              >
                Previous
              </BaseButton>
              <span class="pagination-info">
                Page {{ store.pagination.page }} of {{ store.pagination.totalPages }}
              </span>
              <BaseButton
                variant="outline"
                size="sm"
                :disabled="store.pagination.page >= store.pagination.totalPages"
                @click="handlePageChange(store.pagination.page + 1)"
              >
                Next
              </BaseButton>
            </div>
          </div>
        </main>

        <!-- Selected Questions Panel -->
        <aside
          class="question-bank__selected"
          role="complementary"
          aria-label="Selected questions summary"
        >
          <div class="question-bank__selected-panel">
            <SelectedQuestionsPanel
              :selected-count="store.selectedCount"
              :selected-questions="store.selectedQuestions"
              @build-quiz="handleBuildQuiz"
              @clear-selection="handleClearSelection"
              @remove-question="handleRemoveQuestion"
            />
          </div>
        </aside>
      </div>

      <!-- Error Message -->
      <div
        v-if="store.error"
        class="question-bank__error"
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle :size="20" />
        <span>{{ store.error }}</span>
      </div>

      <!-- Clear Confirmation Dialog -->
      <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
        <BaseCard padding="lg" class="confirmation-dialog">
          <h3 class="confirmation-dialog__title">Clear Question Bank</h3>
          <p class="confirmation-dialog__message">
            Are you sure you want to clear all questions from your question bank? This action cannot be undone.
          </p>
          <div class="confirmation-dialog__actions">
            <BaseButton
              variant="outline"
              size="sm"
              @click="showClearConfirm = false"
              :disabled="store.isClearing"
            >
              Cancel
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              @click="confirmClearAll"
              :disabled="store.isClearing"
            >
              <Trash2 v-if="!store.isClearing" :size="16" />
              <BeatLoader v-else :loading="true" size="12px" color="#fff" />
              {{ store.isClearing ? 'Clearing...' : 'Clear All' }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.question-bank {
  display: flex;
  flex-direction: column;
  gap: clamp(20px, 2vw, 32px);
  padding-bottom: clamp(16px, 2vw, 32px);
}

.question-bank__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.question-bank__header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.question-bank__grid {
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(260px, 340px);
  gap: clamp(20px, 2vw, 32px);
  align-items: start;
}

.question-bank__sidebar {
  position: sticky;
  top: 20px;
}

.question-bank__sidebar-panel,
.question-bank__selected-panel,
.question-bank__main {
  background: var(--color-surface, #fff);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: clamp(16px, 1.4vw, 24px);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.question-bank__main {
  min-height: 400px;
}

.question-bank__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.question-bank__empty {
  text-align: center;
  padding: 60px 40px;
}

.empty-icon {
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.question-bank__empty h3 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.question-bank__empty p {
  margin: 0 0 24px;
  color: var(--color-text-muted);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.question-bank__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.question-bank__stats {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: clamp(0.95rem, 1vw, 1.05rem);
  color: var(--color-text-muted);
  line-height: 1.6;
}

.question-bank__stats-copy {
  margin: 0;
}

.selected-count {
  color: var(--color-primary);
  font-weight: 600;
  font-size: clamp(1rem, 1.1vw, 1.1rem);
  background: rgba(102, 126, 234, 0.1);
  border-radius: 999px;
  padding: 4px 12px;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(260px, 26vw, 340px), 1fr));
  gap: 20px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 0;
}

.pagination-info {
  font-size: 14px;
  color: var(--color-text-muted);
}

.question-bank__selected {
  position: sticky;
  top: 20px;
}

.question-bank :deep(button:focus-visible),
.question-bank :deep(a:focus-visible) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 8px;
}

.question-bank__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 14px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.confirmation-dialog {
  max-width: 480px;
  width: 90%;
  margin: 20px;
}

.confirmation-dialog__title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.confirmation-dialog__message {
  margin: 0 0 24px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.confirmation-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsive */
@media (max-width: 1400px) {
  .question-bank__grid {
    grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(240px, 320px);
  }
}

@media (max-width: 1200px) {
  .question-bank__grid {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  }

  .question-bank__selected {
    grid-column: 1 / -1;
    position: static;
  }
}

@media (max-width: 768px) {
  .question-bank__grid {
    grid-template-columns: 1fr;
  }

  .question-bank__sidebar {
    position: static;
  }

  .question-bank__sidebar-panel,
  .question-bank__selected-panel,
  .question-bank__main {
    padding: 20px;
  }

  .questions-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>

