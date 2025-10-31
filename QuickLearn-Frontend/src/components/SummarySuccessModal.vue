<script setup>
import { ref, computed } from 'vue'
import { CheckCircle, Download, FileText, File, FileType, X, Copy } from 'lucide-vue-next'
import ExportService from '../services/exportService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  summary: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['close', 'download'])

const downloadFormat = ref('pdf')
const isDownloading = ref(false)

const formatOptions = [
  {
    key: 'pdf',
    label: 'PDF',
    icon: 'FileText',
    description: 'Portable Document Format',
    color: '#dc2626'
  },
  {
    key: 'docx',
    label: 'DOC',
    icon: 'File',
    description: 'Microsoft Word Document',
    color: '#2563eb'
  },
  {
    key: 'txt',
    label: 'TXT',
    icon: 'FileType',
    description: 'Plain Text File',
    color: '#059669'
  }
]

const selectedFormat = computed(() => {
  return formatOptions.find(option => option.key === downloadFormat.value)
})

async function handleDownload() {
  if (!props.summary) return
  
  isDownloading.value = true
  
  try {
    if (downloadFormat.value === 'txt') {
      await downloadAsText()
    } else if (downloadFormat.value === 'pdf') {
      await downloadAsPDF()
    } else if (downloadFormat.value === 'docx') {
      await downloadAsDOCX()
    }
  } catch (error) {
    console.error('Download error:', error)
    window.$toast?.error('Download failed. Please try again.')
  } finally {
    // Reset downloading state after a delay
    setTimeout(() => {
      isDownloading.value = false
    }, 1000)
  }
}

function generateSummaryContent() {
  if (!props.summary) return ''
  
  let content = `# ${props.summary.title}\n\n`
  content += `${props.summary.description}\n\n`
  
  if (props.summary.keyPoints && props.summary.keyPoints.length > 0) {
    content += `## Key Points\n\n`
    props.summary.keyPoints.forEach((point, index) => {
      content += `${index + 1}. ${point}\n`
    })
    content += '\n'
  }
  
  if (props.summary.sections && props.summary.sections.length > 0) {
    props.summary.sections.forEach(section => {
      content += `## ${section.title}\n\n`
      content += `${section.content}\n\n`
      if (section.subpoints && section.subpoints.length > 0) {
        section.subpoints.forEach(subpoint => {
          content += `• ${subpoint}\n`
        })
        content += '\n'
      }
    })
  }
  
  if (props.summary.conclusions && props.summary.conclusions.length > 0) {
    content += `## Key Takeaways\n\n`
    props.summary.conclusions.forEach((conclusion, index) => {
      content += `${index + 1}. ${conclusion}\n`
    })
  }
  
  return content
}

async function downloadAsText() {
  try {
    const filename = props.summary.title || 'summary'
    ExportService.exportToTXT(props.summary, filename)
    window.$toast?.success('Summary downloaded as TXT')
  } catch (error) {
    console.error('Error downloading TXT:', error)
    window.$toast?.error('Failed to download TXT file')
  }
}

async function downloadAsPDF() {
  try {
    const filename = props.summary.title || 'summary'
    await ExportService.exportToPDF(props.summary, filename)
    window.$toast?.success('Summary downloaded as PDF')
  } catch (error) {
    console.error('Error downloading PDF:', error)
    window.$toast?.error('Failed to download PDF file')
  }
}

async function downloadAsDOCX() {
  try {
    const filename = props.summary.title || 'summary'
    await ExportService.exportToDOCX(props.summary, filename)
    window.$toast?.success('Summary downloaded as DOC')
  } catch (error) {
    console.error('Error downloading DOC:', error)
    window.$toast?.error('Failed to download DOC file')
  }
}

function copyToClipboard() {
  const content = generateSummaryContent()
  navigator.clipboard.writeText(content).then(() => {
    window.$toast?.success('Summary copied to clipboard')
  }).catch(() => {
    window.$toast?.error('Failed to copy summary')
  })
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <CheckCircle :size="24" class="success-icon" />
          <div>
            <h2>Summary Generated Successfully!</h2>
            <p class="success-message">Your lesson summary is ready for download.</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Summary Preview -->
        <div v-if="summary" class="summary-preview">
          <h3>{{ summary.title }}</h3>
          <p class="summary-description">{{ summary.description }}</p>
          
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">Key Points:</span>
              <span class="stat-value">{{ summary.keyPoints?.length || 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Sections:</span>
              <span class="stat-value">{{ summary.sections?.length || 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Takeaways:</span>
              <span class="stat-value">{{ summary.conclusions?.length || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Download Options -->
        <div class="download-section">
          <h3>Choose Download Format</h3>
          <div class="format-options">
            <div 
              v-for="option in formatOptions" 
              :key="option.key"
              class="format-option"
              :class="{ selected: downloadFormat === option.key }"
              @click="downloadFormat = option.key"
            >
              <div class="format-icon" :style="{ backgroundColor: option.color }">
                <component :is="option.icon" :size="20" />
              </div>
              <div class="format-info">
                <div class="format-label">{{ option.label }}</div>
                <div class="format-description">{{ option.description }}</div>
              </div>
              <div class="format-radio">
                <div class="radio-dot" :class="{ active: downloadFormat === option.key }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-actions">
          <button class="action-btn secondary" @click="copyToClipboard">
            <Copy :size="16" />
            Copy to Clipboard
          </button>
          <button 
            class="action-btn primary"
            :disabled="isDownloading"
            @click="handleDownload"
          >
            <Download :size="16" />
            {{ isDownloading ? 'Downloading...' : `Download as ${selectedFormat?.label}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e6e8ec;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.success-icon {
  color: #10b981;
  flex-shrink: 0;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.success-message {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.summary-preview {
  background: #f8faff;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.summary-preview h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.summary-description {
  margin: 0 0 16px;
  color: #6b7280;
  line-height: 1.5;
}

.summary-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

.download-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafbff;
}

.format-option:hover {
  border-color: #c8cdd6;
  background: #f8faff;
}

.format-option.selected {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.format-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.format-info {
  flex: 1;
}

.format-label {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.format-description {
  font-size: 14px;
  color: #6b7280;
}

.format-radio {
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-dot {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.radio-dot.active {
  border-color: #10b981;
  background: #10b981;
}

.radio-dot.active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e6e8ec;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-btn.primary {
  background: #10b981;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.action-btn.primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.action-btn.secondary {
  background: #667eea;
  color: white;
}

.action-btn.secondary:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    max-width: calc(100vw - 32px);
    margin: 16px;
  }

  .modal-body {
    padding: 20px;
  }

  .summary-stats {
    flex-direction: column;
    gap: 12px;
  }

  .footer-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Dark mode styles */
body.dark .modal-content {
  background: #0f172a;
  border: 1px solid #1f2a44;
}

body.dark .modal-header {
  border-color: #1f2a44;
}

body.dark .header-info h2 {
  color: #e5e7eb;
}

body.dark .success-message {
  color: #9ca3af;
}

body.dark .close-btn {
  color: #9ca3af;
}

body.dark .close-btn:hover {
  background: #1f2a44;
  color: #e5e7eb;
}

body.dark .summary-preview {
  background: #1f2a44;
  border-color: #334155;
}

body.dark .summary-preview h3 {
  color: #e5e7eb;
}

body.dark .summary-description {
  color: #9ca3af;
}

body.dark .stat-label {
  color: #9ca3af;
}

body.dark .download-section h3 {
  color: #e5e7eb;
}

body.dark .format-option {
  background: #0f172a;
  border-color: #334155;
}

body.dark .format-option:hover {
  border-color: #475569;
  background: #1f2a44;
}

body.dark .format-option.selected {
  border-color: #10b981;
  background: #064e3b;
}

body.dark .format-label {
  color: #e5e7eb;
}

body.dark .format-description {
  color: #9ca3af;
}

body.dark .radio-dot {
  border-color: #475569;
}

body.dark .modal-footer {
  background: #0b1222;
  border-color: #1f2a44;
}
</style>
