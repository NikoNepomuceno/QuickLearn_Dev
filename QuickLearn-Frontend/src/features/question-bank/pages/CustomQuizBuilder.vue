<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuestionBankStore } from '../store/questionBank.store'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BeatLoader from '@/components/BeatLoader.vue'
import { ArrowLeft, ArrowUp, ArrowDown, X, Plus, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const store = useQuestionBankStore()

const quizTitle = ref('')
const quizDescription = ref('')
const orderedQuestions = ref([])
const isCreating = ref(false)

const selectedQuestions = computed(() => {
  return store.selectedQuestions
})

const canCreateQuiz = computed(() => {
  return quizTitle.value.trim().length > 0 && orderedQuestions.value.length > 0
})

onMounted(() => {
  // Initialize ordered questions from selected questions
  orderedQuestions.value = [...selectedQuestions.value]
  
  // If no questions selected, redirect back
  if (orderedQuestions.value.length === 0) {
    router.push('/question-bank')
  }
})

function moveQuestionUp(index) {
  if (index > 0) {
    const temp = orderedQuestions.value[index]
    orderedQuestions.value[index] = orderedQuestions.value[index - 1]
    orderedQuestions.value[index - 1] = temp
  }
}

function moveQuestionDown(index) {
  if (index < orderedQuestions.value.length - 1) {
    const temp = orderedQuestions.value[index]
    orderedQuestions.value[index] = orderedQuestions.value[index + 1]
    orderedQuestions.value[index + 1] = temp
  }
}

function removeQuestion(index) {
  const question = orderedQuestions.value[index]
  orderedQuestions.value.splice(index, 1)
  store.toggleQuestionSelection(question.id || question.uuid)
}

function addMoreQuestions() {
  router.push('/question-bank')
}

async function handleCreateQuiz() {
  if (!canCreateQuiz.value) return

  isCreating.value = true

  try {
    const questionIds = orderedQuestions.value.map(q => q.id || q.uuid)
    
    const result = await store.createCustomQuiz({
      title: quizTitle.value.trim(),
      description: quizDescription.value.trim(),
      questionIds
    })

    window.$toast?.success('Custom quiz created successfully!')
    
    // Navigate to the quiz
    if (result.quiz?.id || result.quiz?.uuid) {
      router.push(`/quiz/${result.quiz.id || result.quiz.uuid}`)
    } else {
      router.push('/my-quizzes')
    }
  } catch (error) {
    window.$toast?.error(error.message || 'Failed to create custom quiz')
  } finally {
    isCreating.value = false
  }
}

function getQuestionStem(question) {
  const qData = question.questionData || {}
  return qData.stem || qData.question || question.stem || 'No question text'
}
</script>

<template>
  <AppShell
    title="Build Custom Quiz"
    subtitle="Review and organize your selected questions"
    content-width="wide"
  >
    <div class="custom-quiz-builder">
      <!-- Header -->
      <div class="builder-header">
        <BaseButton
          variant="secondary"
          size="sm"
          @click="router.push('/question-bank')"
        >
          <ArrowLeft :size="16" />
          Back to Question Bank
        </BaseButton>
      </div>

      <div class="builder-grid">
        <!-- Main Content -->
        <main class="builder-main">
          <!-- Quiz Info -->
          <BaseCard padding="lg" class="quiz-info-card">
            <h3 class="section-title">Quiz Information</h3>
            <div class="form-group">
              <label class="form-label">Quiz Title *</label>
              <BaseInput
                v-model="quizTitle"
                placeholder="Enter quiz title..."
                :maxlength="255"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Description (Optional)</label>
              <textarea
                v-model="quizDescription"
                class="form-textarea"
                placeholder="Enter quiz description..."
                rows="3"
              ></textarea>
            </div>
          </BaseCard>

          <!-- Questions List -->
          <BaseCard padding="lg" class="questions-list-card">
            <div class="questions-list-header">
              <h3 class="section-title">Questions ({{ orderedQuestions.length }})</h3>
              <BaseButton
                variant="outline"
                size="sm"
                @click="addMoreQuestions"
              >
                <Plus :size="16" />
                Add More
              </BaseButton>
            </div>

            <div v-if="orderedQuestions.length === 0" class="empty-questions">
              <p>No questions selected. Add questions from the Question Bank.</p>
              <BaseButton
                variant="primary"
                @click="addMoreQuestions"
              >
                Browse Question Bank
              </BaseButton>
            </div>

            <div v-else class="questions-list">
              <div
                v-for="(question, index) in orderedQuestions"
                :key="question.id || question.uuid"
                class="question-item"
              >
                <div class="question-item__number">{{ index + 1 }}</div>
                <div class="question-item__content">
                  <p class="question-item__stem">{{ getQuestionStem(question) }}</p>
                  <div class="question-item__meta">
                    <span class="question-badge">{{ question.topic || 'General' }}</span>
                    <span class="question-badge">{{ question.difficulty || 'medium' }}</span>
                    <span class="question-badge">{{ question.questionType || 'multiple_choice' }}</span>
                  </div>
                </div>
                <div class="question-item__actions">
                  <button
                    class="action-btn"
                    :disabled="index === 0"
                    @click="moveQuestionUp(index)"
                    aria-label="Move up"
                  >
                    <ArrowUp :size="16" />
                  </button>
                  <button
                    class="action-btn"
                    :disabled="index === orderedQuestions.length - 1"
                    @click="moveQuestionDown(index)"
                    aria-label="Move down"
                  >
                    <ArrowDown :size="16" />
                  </button>
                  <button
                    class="action-btn action-btn--danger"
                    @click="removeQuestion(index)"
                    aria-label="Remove"
                  >
                    <X :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </BaseCard>
        </main>

        <!-- Sidebar -->
        <aside class="builder-sidebar">
          <BaseCard padding="lg" class="preview-card">
            <h3 class="section-title">Quiz Preview</h3>
            <div class="preview-stats">
              <div class="stat-item">
                <span class="stat-label">Questions</span>
                <span class="stat-value">{{ orderedQuestions.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Title</span>
                <span class="stat-value">{{ quizTitle || 'Untitled Quiz' }}</span>
              </div>
            </div>

            <div class="preview-actions">
              <BaseButton
                variant="primary"
                size="lg"
                :disabled="!canCreateQuiz || isCreating"
                @click="handleCreateQuiz"
                class="create-btn"
              >
                <CheckCircle2 v-if="!isCreating" :size="18" />
                <BeatLoader v-else :loading="true" size="12px" color="#fff" />
                {{ isCreating ? 'Creating...' : 'Create Quiz' }}
              </BaseButton>
            </div>

            <div v-if="!canCreateQuiz" class="preview-warning">
              <AlertCircle :size="16" />
              <p>Please provide a quiz title and select at least one question.</p>
            </div>
          </BaseCard>
        </aside>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.custom-quiz-builder {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.builder-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  align-items: start;
}

.builder-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.questions-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.empty-questions {
  text-align: center;
  padding: 60px 40px;
  color: var(--color-text-muted);
}

.empty-questions p {
  margin: 0 0 20px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  transition: all 0.2s ease;
}

.question-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.question-item__number {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.question-item__content {
  flex: 1;
  min-width: 0;
}

.question-item__stem {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}

.question-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-surface-emphasis);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  text-transform: capitalize;
}

.question-item__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn--danger:hover:not(:disabled) {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.builder-sidebar {
  position: sticky;
  top: 20px;
}

.preview-card {
  position: sticky;
  top: 20px;
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  word-break: break-word;
}

.preview-actions {
  margin-bottom: 16px;
}

.create-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.preview-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: #f59e0b;
  font-size: 13px;
}

.preview-warning p {
  margin: 0;
  line-height: 1.5;
}

/* Dark mode */
body.dark .form-textarea {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
  color: var(--color-text);
}

body.dark .question-item {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

/* Responsive */
@media (max-width: 1024px) {
  .builder-grid {
    grid-template-columns: 1fr;
  }

  .builder-sidebar {
    position: static;
  }
}
</style>

