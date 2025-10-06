<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import QuizConfirmationModal from '../components/QuizConfirmationModal.vue'
import QuizConfigModal from '../components/QuizConfigModal.vue'
import Sidebar from '../components/Sidebar.vue'
import { downloadQuizAsPDF, generateShareableLink, copyToClipboard, saveQuizToHistory } from '../services/quizService'
import { Upload, FileText, X, Lightbulb, Target, Copy } from 'lucide-vue-next'

const router = useRouter()
const selectedFile = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const quiz = ref(null)
const count = ref(10)
const isDragOver = ref(false)
const showAnswers = ref({})
const progressPercent = ref(0)
const showConfirmationModal = ref(false)
const showConfigModal = ref(false)
const shareLink = ref('')
const showShareSuccess = ref(false)
let progressTimer = null

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

// const fileIcon = computed(() => {
//   if (!selectedFile.value) return '📄'
//   const ext = selectedFile.value.name.split('.').pop().toLowerCase()
//   switch (ext) {
//     case 'pdf': return '📕'
//     case 'docx': return '📘'
//     case 'txt': return '📄'
//     default: return '📄'
//   }
// })

function onFileChange(event) {
  const files = event.target.files
  selectedFile.value = files && files[0] ? files[0] : null
  errorMessage.value = ''
  if (selectedFile.value) {
    showConfigModal.value = true
  }
}

function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    const file = files[0]
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    if (allowedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|txt)$/i)) {
      selectedFile.value = file
      errorMessage.value = ''
      showConfigModal.value = true
    } else {
      const message = 'Please upload a PDF, DOCX, or TXT file.'
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

  const form = new FormData()
  form.append('file', selectedFile.value)

  isLoading.value = true
  startProgress()
  try {
    const backendUrl = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
    const effectiveCount = options.count || count.value
    const typesParam = options.type ? options.type : 'multiple_choice'
    const url = `${backendUrl}/api/quiz/from-file?count=${encodeURIComponent(effectiveCount)}&types=${encodeURIComponent(typesParam)}`
    const response = await fetch(url, {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      const msg = await response.text().catch(() => '')
      throw new Error(msg || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    quiz.value = data.quiz || null
    if (quiz.value) {
      // Persist to history so it appears in Take Quiz
      quiz.value = saveQuizToHistory(quiz.value)
      // Keep a pointer to the latest quiz id for quick resume
      localStorage.setItem('currentQuizId', quiz.value.id)
    }

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
  router.push('/quiz')
}

function handleDownloadQuiz() {
  if (quiz.value) {
    downloadQuizAsPDF(quiz.value)
    window.$toast?.success('PDF download started')
  }
}

function handleShareQuiz() {
  if (quiz.value) {
    shareLink.value = generateShareableLink(quiz.value)
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
  uploadFile(payload)
}

function copyShareLink() {
  if (shareLink.value) {
    copyToClipboard(shareLink.value).then(() => {
      // You could show a toast notification here
      console.log('Link copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy link:', err)
    })
  }
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
        <p class="subtitle">Upload a PDF, DOCX, or TXT and let QuickLearn create high-quality questions.</p>
      </div>
      <div class="content-grid">
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
        >
          <div class="dropzone-inner">
            <div class="upload-icon">
              <Upload :size="48" />
            </div>
            <div class="dz-text" v-if="!selectedFile">
              <div class="headline">Drop your files here</div>
              <div class="subline">or <label for="file-input" class="browse">browse to upload</label></div>
              <input
                id="file-input"
                type="file"
                accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                @change="onFileChange"
                hidden
              />
              <div class="chips">
                <span class="chip">PDF</span>
                <span class="chip">DOCX</span>
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

        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <div>Analyzing your file and generating questions…</div>
        </div>
      </div>

      <div class="panel tips-panel">
        <h3>
          <Lightbulb :size="20" />
          Tips for best result
        </h3>
        <div class="tips-grid">
          <div class="tip">Use clean, well-structured documents.</div>
          <div class="tip">Split large topics into separate files for focused quizzes.</div>
          <div class="tip">Prefer 10–25 questions for balanced difficulty.</div>
        </div>
      </div>
      </div>

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

    <!-- Share Success Message -->
    <div v-if="showShareSuccess" class="share-success">
      <div class="share-success-content">
        <h3>🔗 Shareable Link Generated!</h3>
        <p>Your quiz has been saved and can be shared with this link:</p>
        <div class="share-link-container">
          <input
            type="text"
            :value="shareLink"
            readonly
            class="share-link-input"
          />
          <button class="copy-btn" @click="copyShareLink">
            <Copy :size="16" />
            Copy
          </button>
        </div>
        <button class="close-success" @click="showShareSuccess = false">✕</button>
      </div>
    </div>
    </div>
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
    radial-gradient(1000px 600px at 20% -10%, rgba(102,126,234,0.12), transparent 60%),
    radial-gradient(900px 500px at 120% 10%, rgba(118,75,162,0.10), transparent 60%);
}

@media (max-width: 1024px) {
  .upload-page {
    padding-bottom: 120px; /* Add space for floating sidebar */
  }
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}


.header { margin-bottom: 16px; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #4b53c5;
  background: linear-gradient(135deg, #eef0ff, #f6f0ff);
  border: 1px solid #e5e7ff;
  padding: 6px 12px;
  border-radius: 999px;
}
.header h1 { margin: 8px 0 6px; font-size: 28px; }
.subtitle { color: #5b6472; }

.tips-panel { margin-top: 16px; }

.panel {
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 25px rgba(50, 50, 93, 0.05), 0 6px 12px rgba(0,0,0,0.04);
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
  transition: width .2s ease;
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
}

.dropzone.over {
  border-color: #667eea;
  background: #f0f3ff;
  box-shadow: 0 0 0 6px rgba(102,126,234,0.08), 0 8px 24px rgba(102,126,234,0.18);
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

.headline { font-weight: 700; font-size: 18px; }
.subline { color: #5b6472; margin-top: 2px; }
.chips { margin-top: 10px; display: flex; gap: 6px; justify-content: center; }
.chip { font-size: 11px; padding: 4px 8px; border-radius: 999px; background: #eef0ff; color: #4b53c5; border: 1px solid #e6e8ec; }
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
  box-shadow: 0 8px 20px rgba(102,126,234,0.25);
  transition: transform .15s ease, box-shadow .2s ease, filter .2s ease;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(102,126,234,0.35);
}

.primary:active {
  transform: translateY(0);
  filter: brightness(.98);
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

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: #4b5563;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e6e8ec;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* results/sidebar sections removed */



.tips-panel h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: #1f2937;
}

.tips-grid { display: flex; flex-direction: column; gap: 10px; }
.tip { background: #f8faff; border: 1px dashed #c8cdd6; border-radius: 8px; padding: 12px; color: #4b5563; }

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
  box-shadow: 0 10px 25px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.3);
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
  box-shadow: 0 0 0 6px rgba(102,126,234,0.12), 0 8px 24px rgba(102,126,234,0.28);
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
  box-shadow: 0 8px 20px rgba(102,126,234,0.35);
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
</style>
