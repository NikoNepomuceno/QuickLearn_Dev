<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QuizConfirmationModal from '../components/QuizConfirmationModal.vue'
import QuizConfigModal from '../components/QuizConfigModal.vue'
import PageSelectionModal from '../components/PageSelectionModal.vue'
import GenerationTypeModal from '../components/GenerationTypeModal.vue'
import QuizModeModal from '../components/QuizModeModal.vue'
import SummarySuccessModal from '../components/SummarySuccessModal.vue'
import GenerationChoiceModal from '../components/GenerationChoiceModal.vue'
import AppShell from '@/components/layout/AppShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { downloadQuizAsPDF } from '../services/quizService'
import cloudQuizService from '../services/cloudQuizService'
import { Upload, FileText, X, Lightbulb, Target, Copy } from 'lucide-vue-next'
import { adaptiveApi } from '../features/adaptive'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const router = useRouter()
const selectedFile = ref(null)
const isLoading = ref(false)
const loadingMessage = ref('')
const errorMessage = ref('')
const quiz = ref(null)
const count = ref(10)
const selectedTypes = ref(['multiple_choice'])
const isDragOver = ref(false)
const showAnswers = ref({})
const progressPercent = ref(0)
const showConfirmationModal = ref(false)
const showConfigModal = ref(false)
const showPageSelectionModal = ref(false)
const showGenerationTypeModal = ref(false)
const showQuizModeModal = ref(false)
const showSummarySuccessModal = ref(false)
const showGenerationChoiceModal = ref(false)
const shareLink = ref('')
const showShareSuccess = ref(false)
const filePages = ref([])
const filePageCount = ref(0)
const selectedGenerationType = ref('')
const selectedQuizMode = ref('')
const customInstructions = ref('')
const generatedSummary = ref(null)
const latestSummary = ref(null)
const latestArtifact = computed(() => {
  if (quiz.value) {
    return { type: 'quiz', data: quiz.value }
  }
  if (latestSummary.value) {
    return { type: 'summary', data: latestSummary.value }
  }
  return null
})
let progressTimer = null
onMounted(() => {
  try {
    const url = new URL(window.location.href)
    const welcome = url.searchParams.get('welcome')
    if (welcome === 'new') {
      window.$toast?.success('Welcome to QuickLearn!')
    } else if (welcome === 'returning') {
      window.$toast?.success('Welcome back!')
    }
    if (welcome) {
      url.searchParams.delete('welcome')
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash)
    }
  } catch {}
})

const fileSize = computed(() => {
  if (!selectedFile.value) return null
  const size = selectedFile.value.size
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
})

const fileName = computed(() => {
  return selectedFile.value?.name || 'No file selected'
})

async function onFileChange(event) {
  const files = event.target.files
  selectedFile.value = files && files[0] ? files[0] : null
  errorMessage.value = ''
  if (selectedFile.value) {
    await handleFileUpload()
  }
}

function triggerFileInput() {
  if (selectedFile.value) {
    return
  }
  const fileInput = document.getElementById('file-input')
  if (fileInput) {
    fileInput.click()
  }
}

async function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    const file = files[0]
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ]
    if (allowedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|pptx|txt)$/i)) {
      selectedFile.value = file
      errorMessage.value = ''
      await handleFileUpload()
    } else {
      const message = 'Please upload a PDF, DOCX, PPTX, or TXT file.'
      errorMessage.value = message
      window.$toast?.error(message)
    }
  }
}

function onDragOver(event) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave(event) {
  event.preventDefault()
  isDragOver.value = false
}

function removeFile() {
  selectedFile.value = null
  errorMessage.value = ''
  filePages.value = []
  filePageCount.value = 0
  quiz.value = null
  latestSummary.value = null
  generatedSummary.value = null
  shareLink.value = ''
  showShareSuccess.value = false
}

async function handleFileUpload() {
  if (!selectedFile.value) return

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create quizzes')
    router.push('/login')
    return
  }

  loadingMessage.value = 'Analyzing your file…'
  isLoading.value = true
  startProgress()

  try {
    // Parse the file to get page information
    const parseResult = await cloudQuizService.parseFile(selectedFile.value)
    filePages.value = parseResult.pages || []
    filePageCount.value = parseResult.pageCount || 1

    // Show generation type selection modal
    showGenerationTypeModal.value = true
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to parse file.'
    window.$toast?.error(errorMessage.value)
  } finally {
    completeProgress()
    isLoading.value = false
  }
}

// function toggleAnswer(questionIndex) {
//   showAnswers.value[questionIndex] = !showAnswers.value[questionIndex]
// }

// function openConfig() {
//   if (!selectedFile.value) {
//     const message = 'Please choose a .txt, .pdf, or .docx file.'
//     errorMessage.value = message
//     window.$toast?.error(message)
//     return
//   }
//   showConfigModal.value = true
// }

async function uploadFile(options = {}) {
  errorMessage.value = ''
  quiz.value = null
  showAnswers.value = {}

  if (!selectedFile.value) {
    const message = 'Please choose a .txt, .pdf, or .docx file.'
    errorMessage.value = message
    window.$toast?.error(message)
    return
  }

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create quizzes')
    router.push('/login')
    return
  }

  // Quiz generation loading text
  loadingMessage.value = 'Analyzing your file and generating questions…'
  isLoading.value = true
  startProgress()
  try {
    const pageSelectionData = window.pageSelectionData || {}
    const quizOptions = {
      count: options.count || count.value,
      difficulty: options.difficulty || 'medium',
      types: options.type || 'multiple_choice',
      focus: options.focus || '',
      isAdvanced: options.isAdvanced || false,
      includeReasoning: options.includeReasoning !== false,
      customInstructions: options.customInstructions || '',
      selectedPages: options.selectedPages || [],
      quizMode: pageSelectionData.quizMode || 'quicklearn',
    }

    const result = await cloudQuizService.createQuizFromFile(selectedFile.value, quizOptions)
    quiz.value = result.quiz || null

    // Show confirmation modal after successful quiz generation
    if (quiz.value) {
      showConfirmationModal.value = true
    }
  } catch (err) {
    errorMessage.value = err?.message || 'Upload failed.'
    window.$toast?.error(errorMessage.value)
  } finally {
    completeProgress()
    isLoading.value = false
  }
}

// function goHome() {}

function startProgress() {
  progressPercent.value = 0
  clearInterval(progressTimer)
  // Ease towards 90% while loading
  progressTimer = setInterval(() => {
    if (progressPercent.value < 90) {
      const delta = Math.max(0.5, (90 - progressPercent.value) * 0.06)
      progressPercent.value = Math.min(90, +(progressPercent.value + delta).toFixed(1))
    }
  }, 120)
}

function completeProgress() {
  clearInterval(progressTimer)
  progressPercent.value = 100
  // Reset after a short delay so bar can finish animating
  setTimeout(() => {
    progressPercent.value = 0
  }, 500)
}

// Modal event handlers
function handleTakeQuiz() {
  // Store quiz in localStorage for the quiz page
  localStorage.setItem('currentQuiz', JSON.stringify(quiz.value))
  showConfirmationModal.value = false
  if (quiz.value?.id) {
    router.push({ name: 'quiz', params: { quizId: quiz.value.id } })
  } else {
    window.$toast?.error('Quiz ID missing; please try again')
  }
}

function handleDownloadQuiz() {
  if (quiz.value) {
    downloadQuizAsPDF(quiz.value)
    window.$toast?.success('PDF download started')
  }
}

function handleShareQuiz() {
  if (quiz.value) {
    shareLink.value = cloudQuizService.generateShareableLink(quiz.value)
    showShareSuccess.value = true
    window.$toast?.success('Share link generated')

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      showShareSuccess.value = false
    }, 3000)
  }
}

function handleCloseModal() {
  showConfirmationModal.value = false
}

// Config modal handlers
function handleConfigCancel() {
  showConfigModal.value = false
}

function handleConfigConfirm(payload) {
  showConfigModal.value = false
  // update local count so UI reflects selection
  if (typeof payload?.count === 'number') count.value = payload.count
  // Normalize type payload from modal
  // payload.type can be 'mixed' or comma-separated list
  let typesParam = 'multiple_choice'
  if (payload?.type === 'mixed') {
    selectedTypes.value = ['multiple_choice', 'true_false', 'identification', 'enumeration']
    typesParam = 'mixed'
  } else if (typeof payload?.type === 'string' && payload.type.length > 0) {
    const arr = payload.type
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    selectedTypes.value = arr.length ? arr : ['multiple_choice']
    typesParam = arr.join(',')
  }

  // Include page selection data if available
  const pageSelectionData = window.pageSelectionData || {}
  const finalPayload = {
    ...payload,
    type: typesParam,
    selectedPages: pageSelectionData.selectedPages || [],
    customInstructions: pageSelectionData.customPrompt || payload.customInstructions || ''
  }

  // Clear the stored page selection data
  delete window.pageSelectionData

  uploadFile(finalPayload)
}

function copyShareLink() {
  if (shareLink.value) {
    cloudQuizService
      .copyToClipboard(shareLink.value)
      .then(() => {
        // You could show a toast notification here
        console.log('Link copied to clipboard!')
      })
      .catch((err) => {
        console.error('Failed to copy link:', err)
      })
  }
}

// Generation type modal handlers
function handleGenerationTypeCancel() {
  showGenerationTypeModal.value = false
  selectedGenerationType.value = ''
  customInstructions.value = ''
}

// Quiz mode modal handlers
function handleQuizModeCancel() {
  showQuizModeModal.value = false
  selectedQuizMode.value = ''
}

function handleQuizModeConfirm(payload) {
  showQuizModeModal.value = false
  selectedQuizMode.value = payload.mode

  // Show page selection modal after mode selection
  showPageSelectionModal.value = true
}

function handleGenerationTypeConfirm(payload) {
  showGenerationTypeModal.value = false
  selectedGenerationType.value = payload.type
  customInstructions.value = payload.customInstructions

  if (payload.type === 'quiz') {
    // Show quiz mode selection modal first
    showQuizModeModal.value = true
  } else if (payload.type === 'summary') {
    // Show page selection modal directly for summaries
    showPageSelectionModal.value = true
  }
}

// Page selection modal handlers
function handlePageSelectionCancel() {
  showPageSelectionModal.value = false
}

function handlePageSelectionConfirm(payload) {
  showPageSelectionModal.value = false

  // Store the page selection data for later use
  window.pageSelectionData = {
    selectedPages: payload.selectedPages,
    customInstructions: customInstructions.value,
    generationType: selectedGenerationType.value,
    quizMode: selectedQuizMode.value
  }

  if (selectedGenerationType.value === 'quiz') {
    // Check if adaptive mode is selected
    if (selectedQuizMode.value === 'adaptive') {
      // Start adaptive session
      startAdaptiveSession()
    } else {
      // Show config modal for standard quiz generation
      showConfigModal.value = true
    }
  } else if (selectedGenerationType.value === 'summary') {
    // Open choice modal to select Summary Notes or Flashcards
    showGenerationChoiceModal.value = true
  }
}

// Start an adaptive quiz session
async function startAdaptiveSession() {
  if (!selectedFile.value) {
    const message = 'Please choose a file first.'
    errorMessage.value = message
    window.$toast?.error(message)
    return
  }

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create adaptive quizzes')
    router.push('/login')
    return
  }

  loadingMessage.value = 'Starting adaptive session…'
  isLoading.value = true
  startProgress()

  try {
    const pageSelectionData = window.pageSelectionData || {}
    const options = {
      selectedPages: pageSelectionData.selectedPages || [],
      customInstructions: pageSelectionData.customInstructions || customInstructions.value,
      maxQuestions: 20 // Default max questions for adaptive mode
    }

    const result = await adaptiveApi.createSession(selectedFile.value, options)

    // Clear the stored page selection data
    delete window.pageSelectionData

    // Navigate to adaptive quiz session
    router.push(`/adaptive/${result.sessionId}`)
    window.$toast?.success('Adaptive session started!')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to start adaptive session.'
    window.$toast?.error(errorMessage.value)
  } finally {
    completeProgress()
    isLoading.value = false
  }
}

// Summary generation function
async function generateSummary() {
  errorMessage.value = ''
  quiz.value = null
  showAnswers.value = {}

  if (!selectedFile.value) {
    const message = 'Please choose a .txt, .pdf, or .docx file.'
    errorMessage.value = message
    window.$toast?.error(message)
    return
  }

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create summaries')
    router.push('/login')
    return
  }

  // Summary generation loading text
  loadingMessage.value = 'Generating your summary…'
  isLoading.value = true
  startProgress()

  try {
    const pageSelectionData = window.pageSelectionData || {}
    const summaryOptions = {
      customInstructions: pageSelectionData.customInstructions || customInstructions.value,
      selectedPages: pageSelectionData.selectedPages || []
    }

    const result = await cloudQuizService.createSummaryFromFile(selectedFile.value, summaryOptions)

    // Store the generated summary
    generatedSummary.value = result.summary
    latestSummary.value = result.summary

    // Clear the stored page selection data
    delete window.pageSelectionData

    // Show success modal
    showSummarySuccessModal.value = true
  } catch (err) {
    errorMessage.value = err?.message || 'Summary generation failed.'
    window.$toast?.error(errorMessage.value)
  } finally {
    completeProgress()
    isLoading.value = false
  }
}

// Flashcards generation function
async function generateFlashcards() {
  errorMessage.value = ''
  quiz.value = null
  showAnswers.value = {}

  if (!selectedFile.value) {
    const message = 'Please choose a .txt, .pdf, or .docx file.'
    errorMessage.value = message
    window.$toast?.error(message)
    return
  }

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create flashcards')
    router.push('/login')
    return
  }

  // Flashcards generation loading text
  loadingMessage.value = 'Generating your flashcards…'
  isLoading.value = true
  startProgress()

  try {
    const pageSelectionData = window.pageSelectionData || {}
    const options = {
      customInstructions: pageSelectionData.customInstructions || customInstructions.value,
      selectedPages: pageSelectionData.selectedPages || []
    }

    const result = await cloudQuizService.createFlashcardsFromFile(selectedFile.value, options)
    // Expect { flashcards: { id, title, cards: [...] } }
    const fc = result.flashcards
    if (!fc?.id) {
      throw new Error('Flashcards generation did not return an id')
    }

    // Clear the stored page selection data
    delete window.pageSelectionData

    // Navigate to flashcards page
    router.push(`/flashcards/${fc.id}`)
    window.$toast?.success('Flashcards generated!')
  } catch (err) {
    errorMessage.value = err?.message || 'Flashcards generation failed.'
    window.$toast?.error(errorMessage.value)
  } finally {
    completeProgress()
    isLoading.value = false
  }
}

// Summary success modal handlers
function handleSummarySuccessClose() {
  showSummarySuccessModal.value = false
  generatedSummary.value = null
}

function reopenSummaryModal() {
  if (!latestSummary.value) return
  generatedSummary.value = latestSummary.value
  showSummarySuccessModal.value = true
}

function buildSummaryContent(summary) {
  if (!summary) return ''
  let content = ''
  if (summary.title) {
    content += `# ${summary.title}\n\n`
  }
  if (summary.description) {
    content += `${summary.description}\n\n`
  }
  if (Array.isArray(summary.keyPoints) && summary.keyPoints.length) {
    content += '## Key Points\n\n'
    summary.keyPoints.forEach((point, index) => {
      content += `${index + 1}. ${point}\n`
    })
    content += '\n'
  }
  if (Array.isArray(summary.sections) && summary.sections.length) {
    summary.sections.forEach((section) => {
      if (section.title) {
        content += `## ${section.title}\n\n`
      }
      if (section.content) {
        content += `${section.content}\n\n`
      }
      if (Array.isArray(section.subpoints) && section.subpoints.length) {
        section.subpoints.forEach((subpoint) => {
          content += `• ${subpoint}\n`
        })
        content += '\n'
      }
    })
  }
  if (Array.isArray(summary.conclusions) && summary.conclusions.length) {
    content += '## Key Takeaways\n\n'
    summary.conclusions.forEach((conclusion, index) => {
      content += `${index + 1}. ${conclusion}\n`
    })
  }
  return content.trim()
}

async function copyLatestSummary() {
  if (!latestSummary.value) return
  try {
    const content = buildSummaryContent(latestSummary.value)
    await cloudQuizService.copyToClipboard(content)
    window.$toast?.success('Summary copied to clipboard')
  } catch (error) {
    console.error('Failed to copy summary text', error)
    window.$toast?.error('Unable to copy summary')
  }
}

// Generation choice modal handlers
function handleGenerationChoiceClose() {
  showGenerationChoiceModal.value = false
}

function handleGenerationChoiceSelect(option) {
  showGenerationChoiceModal.value = false
  if (option === 'summary') {
    generateSummary()
  } else if (option === 'flashcards') {
    generateFlashcards()
  }
}
</script>

<template>
  <AppShell
    title="Generate a quiz from your file"
    subtitle="Upload a PDF, DOCX, PPTX, or TXT and let QuickLearn craft tailored practice materials."
    content-width="wide"
  >
    <div class="upload-toolbar">
      <BaseButton variant="secondary" size="sm" @click="router.push('/my-quizzes')">
        View my quizzes
      </BaseButton>
    </div>

    <div class="upload-grid">
      <div class="upload-grid__main">
        <BaseCard padding="lg" elevated class="dropzone-card">
          <div class="dropzone-card__header">
            <div class="dropzone-badge">
              <Target :size="16" />
              Smart upload
            </div>
            <p class="dropzone-card__subtitle">
              QuickLearn parses your document, lets you pick pages, then generates quizzes or summaries in one flow.
            </p>
          </div>

          <div
            class="dropzone"
            :class="{
              'dropzone--dragging': isDragOver,
              'dropzone--ready': selectedFile
            }"
            @drop.prevent="onDrop"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @click="triggerFileInput"
          >
            <div v-if="!selectedFile" class="dropzone__content">
              <Upload :size="56" class="dropzone__icon" />
              <p class="dropzone__title">Drag & drop your file here</p>
              <p class="dropzone__subtitle">
                or
                <button type="button" class="dropzone__browse" @click.stop="triggerFileInput">
                  browse to upload
                </button>
              </p>
              <input
                id="file-input"
                type="file"
                hidden
                accept=".txt,.pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                @change="onFileChange"
              />
              <div class="chip-list">
                <span class="chip">PDF</span>
                <span class="chip">DOCX</span>
                <span class="chip">PPTX</span>
                <span class="chip">TXT</span>
              </div>
              <p class="dropzone__hint">Maximum file size: 10MB</p>
            </div>

            <div v-else class="dropzone__selected">
              <div class="dropzone__file">
                <FileText :size="18" />
                <div>
                  <p class="dropzone__file-name">{{ fileName }}</p>
                  <p class="dropzone__file-meta">{{ fileSize }}</p>
                </div>
              </div>
              <BaseButton
                variant="outline"
                size="sm"
                class="dropzone__remove"
                type="button"
                @click.stop="removeFile"
              >
                <X :size="16" />
                Remove file
              </BaseButton>
            </div>
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        </BaseCard>

        <BaseCard padding="lg">
          <div class="section-header">
            <Lightbulb :size="20" />
            <h2 class="section-header__title">Tips for better results</h2>
          </div>
          <ul class="tip-list">
            <li>Use clear, well-structured documents with headings and consistent formatting.</li>
            <li>Prefer editable text instead of scanned images whenever possible.</li>
            <li>Keep files under 10MB to speed up processing and improve page previews.</li>
            <li>Select only the pages you need to generate focused quizzes or summaries.</li>
          </ul>
        </BaseCard>
      </div>

      <div class="upload-grid__side">
        <BaseCard v-if="latestArtifact" padding="lg" class="outcome-card">
          <div class="outcome-card__header">
            <span class="outcome-badge" :class="`outcome-badge--${latestArtifact.type}`">
              {{ latestArtifact.type === 'quiz' ? 'Quiz ready' : 'Summary ready' }}
            </span>
          </div>

          <div v-if="latestArtifact.type === 'quiz'" class="outcome-card__body">
            <h3 class="outcome-card__title">
              {{ latestArtifact.data?.title || 'Generated quiz' }}
            </h3>
            <p class="outcome-card__meta">
              {{ latestArtifact.data?.questions?.length || 0 }} questions
              <span
                v-if="latestArtifact.data?.questionTypes?.length"
              >
                • {{ latestArtifact.data.questionTypes.length }} question types
              </span>
            </p>
            <div class="outcome-card__actions">
              <BaseButton size="sm" variant="primary" @click="handleTakeQuiz">
                Take quiz
              </BaseButton>
              <BaseButton size="sm" variant="secondary" @click="handleDownloadQuiz">
                Download PDF
              </BaseButton>
              <BaseButton size="sm" variant="outline" @click="handleShareQuiz">
                Share link
              </BaseButton>
            </div>
          </div>

          <div v-else class="outcome-card__body">
            <h3 class="outcome-card__title">
              {{ latestArtifact.data?.title || 'Summary ready' }}
            </h3>
            <p class="outcome-card__meta">
              {{ latestArtifact.data?.keyPoints?.length || 0 }} key points •
              {{ latestArtifact.data?.sections?.length || 0 }} sections
            </p>
            <div class="outcome-card__actions">
              <BaseButton size="sm" variant="primary" @click="reopenSummaryModal">
                View summary
              </BaseButton>
              <BaseButton size="sm" variant="outline" @click="copyLatestSummary">
                Copy text
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <BaseCard padding="lg">
          <h2 class="section-header__title">Supported formats</h2>
          <div class="format-list">
            <div class="format-item">
              <img src="/img/file.png" alt="PDF" />
              <div>
                <p class="format-item__name">PDF</p>
                <p class="format-item__meta">Textbooks, research papers, handouts</p>
              </div>
            </div>
            <div class="format-item">
              <img src="/img/docx.png" alt="DOCX" />
              <div>
                <p class="format-item__name">DOCX</p>
                <p class="format-item__meta">Notes, study guides, assignments</p>
              </div>
            </div>
            <div class="format-item">
              <img src="/img/pptx.png" alt="PPTX" />
              <div>
                <p class="format-item__name">PPTX</p>
                <p class="format-item__meta">Lecture slides, presentations</p>
              </div>
            </div>
            <div class="format-item">
              <img src="/img/txt-file.png" alt="TXT" />
              <div>
                <p class="format-item__name">TXT</p>
                <p class="format-item__meta">Plain notes, outlines, transcripts</p>
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard padding="lg">
          <h2 class="section-header__title">How it works</h2>
          <ol class="step-list">
            <li>
              <span class="step__number">1</span>
              <div>
                <p class="step__title">Upload your content</p>
                <p class="step__description">Drag a file or browse from your device to get started.</p>
              </div>
            </li>
            <li>
              <span class="step__number">2</span>
              <div>
                <p class="step__title">Choose a generation mode</p>
                <p class="step__description">Select quizzes, summaries, or adaptive practice tailored to your needs.</p>
              </div>
            </li>
            <li>
              <span class="step__number">3</span>
              <div>
                <p class="step__title">Review and share</p>
                <p class="step__description">Download, share, or launch quizzes instantly with one click.</p>
              </div>
            </li>
          </ol>
        </BaseCard>
      </div>
    </div>

    <div v-if="showShareSuccess" class="share-banner">
      <div class="share-banner__content">
        <h3>Shareable link generated</h3>
        <p>Your quiz has been saved. Copy the link to share it instantly.</p>
        <div class="share-banner__actions">
          <input type="text" :value="shareLink" readonly class="share-banner__input" />
          <BaseButton variant="secondary" size="sm" @click="copyShareLink">
            <Copy :size="16" />
            Copy link
          </BaseButton>
        </div>
      </div>
      <button type="button" class="share-banner__close" @click="showShareSuccess = false">
        <X :size="16" />
      </button>
    </div>

    <GenerationTypeModal
      :visible="showGenerationTypeModal"
      :file-name="fileName"
      @close="handleGenerationTypeCancel"
      @confirm="handleGenerationTypeConfirm"
    />

    <QuizModeModal
      :visible="showQuizModeModal"
      :file-name="fileName"
      @close="handleQuizModeCancel"
      @confirm="handleQuizModeConfirm"
    />

    <PageSelectionModal
      :visible="showPageSelectionModal"
      :file-name="fileName"
      :pages="filePages"
      @close="handlePageSelectionCancel"
      @confirm="handlePageSelectionConfirm"
    />

    <QuizConfigModal
      :visible="showConfigModal"
      :file-name="fileName"
      :default-count="count"
      @close="handleConfigCancel"
      @confirm="handleConfigConfirm"
    />

    <QuizConfirmationModal
      :quiz="quiz"
      :is-visible="showConfirmationModal"
      @close="handleCloseModal"
      @take-quiz="handleTakeQuiz"
      @download-quiz="handleDownloadQuiz"
      @share-quiz="handleShareQuiz"
    />

    <GenerationChoiceModal
      :visible="showGenerationChoiceModal"
      :file-name="fileName"
      @close="handleGenerationChoiceClose"
      @select="handleGenerationChoiceSelect"
    />

    <SummarySuccessModal
      :visible="showSummarySuccessModal"
      :summary="generatedSummary"
      @close="handleSummarySuccessClose"
    />

    <!-- Loading Overlay with Lottie Animation -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <DotLottieVue
          src="https://lottie.host/f7efbef6-2888-49ad-8688-2dbe7735a5ad/yA3Du1fYA3.lottie"
          style="width: 300px; height: 300px"
          autoplay
          loop
        />
        <p v-if="loadingMessage" class="loading-text">
          {{ loadingMessage || 'Analyzing your file and generating questions…' }}
        </p>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.upload-grid {
  display: grid;
  gap: var(--space-6);
}

.upload-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 0 0 var(--space-6);
}

@media (min-width: 1100px) {
  .upload-grid {
    grid-template-columns: 2fr 1fr;
    align-items: start;
  }
}

.upload-grid__main {
  display: grid;
  gap: var(--space-5);
}

.upload-grid__side {
  display: grid;
  gap: var(--space-5);
}

.outcome-card {
  display: grid;
  gap: var(--space-3);
}

.outcome-card__header {
  display: flex;
  justify-content: flex-start;
}

.outcome-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}

.outcome-badge--summary {
  background: linear-gradient(135deg, var(--color-success), #34d399);
}

.outcome-card__body {
  display: grid;
  gap: var(--space-3);
}

.outcome-card__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.outcome-card__meta {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.outcome-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.dropzone-card__header {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.dropzone-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid rgba(102, 126, 234, 0.25);
  background: var(--color-surface-emphasis);
  color: var(--color-primary);
}

.dropzone-card__subtitle {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: clamp(2.5rem, 4vw, 3rem);
  background: var(--color-surface-subtle);
  text-align: center;
  display: grid;
  gap: var(--space-4);
  justify-items: center;
  width: min(100%, 540px);
  margin-inline: auto;
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
}

.dropzone--dragging {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.12);
  background: rgba(102, 126, 234, 0.08);
}

.dropzone--ready {
  background: var(--color-surface);
  border-style: solid;
}

.dropzone__icon {
  color: var(--color-primary);
}

.dropzone__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.dropzone__subtitle {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.dropzone__browse {
  border: none;
  background: none;
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.dropzone__browse:hover {
  color: var(--color-primary-dark);
}

.chip-list {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.chip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-surface-emphasis);
  border: 1px solid rgba(102, 126, 234, 0.25);
  color: var(--color-primary);
}

.dropzone__hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-soft);
}

.dropzone__selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.dropzone__file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text);
}

.dropzone__file-name {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}

.dropzone__file-meta {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dropzone__remove {
  margin-left: auto;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.section-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.tip-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
}

.format-list {
  display: grid;
  gap: var(--space-3);
}

.format-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.format-item img {
  width: 32px;
  height: 32px;
}

.format-item__name {
  margin: 0;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.format-item__meta {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-4);
}

.step-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.step__number {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  background: rgba(102, 126, 234, 0.12);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.step__title {
  margin: 0;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.step__description {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.share-banner {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  width: min(420px, 90vw);
}

.share-banner__content {
  display: grid;
  gap: var(--space-2);
}

.share-banner__actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.share-banner__input {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.share-banner__close {
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--space-1);
}

.form-error {
  margin: var(--space-4) 0 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  text-align: center;
}

@media (max-width: 768px) {
  .share-banner {
    right: var(--space-4);
    left: var(--space-4);
    bottom: var(--space-4);
    width: auto;
  }

  .share-banner__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .share-banner__input {
    width: 100%;
  }
}

body.dark .outcome-card__title {
  color: var(--color-text);
}

body.dark .outcome-card__meta {
  color: var(--color-text-muted);
}

body.dark .dropzone {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
}

body.dark .share-banner {
  background: var(--color-surface);
  border-color: var(--color-border);
}

body.dark .share-banner__input {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
  color: var(--color-text);
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.loading-content {
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.loading-text {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  max-width: 400px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Dark mode for loading overlay */
body.dark .loading-overlay {
  background: rgba(15, 23, 42, 0.9);
}

body.dark .loading-text {
  color: #e2e8f0;
}
</style>
