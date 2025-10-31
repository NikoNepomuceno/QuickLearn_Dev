<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QuizConfirmationModal from '../components/QuizConfirmationModal.vue'
import QuizConfigModal from '../components/QuizConfigModal.vue'
import PageSelectionModal from '../components/PageSelectionModal.vue'
import GenerationTypeModal from '../components/GenerationTypeModal.vue'
import SummarySuccessModal from '../components/SummarySuccessModal.vue'
import Sidebar from '../components/Sidebar.vue'
import { downloadQuizAsPDF } from '../services/quizService'
import cloudQuizService from '../services/cloudQuizService'
import { Upload, FileText, X, Lightbulb, Target, Copy } from 'lucide-vue-next'

const router = useRouter()
const selectedFile = ref(null)
const isLoading = ref(false)
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
const showSummarySuccessModal = ref(false)
const shareLink = ref('')
const showShareSuccess = ref(false)
const filePages = ref([])
const filePageCount = ref(0)
const selectedGenerationType = ref('')
const customInstructions = ref('')
const generatedSummary = ref(null)
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
  // Don't trigger file input if a file is already selected
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
}

async function handleFileUpload() {
  if (!selectedFile.value) return

  // Check if user is authenticated
  if (!(await cloudQuizService.isAuthenticated())) {
    window.$toast?.error('Please log in to create quizzes')
    router.push('/login')
    return
  }

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

  isLoading.value = true
  startProgress()
  try {
    const quizOptions = {
      count: options.count || count.value,
      difficulty: options.difficulty || 'medium',
      types: options.type || 'multiple_choice',
      focus: options.focus || '',
      isAdvanced: options.isAdvanced || false,
      includeReasoning: options.includeReasoning !== false,
      customInstructions: options.customInstructions || '',
      selectedPages: options.selectedPages || [],
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

function handleGenerationTypeConfirm(payload) {
  showGenerationTypeModal.value = false
  selectedGenerationType.value = payload.type
  customInstructions.value = payload.customInstructions
  
  // Show page selection modal
  showPageSelectionModal.value = true
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
    generationType: selectedGenerationType.value
  }
  
  if (selectedGenerationType.value === 'quiz') {
    // Show config modal for quiz generation
    showConfigModal.value = true
  } else if (selectedGenerationType.value === 'summary') {
    // Generate summary directly
    generateSummary()
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

// Summary success modal handlers
function handleSummarySuccessClose() {
  showSummarySuccessModal.value = false
  generatedSummary.value = null
}
</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="upload-page">
      <div class="header">
        <div class="eyebrow">
          <Target :size="16" />
          Smart Upload
        </div>
        <h1>Generate a Quiz from Your File</h1>
        <p class="subtitle">
          Upload a PDF, DOCX, PPTX, or TXT and let QuickLearn create high-quality questions.
        </p>
      </div>
      <div class="content-layout">
        <!-- Left Column -->
        <div class="left-column">
          <div class="panel upload-panel">
            <div class="progress" v-show="isLoading || progressPercent > 0">
              <div class="bar" :style="{ width: progressPercent + '%' }"></div>
            </div>

            <div
              class="dropzone"
              :class="{ over: isDragOver, ready: selectedFile }"
              @drop="onDrop"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @click="triggerFileInput"
            >
              <div class="dropzone-inner">
                <div class="upload-icon">
                  <Upload :size="48" />
                </div>
                <div class="dz-text" v-if="!selectedFile">
                  <div class="headline">Drop your files here</div>
                  <div class="subline">
                    or <label for="file-input" class="browse">browse to upload</label>
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    accept=".txt,.pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                    @change="onFileChange"
                    hidden
                  />
                  <div class="chips">
                    <span class="chip">PDF</span>
                    <span class="chip">DOCX</span>
                    <span class="chip">PPTX</span>
                    <span class="chip">TXT</span>
                  </div>
                  <div class="hint">Maximum file size: 10MB</div>
                </div>
                <div class="dz-selected" v-else>
                  <div class="selected-top">
                    <FileText class="file-icon" :size="20" />
                    <div class="selected-name">{{ fileName }}</div>
                    <button class="remove" @click="removeFile" aria-label="Remove file">
                      <X :size="16" />
                    </button>
                  </div>
                  <div class="selected-meta">{{ fileSize }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tips for Better Results Section (moved to left column) -->
          <div class="panel tips-panel">
            <h3>
              <Lightbulb :size="20" />
              Tips for Better Results
            </h3>
            <div class="tips-grid">
              <div class="tip">
                <span class="tip-check">✓</span>
                <span>Use clear, well-structured documents</span>
              </div>
              <div class="tip">
                <span class="tip-check">✓</span>
                <span>Include headings and subheadings</span>
              </div>
              <div class="tip">
                <span class="tip-check">✓</span>
                <span>Ensure text is readable and not scanned images</span>
              </div>
              <div class="tip">
                <span class="tip-check">✓</span>
                <span>Keep files under 10MB for faster processing</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="right-column">
          <!-- Supported Formats Section -->
          <div class="panel formats-panel">
            <h3>Supported Formats</h3>
            <div class="formats-grid">
              <div class="format-card">
                <div class="format-icon">
                  <img src="/img/file.png" alt="PDF" />
                </div>
                <div class="format-info">
                  <div class="format-tag">PDF</div>
                  <div class="format-name">Portable Document Format</div>
                  <div class="format-examples">Textbooks, research papers, lecture slides</div>
                </div>
              </div>
              <div class="format-card">
                <div class="format-icon">
                  <img src="/img/docx.png" alt="DOCX" />
                </div>
                <div class="format-info">
                  <div class="format-tag">DOCX</div>
                  <div class="format-name">Microsoft Word Document</div>
                  <div class="format-examples">Notes, essays, study guides</div>
                </div>
              </div>
              <div class="format-card">
                <div class="format-icon">
                  <img src="/img/txt-file.png" alt="TXT" />
                </div>
                <div class="format-info">
                  <div class="format-tag">TXT</div>
                  <div class="format-name">Plain Text File</div>
                  <div class="format-examples">Simple notes, code snippets, lists</div>
                </div>
              </div>
              <div class="format-card">
                <div class="format-icon">
                  <img src="/img/pptx.png" alt="PPTX" />
                </div>
                <div class="format-info">
                  <div class="format-tag">PPTX</div>
                  <div class="format-name">PowerPoint</div>
                  <div class="format-examples">Presentations, slides, visual content</div>
                </div>
              </div>
            </div>
          </div>

          <!-- How It Works Section -->
          <div class="panel process-panel">
            <h3>How It Works</h3>
            <div class="process-steps">
              <div class="process-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <div class="step-title">Upload Your Files</div>
                  <div class="step-description">Drag and drop or browse to select your study materials</div>
                </div>
              </div>
              <div class="process-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <div class="step-title">Processing</div>
                  <div class="step-description">Our AI analyzes your content and extracts key information</div>
                </div>
              </div>
              <div class="process-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <div class="step-title">Generate Quizzes</div>
                  <div class="step-description">Create custom quizzes in multiple formats from your content</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generation Type Modal -->
      <GenerationTypeModal
        :visible="showGenerationTypeModal"
        :file-name="fileName"
        @close="handleGenerationTypeCancel"
        @confirm="handleGenerationTypeConfirm"
      />

      <!-- Page Selection Modal -->
      <PageSelectionModal
        :visible="showPageSelectionModal"
        :file-name="fileName"
        :pages="filePages"
        @close="handlePageSelectionCancel"
        @confirm="handlePageSelectionConfirm"
      />

      <!-- Configuration Modal -->
      <QuizConfigModal
        :visible="showConfigModal"
        :file-name="fileName"
        :default-count="count"
        @close="handleConfigCancel"
        @confirm="handleConfigConfirm"
      />

      <!-- Confirmation Modal -->
      <QuizConfirmationModal
        :quiz="quiz"
        :is-visible="showConfirmationModal"
        @close="handleCloseModal"
        @take-quiz="handleTakeQuiz"
        @download-quiz="handleDownloadQuiz"
        @share-quiz="handleShareQuiz"
      />

      <!-- Summary Success Modal -->
      <SummarySuccessModal
        :visible="showSummarySuccessModal"
        :summary="generatedSummary"
        @close="handleSummarySuccessClose"
      />

      <!-- Share Success Message -->
      <div v-if="showShareSuccess" class="share-success">
        <div class="share-success-content">
          <h3>🔗 Shareable Link Generated!</h3>
          <p>Your quiz has been saved and can be shared with this link:</p>
          <div class="share-link-container">
            <input type="text" :value="shareLink" readonly class="share-link-input" />
            <button class="copy-btn" @click="copyShareLink">
              <Copy :size="16" />
              Copy
            </button>
          </div>
          <button class="close-success" @click="showShareSuccess = false">✕</button>
        </div>
      </div>
    </div>

    <!-- Full-page loading overlay -->
    <BeatLoader 
      v-if="isLoading"
      :loading="isLoading" 
      text="Analyzing your file and generating questions…" 
      color="#667eea"
      size="20px"
      :overlay="true"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.upload-page {
  flex: 1;
  margin: 0;
  padding: 24px;
  background:
    radial-gradient(1000px 600px at 20% -10%, rgba(102, 126, 234, 0.12), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118, 75, 162, 0.1), transparent 60%);
}

@media (max-width: 1024px) {
  .upload-page {
    padding-bottom: 120px; /* Add space for floating sidebar */
  }
}

@media (max-width: 768px) {
  .upload-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  .header h1 {
    font-size: 24px;
  }

  .subtitle {
    font-size: 14px;
  }

  .dropzone {
    min-height: 300px;
  }

  .panel {
    padding: 16px;
  }

  .tips-grid {
    gap: 8px;
  }

  .tip {
    padding: 10px;
    font-size: 14px;
  }

  .format-card {
    padding: 10px;
  }

  .process-step {
    padding: 12px;
    gap: 12px;
  }

  .step-number {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .upload-page {
    padding: 12px;
    padding-bottom: 80px;
  }

  .header h1 {
    font-size: 20px;
  }

  .dropzone {
    min-height: 250px;
  }

  .headline {
    font-size: 16px;
  }

  .subline {
    font-size: 14px;
  }
}

.content-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.header {
  margin-bottom: 16px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4b53c5;
  background: linear-gradient(135deg, #eef0ff, #f6f0ff);
  border: 1px solid #e5e7ff;
  padding: 6px 12px;
  border-radius: 999px;
}
.header h1 {
  margin: 8px 0 6px;
  font-size: 28px;
}
.subtitle {
  color: #5b6472;
}

.tips-panel {
  margin-top: 16px;
}

.panel {
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 10px 25px rgba(50, 50, 93, 0.05),
    0 6px 12px rgba(0, 0, 0, 0.04);
}

.upload-panel {
  position: relative;
}

.progress {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 16px;
  height: 6px;
  background: #eef0ff;
  border-radius: 999px;
  overflow: hidden;
}

.progress .bar {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 0%;
  transition: width 0.2s ease;
}

.dropzone {
  border: 2px dashed #c8cdd6;
  border-radius: 12px;
  min-height: clamp(480px, 20vh, 900px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbff;
  transition: all 0.25s ease;
  position: relative;
  width: 100%;
  cursor: pointer;
}

.dropzone.over {
  border-color: #667eea;
  background: #f0f3ff;
  box-shadow:
    0 0 0 6px rgba(102, 126, 234, 0.08),
    0 8px 24px rgba(102, 126, 234, 0.18);
}

.dropzone.ready {
  background: #f8faff;
}

.dropzone-inner {
  text-align: center;
  padding: 16px;
}

.upload-icon {
  color: #667eea;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.browse {
  color: #5562ea;
  text-decoration: underline;
  cursor: pointer;
}

.headline {
  font-weight: 700;
  font-size: 18px;
}
.subline {
  color: #5b6472;
  margin-top: 2px;
}
.chips {
  margin-top: 10px;
  display: flex;
  gap: 6px;
  justify-content: center;
}
.chip {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef0ff;
  color: #4b53c5;
  border: 1px solid #e6e8ec;
}
.hint {
  color: #7a8494;
  margin-top: 6px;
  font-size: 13px;
}

.dz-selected .selected-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.file-icon {
  color: #667eea;
  flex-shrink: 0;
}

.selected-name {
  font-weight: 600;
  flex: 1;
}

.selected-meta {
  color: #7a8494;
  margin-top: 6px;
  font-size: 13px;
}

.remove {
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.remove:hover {
  background: #fecaca;
  transform: scale(1.05);
}

/* controls removed in new layout */

.primary {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(102, 126, 234, 0.35);
}

.primary:active {
  transform: translateY(0);
  filter: brightness(0.98);
}

.link {
  background: none;
  border: none;
  color: #5562ea;
  padding: 0;
  cursor: pointer;
}

.error {
  color: #b00020;
  margin-top: 10px;
}

/* Loading styles removed - now using full-page overlay */

/* BeatLoader handles its own styling */

/* results/sidebar sections removed */

.tips-panel h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: #1f2937;
}

/* Formats Panel Styles */
.formats-panel h3 {
  margin: 0 0 20px;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.formats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8faff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.format-card:hover {
  background: #f0f3ff;
  border-color: #c8cdd6;
  transform: translateY(-1px);
}

.format-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.format-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.format-info {
  flex: 1;
}

.format-tag {
  display: inline-block;
  background: #667eea;
  color: white;
  font-weight: 700;
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  margin-bottom: 3px;
}

.format-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1px;
  font-size: 14px;
}

.format-examples {
  font-size: 12px;
  color: #6b7280;
}

/* Process Panel Styles */
.process-panel h3 {
  margin: 0 0 20px;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.process-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.process-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f8faff;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.process-step:hover {
  background: #f0f3ff;
  border-color: #c8cdd6;
  transform: translateY(-1px);
}

.step-number {
  width: 32px;
  height: 32px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.step-description {
  font-size: 14px;
  color: #6b7280;
}

.tips-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tip {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8faff;
  border: 1px dashed #c8cdd6;
  border-radius: 8px;
  padding: 12px;
  color: #4b5563;
  transition: all 0.2s ease;
}

.tip:hover {
  background: #f0f3ff;
  border-color: #c8cdd6;
}

.tip-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.quiz-header h2 {
  margin: 0;
}

.description {
  color: #5b6472;
}

.badge {
  padding: 6px 10px;
  background: #eef0ff;
  color: #4b53c5;
  border-radius: 999px;
  font-weight: 600;
  font-size: 12px;
}

.question-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card {
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  padding: 14px;
}

.q-head {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.q-index {
  min-width: 36px;
  height: 36px;
  background: #eef0ff;
  color: #4b53c5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.q-text {
  font-weight: 600;
}

.choices {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.choice label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.answer {
  margin-top: 10px;
}

.answer-reveal {
  margin-top: 8px;
  background: #f6f7ff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  padding: 10px;
}

.quiz-preview {
  text-align: center;
}

.preview-actions {
  margin-top: 20px;
}

.share-success {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 20px;
}

.share-success-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.share-success-content h3 {
  margin: 0 0 16px;
  color: #1f2937;
}

.share-success-content p {
  color: #6b7280;
  margin: 0 0 20px;
}

.share-link-container {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.share-link-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
}

.copy-btn {
  padding: 12px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.copy-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.close-success {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-success:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Dark mode styles */
body.dark .header h1 {
  color: #e5e7eb;
}

body.dark .subtitle {
  color: #9ca3af;
}

body.dark .eyebrow {
  color: #a5b4fc;
  background: linear-gradient(135deg, #0b1222, #111a33);
  border-color: #1f2a44;
}

body.dark .panel {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.35),
    0 6px 12px rgba(0, 0, 0, 0.3);
}

body.dark .progress {
  background: #1f2a44;
}

body.dark .dropzone {
  border-color: #334155;
  background: #0b1222;
}

body.dark .dropzone.over {
  border-color: #667eea;
  background: #131c35;
  box-shadow:
    0 0 0 6px rgba(102, 126, 234, 0.12),
    0 8px 24px rgba(102, 126, 234, 0.28);
}

body.dark .dropzone.ready {
  background: #0f172a;
}

body.dark .headline {
  color: #e5e7eb;
}

body.dark .subline {
  color: #9ca3af;
}

body.dark .chip {
  background: #1f2a44;
  color: #a5b4fc;
  border-color: #334155;
}

body.dark .hint {
  color: #6b7280;
}

body.dark .browse {
  color: #a5b4fc;
}

body.dark .selected-meta {
  color: #9ca3af;
}

body.dark .selected-name {
  color: #e5e7eb;
}

body.dark .selected-size {
  color: #6b7280;
}

body.dark .remove-file {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .remove-file:hover {
  background: #334155;
  color: #fca5a5;
}

body.dark .primary {
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35);
}

body.dark .secondary {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .secondary:hover {
  background: #334155;
  border-color: #667eea;
}

body.dark .error {
  color: #fca5a5;
}

body.dark .share-success {
  background: rgba(0, 0, 0, 0.8);
}

body.dark .share-success-content {
  background: #0f172a;
  border: 1px solid #1f2a44;
}

body.dark .share-success-content h3 {
  color: #e5e7eb;
}

body.dark .share-success-content p {
  color: #9ca3af;
}

body.dark .share-link-input {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .close-success {
  color: #9ca3af;
}

body.dark .close-success:hover {
  background: #1f2a44;
  color: #e5e7eb;
}

/* Dark mode styles for new sections */
body.dark .formats-panel h3 {
  color: #e5e7eb;
}

body.dark .format-card {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .format-card:hover {
  background: #334155;
  border-color: #4b5563;
}

body.dark .format-name {
  color: #e5e7eb;
}

body.dark .format-examples {
  color: #9ca3af;
}

body.dark .process-panel h3 {
  color: #e5e7eb;
}

body.dark .tips-panel h3 {
  color: #e5e7eb;
}

body.dark .process-step {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .process-step:hover {
  background: #334155;
  border-color: #4b5563;
}

body.dark .step-title {
  color: #e5e7eb;
}

body.dark .step-description {
  color: #9ca3af;
}

body.dark .tip {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .tip:hover {
  background: #334155;
  border-color: #4b5563;
}
</style>
