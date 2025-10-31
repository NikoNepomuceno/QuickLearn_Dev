<script setup>
import { ref, computed, watch } from 'vue'
import { X, Check, FileText, Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  fileName: {
    type: String,
    default: ''
  },
  pages: {
    type: Array,
    default: () => []
  },
  defaultPrompt: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const selectedPages = ref(new Set())
const showPreview = ref({})

// Watch for changes in pages prop to reset selections
watch(() => props.pages, () => {
  selectedPages.value.clear()
  showPreview.value = {}
}, { immediate: true })

const allPagesSelected = computed(() => {
  return props.pages.length > 0 && selectedPages.value.size === props.pages.length
})

const somePagesSelected = computed(() => {
  return selectedPages.value.size > 0 && selectedPages.value.size < props.pages.length
})

function togglePageSelection(pageIndex) {
  if (selectedPages.value.has(pageIndex)) {
    selectedPages.value.delete(pageIndex)
  } else {
    selectedPages.value.add(pageIndex)
  }
}

function toggleAllPages() {
  if (allPagesSelected.value) {
    selectedPages.value.clear()
  } else {
    selectedPages.value.clear()
    props.pages.forEach((_, index) => {
      selectedPages.value.add(index)
    })
  }
}

function togglePreview(pageIndex) {
  showPreview.value[pageIndex] = !showPreview.value[pageIndex]
}

function handleConfirm() {
  const selectedPageIndices = Array.from(selectedPages.value)
  const selectedPageData = selectedPageIndices.map(index => ({
    index: index + 1, // 1-based page numbers
    content: props.pages[index]
  }))
  
  emit('confirm', {
    selectedPages: selectedPageData
  })
}

function handleClose() {
  emit('close')
}

function getPagePreview(content, maxLength = 200) {
  if (!content) return 'No content available'
  
  let cleaned = content
    .replace(/\n\s*\n\s*\n/g, '\n\n') 
    .replace(/\s+/g, ' ') 
    .replace(/\n\s+/g, '\n') 
    .trim()
  
  const lines = cleaned.split('\n')
  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim()
    // Skip empty lines, page numbers, and common headers
    return trimmed.length > 0 && 
           !trimmed.match(/^\d+$/) && 
           !trimmed.match(/^Page \d+/) &&
           !trimmed.match(/^[A-Z][a-z]+ \d+/) &&
           trimmed.length > 3
  })
  
  const meaningfulContent = meaningfulLines.join(' ').trim()
  
  // Get preview
  const preview = meaningfulContent.length > maxLength 
    ? meaningfulContent.substring(0, maxLength) + '...' 
    : meaningfulContent
  
  return preview || 'Content preview not available'
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <FileText :size="20" class="file-icon" />
          <div>
            <h2>Select Pages</h2>
            <p class="file-name">{{ fileName }}</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">

        <!-- Page Selection Section -->
        <div class="pages-section">
          <div class="section-header">
            <h3>Select Pages ({{ pages.length }} pages found)</h3>
            <div class="selection-controls">
              <button 
                class="select-all-btn"
                :class="{ active: allPagesSelected, partial: somePagesSelected }"
                @click="toggleAllPages"
              >
                <Check :size="16" />
                {{ allPagesSelected ? 'Deselect All' : 'Select All' }}
              </button>
            </div>
          </div>

          <div class="pages-grid">
            <div 
              v-for="(page, index) in pages" 
              :key="index"
              class="page-preview-card"
              :class="{ selected: selectedPages.has(index) }"
              @click="togglePageSelection(index)"
            >
              <div class="page-preview-container">
                <div class="page-preview-content">
                  <div class="page-preview-text">
                    {{ getPagePreview(page, 150) }}
                  </div>
                </div>
                <div class="page-number-overlay">
                  PAGE {{ String(index + 1).padStart(2, '0') }}
                </div>
                <div class="page-selection-indicator">
                  <div class="selection-checkbox" :class="{ checked: selectedPages.has(index) }">
                    <Check v-if="selectedPages.has(index)" :size="12" />
                  </div>
                </div>
              </div>
              <div class="page-info">
                <span class="page-stats">{{ page.length }} characters</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="selection-summary">
          <span v-if="selectedPages.size === 0" class="no-selection">
            No pages selected
          </span>
          <span v-else-if="selectedPages.size === 1" class="single-selection">
            1 page selected
          </span>
          <span v-else class="multiple-selection">
            {{ selectedPages.size }} pages selected
          </span>
        </div>
        <div class="footer-actions">
          <button class="cancel-btn" @click="handleClose">
            Cancel
          </button>
          <button 
            class="confirm-btn"
            :disabled="selectedPages.size === 0"
            @click="handleConfirm"
          >
            Continue
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
  max-width: 800px;
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
  gap: 12px;
}

.file-icon {
  color: #667eea;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.file-name {
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


.pages-section {
  /* Removed border-top since it's now the only section */
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.select-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8faff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  color: #4b53c5;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-all-btn:hover {
  background: #eef0ff;
  border-color: #667eea;
}

.select-all-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.select-all-btn.partial {
  background: #fef3c7;
  color: #d97706;
  border-color: #f59e0b;
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.page-preview-card {
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  background: #fafbff;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.page-preview-card:hover {
  border-color: #c8cdd6;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.page-preview-card.selected {
  border-color: #667eea;
  background: #f8faff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.page-preview-container {
  position: relative;
  aspect-ratio: 3/4;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  margin: 8px;
}

.page-preview-content {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.page-preview-text {
  padding: 12px;
  font-size: 11px;
  line-height: 1.5;
  color: #374151;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 10;
  line-clamp: 10;
  -webkit-box-orient: vertical;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.page-number-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.page-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
}

.selection-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.selection-checkbox.checked {
  background: #667eea;
  border-color: #667eea;
}

.selection-checkbox svg {
  color: white;
}

.page-info {
  padding: 8px 12px;
  text-align: center;
}

.page-stats {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e6e8ec;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.selection-summary {
  font-size: 14px;
  color: #6b7280;
}

.no-selection {
  color: #9ca3af;
}

.single-selection {
  color: #059669;
  font-weight: 500;
}

.multiple-selection {
  color: #667eea;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.confirm-btn {
  padding: 10px 20px;
  background: #667eea;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.confirm-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
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

body.dark .file-name {
  color: #9ca3af;
}

body.dark .close-btn {
  color: #9ca3af;
}

body.dark .close-btn:hover {
  background: #1f2a44;
  color: #e5e7eb;
}

body.dark .pages-section {
  /* Removed border styles since it's now the only section */
}

body.dark .section-header h3 {
  color: #e5e7eb;
}

body.dark .select-all-btn {
  background: #1f2a44;
  border-color: #334155;
  color: #a5b4fc;
}

body.dark .select-all-btn:hover {
  background: #334155;
  border-color: #667eea;
}

body.dark .select-all-btn.active {
  background: #667eea;
  color: white;
}

body.dark .select-all-btn.partial {
  background: #451a03;
  color: #f59e0b;
  border-color: #f59e0b;
}

body.dark .page-preview-card {
  border-color: #334155;
  background: #0f172a;
}

body.dark .page-preview-card:hover {
  border-color: #475569;
}

body.dark .page-preview-card.selected {
  border-color: #667eea;
  background: #131c35;
}

body.dark .page-preview-container {
  background: #1f2a44;
}

body.dark .page-preview-content {
  background: #0f172a;
  border-color: #334155;
}

body.dark .page-preview-text {
  color: #cbd5e1;
}

body.dark .page-number-overlay {
  background: rgba(0, 0, 0, 0.8);
}

body.dark .selection-checkbox {
  background: rgba(0, 0, 0, 0.6);
  border-color: #ffffff;
}

body.dark .selection-checkbox.checked {
  background: #667eea;
  border-color: #667eea;
}

body.dark .page-stats {
  color: #9ca3af;
}

body.dark .modal-footer {
  background: #0b1222;
  border-color: #1f2a44;
}

body.dark .selection-summary {
  color: #9ca3af;
}

body.dark .no-selection {
  color: #6b7280;
}

body.dark .cancel-btn {
  background: #1f2a44;
  border-color: #334155;
  color: #e5e7eb;
}

body.dark .cancel-btn:hover {
  background: #334155;
}
</style>
