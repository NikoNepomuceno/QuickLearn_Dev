<template>
  <div class="test-page">
    <div class="container">
      <h1>Cloud Storage Test</h1>

      <!-- Authentication Section -->
      <div class="section">
        <h2>Authentication</h2>
        <div v-if="!isAuthenticated" class="auth-section">
          <button @click="createTestUser" :disabled="loading" class="btn primary">
            {{ loading ? 'Creating...' : 'Create Test User & Login' }}
          </button>
        </div>
        <div v-else class="auth-section">
          <p class="success">✅ Authenticated as test user</p>
          <button @click="logout" class="btn secondary">Logout</button>
        </div>
      </div>

      <!-- File Upload Section -->
      <div class="section" v-if="isAuthenticated">
        <h2>Upload & Create Quiz</h2>
        <div class="upload-section">
          <input
            type="file"
            @change="onFileSelect"
            accept=".pdf,.docx,.pptx,.txt"
            ref="fileInput"
          />
          <button
            @click="uploadAndCreateQuiz"
            :disabled="!selectedFile || uploading"
            class="btn primary"
          >
            {{ uploading ? 'Creating Quiz...' : 'Upload & Create Quiz' }}
          </button>
        </div>
        <div v-if="selectedFile" class="file-info">
          <p>Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</p>
        </div>
      </div>

      <!-- Quiz List Section -->
      <div class="section" v-if="isAuthenticated">
        <h2>My Quizzes</h2>
        <button @click="loadQuizzes" :disabled="loadingQuizzes" class="btn secondary">
          {{ loadingQuizzes ? 'Loading...' : 'Refresh Quizzes' }}
        </button>

        <div v-if="quizzes.length === 0" class="empty">
          <p>No quizzes found. Upload a file to create one!</p>
        </div>

        <div v-else class="quiz-list">
          <div v-for="quiz in quizzes" :key="quiz.id" class="quiz-item">
            <div class="quiz-info">
              <h3>{{ quiz.title }}</h3>
              <p>{{ quiz.description }}</p>
              <div class="quiz-meta">
                <span>Questions: {{ quiz.questionCount }}</span>
                <span v-if="quiz.sourceFile">File: {{ quiz.sourceFile.name }}</span>
                <span>Created: {{ new Date(quiz.createdAt).toLocaleDateString() }}</span>
              </div>
            </div>
            <div class="quiz-actions">
              <button @click="takeQuiz(quiz)" class="btn primary small">Take Quiz</button>
              <button @click="deleteQuiz(quiz)" class="btn danger small">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import cloudQuizService from '../services/cloudQuizService'
import { authService } from '../services/authService'

const router = useRouter()

// Reactive state
const isAuthenticated = ref(false)
const loading = ref(false)
const uploading = ref(false)
const loadingQuizzes = ref(false)
const selectedFile = ref(null)
const quizzes = ref([])
const message = ref('')
const messageType = ref('info')

// File input ref
const fileInput = ref(null)

onMounted(() => {
  checkAuthentication()
})

async function checkAuthentication() {
  isAuthenticated.value = await cloudQuizService.isAuthenticated()
  if (isAuthenticated.value) {
    loadQuizzes()
  }
}

async function createTestUser() {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/auth/dev-create-test-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error('Failed to create test user')
    }

    const data = await response.json()

    // Store the token
    authService.setToken(data.token)
    isAuthenticated.value = true

    showMessage('Test user created and logged in!', 'success')
    await loadQuizzes()
  } catch (error) {
    showMessage('Failed to create test user: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

function logout() {
  authService.removeToken()
  isAuthenticated.value = false
  quizzes.value = []
  selectedFile.value = null
  showMessage('Logged out', 'info')
}

function onFileSelect(event) {
  const file = event.target.files[0]
  selectedFile.value = file || null
}

async function uploadAndCreateQuiz() {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    const result = await cloudQuizService.createQuizFromFile(selectedFile.value, {
      count: 5,
      difficulty: 'medium'
    })

    showMessage('Quiz created successfully!', 'success')
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''

    await loadQuizzes()
  } catch (error) {
    showMessage('Failed to create quiz: ' + error.message, 'error')
  } finally {
    uploading.value = false
  }
}

async function loadQuizzes() {
  loadingQuizzes.value = true
  try {
    quizzes.value = await cloudQuizService.getUserQuizzes()
    showMessage(`Loaded ${quizzes.value.length} quizzes`, 'success')
  } catch (error) {
    showMessage('Failed to load quizzes: ' + error.message, 'error')
  } finally {
    loadingQuizzes.value = false
  }
}

function takeQuiz(quiz) {
  router.push(`/quiz/${quiz.id}`)
}

async function deleteQuiz(quiz) {
  if (!confirm(`Delete "${quiz.title}"?`)) return

  try {
    await cloudQuizService.deleteQuiz(quiz.id)
    showMessage('Quiz deleted', 'success')
    await loadQuizzes()
  } catch (error) {
    showMessage('Failed to delete quiz: ' + error.message, 'error')
  }
}

function formatFileSize(bytes) {
  return cloudQuizService.formatFileSize(bytes)
}

function showMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.section:last-child {
  border-bottom: none;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

h2 {
  color: #555;
  margin-bottom: 15px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #667eea;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #5a6fd8;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn.secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn.danger {
  background: #ef4444;
  color: white;
}

.btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn.small {
  padding: 5px 10px;
  font-size: 12px;
}

.auth-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.success {
  color: #10b981;
  font-weight: 500;
}

.upload-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.file-info {
  color: #666;
  font-size: 14px;
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.quiz-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.quiz-info h3 {
  margin: 0 0 5px 0;
  color: #1f2937;
}

.quiz-info p {
  margin: 0 0 10px 0;
  color: #6b7280;
  font-size: 14px;
}

.quiz-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #9ca3af;
}

.quiz-actions {
  display: flex;
  gap: 10px;
}

.empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 20px;
}

.message {
  padding: 10px;
  border-radius: 5px;
  margin-top: 20px;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.message.info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}
</style>
