<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Save, Plus, Trash2, BookOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import cloudQuizService from '@/services/cloudQuizService'

const route = useRoute()
const router = useRouter()
const flashcardsId = computed(() => route.params.id)

const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const saveStatus = ref('saved')
const showDeleteConfirm = ref(null)

const title = ref('')
const cards = ref([])
const originalData = ref(null)

// Watch for changes to detect unsaved state
watch([title, cards], () => {
  if (originalData.value && saveStatus.value !== 'saving') {
    const hasChanges = JSON.stringify({
      title: title.value,
      cards: cards.value
    }) !== JSON.stringify(originalData.value)
    saveStatus.value = hasChanges ? 'unsaved' : 'saved'
  }
}, { deep: true })

onMounted(async () => {
  await loadFlashcards()
  setupKeyboardShortcuts()
})

onUnmounted(() => {
  removeKeyboardShortcuts()
})

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyboardShortcut)
}

function removeKeyboardShortcuts() {
  document.removeEventListener('keydown', handleKeyboardShortcut)
}

function handleKeyboardShortcut(e) {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!isSaving.value && saveStatus.value === 'unsaved') {
      saveFlashcards()
    }
  }
  // Escape to cancel delete confirmation
  if (e.key === 'Escape' && showDeleteConfirm.value !== null) {
    showDeleteConfirm.value = null
  }
}

async function loadFlashcards() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const data = await cloudQuizService.getFlashcards(flashcardsId.value)
    if (!data) {
      errorMessage.value = 'Flashcards not found.'
      return
    }
    title.value = data.title || 'Flashcards'
    cards.value = Array.isArray(data.cards) ? data.cards.map(c => ({
      front: c.front || '',
      back: c.back || ''
    })) : []
    // Store original data for change detection
    originalData.value = {
      title: title.value,
      cards: JSON.parse(JSON.stringify(cards.value))
    }
    saveStatus.value = 'saved'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to load flashcards.'
  } finally {
    isLoading.value = false
  }
}

function addCard() {
  cards.value.push({ front: '', back: '' })
  // Focus on the new card's front textarea
  setTimeout(() => {
    const newCardIndex = cards.value.length - 1
    const textarea = document.querySelector(`.card:nth-child(${newCardIndex + 1}) .text-area`)
    if (textarea) textarea.focus()
  }, 50)
}

function confirmDeleteCard(index) {
  showDeleteConfirm.value = index
}

function cancelDelete() {
  showDeleteConfirm.value = null
}

function removeCard(index) {
  cards.value.splice(index, 1)
  showDeleteConfirm.value = null
}

function getCharacterCount(text) {
  return (text || '').length
}

function getWordCount(text) {
  return (text || '').trim().split(/\s+/).filter(word => word.length > 0).length
}

async function saveFlashcards() {
  isSaving.value = true
  saveStatus.value = 'saving'
  errorMessage.value = ''
  try {
    const payload = {
      title: title.value,
      cards: cards.value.map(c => ({ front: c.front || '', back: c.back || '' }))
    }
    await cloudQuizService.updateFlashcards(flashcardsId.value, payload)
    // Update original data after successful save
    originalData.value = {
      title: title.value,
      cards: JSON.parse(JSON.stringify(cards.value))
    }
    saveStatus.value = 'saved'
    window.$toast?.success('Flashcards saved successfully')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to save flashcards.'
    saveStatus.value = 'unsaved'
    window.$toast?.error(errorMessage.value)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <AppShell
    :title="title || 'Flashcards'"
    subtitle="Review, edit, and save your generated flashcards."
    content-width="wide"
  >
    <!-- Toolbar with save status -->
    <div class="toolbar">
      <div class="toolbar-left">
        <BaseButton variant="secondary" size="sm" @click="router.back()" aria-label="Go back">
          Back
        </BaseButton>
        <BaseButton
          variant="outline"
          size="sm"
          @click="router.push(`/flashcards/${flashcardsId}/study`)"
          aria-label="Study flashcards"
        >
          Study
        </BaseButton>
      </div>
      <div class="toolbar-right">
        <div class="save-status" :class="`save-status--${saveStatus}`" v-if="!isLoading && !errorMessage">
          <CheckCircle2 v-if="saveStatus === 'saved'" :size="16" class="save-status__icon" />
          <Loader2 v-else-if="saveStatus === 'saving'" :size="16" class="save-status__icon save-status__icon--spinning" />
          <AlertCircle v-else :size="16" class="save-status__icon" />
          <span class="save-status__text">
            {{ saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes' }}
          </span>
        </div>
        <BaseButton
          variant="primary"
          size="sm"
          :disabled="isSaving || saveStatus === 'saved'"
          @click="saveFlashcards"
          :aria-label="isSaving ? 'Saving flashcards' : 'Save flashcards'"
        >
          <Save :size="16" />
          {{ isSaving ? 'Saving…' : 'Save' }}
          <span class="keyboard-hint" v-if="!isSaving && saveStatus === 'unsaved'">Ctrl+S</span>
        </BaseButton>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton-line skeleton-line--short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-line--short"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="errorMessage" class="error-state">
      <AlertCircle :size="48" class="error-state__icon" />
      <h3 class="error-state__title">Error loading flashcards</h3>
      <p class="error-state__message">{{ errorMessage }}</p>
      <BaseButton variant="primary" size="sm" @click="loadFlashcards">
        Try again
      </BaseButton>
    </div>

    <!-- Main content -->
    <div v-else class="flashcards-content">
      <!-- Title section -->
      <BaseCard class="title-section" elevated>
        <div class="title-section__content">
          <label class="label" for="flashcard-title">
            <BookOpen :size="18" />
            Title
          </label>
          <input
            id="flashcard-title"
            v-model="title"
            class="text-input"
            type="text"
            placeholder="Enter a title for your flashcards"
            aria-label="Flashcard title"
          />
        </div>
      </BaseCard>

      <!-- Cards section -->
      <div class="cards-section">
        <div class="cards-header">
          <div class="cards-header__info">
            <h3 class="cards-header__title">Flashcards</h3>
            <span class="cards-header__count">{{ cards.length }} {{ cards.length === 1 ? 'card' : 'cards' }}</span>
          </div>
          <BaseButton variant="secondary" size="sm" @click="addCard" aria-label="Add new flashcard">
            <Plus :size="16" />
            Add card
          </BaseButton>
        </div>

        <!-- Empty state -->
        <div v-if="cards.length === 0" class="empty-state">
          <BookOpen :size="64" class="empty-state__icon" />
          <h3 class="empty-state__title">No flashcards yet</h3>
          <p class="empty-state__message">Create your first flashcard to get started with studying.</p>
          <BaseButton variant="primary" size="md" @click="addCard">
            <Plus :size="18" />
            Create your first card
          </BaseButton>
        </div>

        <!-- Cards grid -->
        <div v-else class="cards-grid">
          <BaseCard
            v-for="(card, idx) in cards"
            :key="idx"
            class="card"
            :class="{ 'card--confirming': showDeleteConfirm === idx }"
            elevated
          >

            <!-- Front side -->
            <div class="card-side card-side--front">
              <div class="card-side__header">
                <label class="label" :for="`card-front-${idx}`">
                  <span class="card-side__label-text">Front</span>
                  <span class="card-side__badge">Question / Term</span>
                </label>
                <span class="card-side__count">
                  {{ getCharacterCount(card.front) }} chars
                  <span v-if="getWordCount(card.front) > 0">• {{ getWordCount(card.front) }} words</span>
                </span>
              </div>
              <textarea
                :id="`card-front-${idx}`"
                v-model="card.front"
                class="text-area"
                rows="4"
                placeholder="Enter the question or term..."
                :aria-label="`Card ${idx + 1} front side`"
              ></textarea>
            </div>

            <!-- Divider -->
            <div class="card__divider">
              <div class="card__divider-line"></div>
              <div class="card__divider-icon">↕</div>
              <div class="card__divider-line"></div>
            </div>

            <!-- Back side -->
            <div class="card-side card-side--back">
              <div class="card-side__header">
                <label class="label" :for="`card-back-${idx}`">
                  <span class="card-side__label-text">Back</span>
                  <span class="card-side__badge">Answer / Definition</span>
                </label>
                <span class="card-side__count">
                  {{ getCharacterCount(card.back) }} chars
                  <span v-if="getWordCount(card.back) > 0">• {{ getWordCount(card.back) }} words</span>
                </span>
              </div>
              <textarea
                :id="`card-back-${idx}`"
                v-model="card.back"
                class="text-area"
                rows="4"
                placeholder="Enter the answer or definition..."
                :aria-label="`Card ${idx + 1} back side`"
              ></textarea>
            </div>

            <!-- Card actions -->
            <div class="card-actions">
              <!-- Delete confirmation overlay -->
              <div v-if="showDeleteConfirm === idx" class="delete-confirm">
                <p class="delete-confirm__message">Delete this card?</p>
                <div class="delete-confirm__actions">
                  <BaseButton variant="ghost" size="xs" @click="cancelDelete">Cancel</BaseButton>
                  <BaseButton variant="danger" size="xs" @click="removeCard(idx)">
                    <Trash2 :size="14" />
                    Delete
                  </BaseButton>
                </div>
              </div>
              <!-- Delete button -->
              <BaseButton
                v-else
                variant="ghost"
                size="xs"
                @click="confirmDeleteCard(idx)"
                :aria-label="`Delete card ${idx + 1}`"
                class="card-actions__delete"
              >
                <Trash2 :size="14" />
                Delete
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* Toolbar */
.toolbar {
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.save-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}

.save-status--saved {
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.save-status--unsaved {
  color: var(--color-warning);
  background: rgba(251, 191, 36, 0.1);
}

.save-status--saving {
  color: var(--color-primary);
  background: rgba(102, 126, 234, 0.1);
}

.save-status__icon {
  flex-shrink: 0;
}

.save-status__icon--spinning {
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

.keyboard-hint {
  font-size: var(--font-size-xs);
  opacity: 0.7;
  margin-left: var(--space-2);
  font-weight: var(--font-weight-regular);
}

/* Loading skeleton */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-title {
  height: 60px;
  width: 100%;
  max-width: 400px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.skeleton-card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-line {
  height: 16px;
  width: 100%;
  border-radius: var(--radius-sm);
}

.skeleton-line--short {
  width: 60%;
}

/* Error state */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  gap: var(--space-4);
}

.error-state__icon {
  color: var(--color-danger);
  opacity: 0.8;
}

.error-state__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.error-state__message {
  color: var(--color-text-muted);
  margin: 0;
  max-width: 500px;
}

/* Main content */
.flashcards-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.title-section {
  padding: var(--space-5);
}

.title-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.text-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
  transition: all var(--transition-base);
}

.text-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.text-input::placeholder {
  color: var(--color-text-muted);
}

/* Cards section */
.cards-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.cards-header__info {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.cards-header__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.cards-header__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-regular);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-8);
  text-align: center;
  gap: var(--space-4);
  background: var(--color-surface-subtle);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-border);
}

.empty-state__icon {
  color: var(--color-text-muted);
  opacity: 0.6;
}

.empty-state__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.empty-state__message {
  color: var(--color-text-muted);
  margin: 0;
  max-width: 400px;
}

/* Cards grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--space-5);
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  transition: all var(--transition-base);
}

.card--confirming {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.2);
}

.card-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card-side__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-side__label-text {
  margin-right: var(--space-2);
}

.card-side__badge {
  display: inline-block;
  padding: 2px var(--space-2);
  background: var(--color-surface-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-muted);
}

.card-side__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.card__divider {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) 0;
}

.card__divider-line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.card__divider-icon {
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  opacity: 0.5;
}

.text-area {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  background: var(--color-surface);
  color: var(--color-text);
  transition: all var(--transition-base);
  line-height: var(--line-height-base);
}

.text-area:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.text-area::placeholder {
  color: var(--color-text-muted);
}

/* Card actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  position: relative;
}

.card-actions__delete {
  color: var(--color-danger);
}

.card-actions__delete:hover {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-danger);
}

.delete-confirm {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  border: 2px solid var(--color-danger);
  z-index: 10;
}

.delete-confirm__message {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.delete-confirm__actions {
  display: flex;
  gap: var(--space-2);
}

/* Responsive design */
@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .save-status {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
  }

  .cards-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .card {
    padding: var(--space-4);
  }

  .card-side__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .empty-state {
    padding: var(--space-12) var(--space-4);
  }
}

@media (max-width: 480px) {
  .keyboard-hint {
    display: none;
  }
}

/* Dark mode */
body.dark .skeleton {
  background: linear-gradient(90deg, #1f2a44 25%, #2a3441 50%, #1f2a44 75%);
  background-size: 200% 100%;
}

body.dark .text-input,
body.dark .text-area {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

body.dark .text-input:focus,
body.dark .text-area:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

body.dark .empty-state {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .card-side__badge {
  background: var(--color-surface-emphasis);
  color: var(--color-text-muted);
}

body.dark .delete-confirm {
  background: var(--color-surface);
  border-color: var(--color-danger);
}
</style>

