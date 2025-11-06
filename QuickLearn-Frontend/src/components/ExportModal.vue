<script setup>
import { ref, computed } from 'vue'
import { Download, FileText, File, FileType, X, Copy } from 'lucide-vue-next'
import ExportService from '@/services/exportService.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  summary: { type: Object, default: () => null },
  title: { type: String, default: 'Download Summary' },
  message: { type: String, default: 'Choose a format and download your summary.' }
})

const emit = defineEmits(['close'])

const downloadFormat = ref('pdf')
const isDownloading = ref(false)

const formatOptions = [
  { key: 'pdf', label: 'PDF', icon: 'FileText', description: 'Portable Document Format', color: '#dc2626' },
  { key: 'docx', label: 'DOC', icon: 'File', description: 'Microsoft Word Document', color: '#2563eb' },
  { key: 'txt', label: 'TXT', icon: 'FileType', description: 'Plain Text File', color: '#059669' }
]

const selectedFormat = computed(() => formatOptions.find(o => o.key === downloadFormat.value))

async function handleDownload() {
  if (!props.summary) return
  isDownloading.value = true
  try {
    const filename = props.summary.title || 'summary'
    if (downloadFormat.value === 'pdf') {
      await ExportService.exportToPDF(props.summary, filename)
      window.$toast?.success('Summary downloaded as PDF')
    } else if (downloadFormat.value === 'docx') {
      await ExportService.exportToDOCX(props.summary, filename)
      window.$toast?.success('Summary downloaded as DOC')
    } else {
      ExportService.exportToTXT(props.summary, filename)
      window.$toast?.success('Summary downloaded as TXT')
    }
  } catch (e) {
    window.$toast?.error('Download failed. Please try again.')
  } finally {
    setTimeout(() => { isDownloading.value = false }, 700)
  }
}

function generateSummaryContent() {
  if (!props.summary) return ''
  let content = ''
  if (props.summary.title) content += `# ${props.summary.title}\n\n`
  if (props.summary.description) content += `${props.summary.description}\n\n`
  if (props.summary.keyPoints?.length) {
    content += '## Key Points\n\n'
    props.summary.keyPoints.forEach((p, i) => { content += `${i + 1}. ${p}\n` })
    content += '\n'
  }
  if (props.summary.sections?.length) {
    props.summary.sections.forEach(s => {
      content += `## ${s.title}\n\n`
      if (s.content) content += `${s.content}\n\n`
      if (s.subpoints?.length) {
        s.subpoints.forEach(sp => { content += `• ${sp}\n` })
        content += '\n'
      }
    })
  }
  if (props.summary.conclusions?.length) {
    content += '## Key Takeaways\n\n'
    props.summary.conclusions.forEach((c, i) => { content += `${i + 1}. ${c}\n` })
  }
  return content
}

function copyToClipboard() {
  const content = generateSummaryContent()
  navigator.clipboard.writeText(content).then(() => {
    window.$toast?.success('Summary copied to clipboard')
  }).catch(() => {
    window.$toast?.error('Failed to copy summary')
  })
}

function handleClose() { emit('close') }
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <FileText :size="20" class="file-icon" />
          <div>
            <h2>{{ title }}</h2>
            <p class="success-message">{{ message }}</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="format-selector">
          <div 
            v-for="option in formatOptions" 
            :key="option.key" 
            class="format-option"
            :class="{ selected: downloadFormat === option.key }"
            :style="{ borderColor: downloadFormat === option.key ? option.color : '#e5e7eb' }"
            @click="downloadFormat = option.key"
          >
            <component :is="option.icon" :size="18" :style="{ color: option.color }" />
            <div class="format-info">
              <div class="format-label">{{ option.label }}</div>
              <div class="format-desc">{{ option.description }}</div>
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
          <button class="action-btn primary" :disabled="isDownloading" @click="handleDownload">
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
.file-icon { color: #374151; flex-shrink: 0; }
.success-message { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
.close-btn { background: none; border: none; color: #6b7280; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease; }
.close-btn:hover { background: #f3f4f6; color: #374151; }
.modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.format-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.format-option { display: flex; align-items: center; gap: 10px; border: 2px solid #e5e7eb; border-radius: 12px; padding: 12px; cursor: pointer; transition: transform 0.1s ease; }
.format-option:hover { transform: translateY(-2px); }
.format-option.selected { background: #f8faff; }
.format-info { display: flex; flex-direction: column; }
.format-label { font-weight: 600; color: #1f2937; }
.format-desc { font-size: 12px; color: #6b7280; }
.modal-footer { padding: 16px 24px 24px; border-top: 1px solid #e6e8ec; }
.footer-actions { display: flex; justify-content: space-between; gap: 12px; }
.action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e5e7eb; cursor: pointer; font-weight: 600; }
.action-btn.primary { background: #4f46e5; color: white; border-color: #4f46e5; }
.action-btn.primary:disabled { opacity: 0.7; cursor: not-allowed; }
.action-btn.secondary { background: #f3f4f6; color: #374151; }

/* Dark mode overrides */
body.dark .modal-content { background: #0f172a; color: #e5e7eb; }
body.dark .modal-header { border-color: #1f2a44; }
body.dark .success-message { color: #9ca3af; }
body.dark .close-btn:hover { background: #1f2a44; color: #e5e7eb; }
body.dark .format-option { border-color: #1f2a44; }
body.dark .format-option.selected { background: #111c2e; }
body.dark .format-label { color: #e5e7eb; }
body.dark .format-desc { color: #9ca3af; }
body.dark .modal-footer { border-color: #1f2a44; }
body.dark .action-btn.secondary { background: #1f2a44; color: #e5e7eb; border-color: #334155; }
</style>


