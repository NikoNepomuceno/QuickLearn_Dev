<script setup>
import { ref, computed, watch } from 'vue'
import { X, Check, FileText, Eye, EyeOff } from 'lucide-vue-next'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Set up PDF.js worker for Vite
// Use CDN with correct .mjs extension (pdfjs-dist 5.x uses .mjs, not .js)
if (typeof window !== 'undefined') {
  // Use unpkg CDN with the correct path - version 5.4.394 uses .mjs extension
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

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
  },
  file: {
    type: File,
    default: null
  }
})

const emit = defineEmits(['close', 'confirm'])

const selectedPages = ref(new Set())
const showPreview = ref({})
const pagePreviews = ref({})
const loadingPreviews = ref({})
const fileType = ref('')

// Detect file type from file name or file object
function detectFileType() {
  if (!props.file && !props.fileName) return 'unknown'
  
  const name = (props.file?.name || props.fileName || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pptx')) return 'pptx'
  if (name.endsWith('.txt')) return 'txt'
  
  // Fallback to MIME type if available
  if (props.file?.type) {
    if (props.file.type === 'application/pdf') return 'pdf'
    if (props.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
    if (props.file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx'
    if (props.file.type === 'text/plain') return 'txt'
  }
  
  return 'unknown'
}

// Generate PDF preview for a specific page
async function generatePdfPreview(pageIndex, pageNumber) {
  if (!props.file) {
    console.warn('No file available for PDF preview')
    return null
  }
  
  try {
    loadingPreviews.value[pageIndex] = true
    
    // Read file as array buffer
    const arrayBuffer = await props.file.arrayBuffer()
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Suppress console warnings
    })
    const pdf = await loadingTask.promise
    
    // Validate page number
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      console.warn(`Page number ${pageNumber} is out of range (1-${pdf.numPages})`)
      return null
    }
    
    // Get the page
    const page = await pdf.getPage(pageNumber)
    
    // Get default viewport to get page dimensions
    const defaultViewport = page.getViewport({ scale: 1.0 })
    const pageWidth = defaultViewport.width
    const pageHeight = defaultViewport.height
    
    // Calculate scale to fit within preview container (accounting for padding)
    // Preview container is approximately 200px wide (minmax(200px, 1fr)) with 8px margin
    // Aspect ratio is 3/4, so height = width * 4/3
    // Account for padding (12px on each side = 24px total)
    const containerWidth = 200 - 24 // Approximate width minus padding
    const containerHeight = (containerWidth * 4 / 3) - 24 // Height based on aspect ratio minus padding
    
    // Calculate scale to fit both width and height
    const scaleX = containerWidth / pageWidth
    const scaleY = containerHeight / pageHeight
    const scale = Math.min(scaleX, scaleY, 2.0) // Cap at 2.0 for quality, but prioritize fitting
    
    // Create viewport with calculated scale
    const viewport = page.getViewport({ scale })
    
    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Render page to canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
    
    // Convert to data URL
    const previewImage = canvas.toDataURL('image/png')
    
    // Store preview with dimensions for scaling
    pagePreviews.value[pageIndex] = {
      type: 'image',
      src: previewImage,
      width: viewport.width,
      height: viewport.height,
      originalWidth: pageWidth,
      originalHeight: pageHeight
    }
    
    return previewImage
  } catch (error) {
    console.error(`Error generating PDF preview for page ${pageNumber}:`, error)
    // Fallback to text preview on error
    pagePreviews.value[pageIndex] = { 
      type: 'text', 
      content: props.pages[pageIndex] || 'Preview not available' 
    }
    return null
  } finally {
    loadingPreviews.value[pageIndex] = false
  }
}

// Generate DOCX preview for a specific page
async function generateDocxPreview(pageIndex) {
  if (!props.file) return null
  
  try {
    loadingPreviews.value[pageIndex] = true
    
    // Use the extracted page content and convert it to well-formatted HTML
    // We format the text with proper structure detection (headings, lists, paragraphs)
    const pageContent = props.pages[pageIndex] || ''
    
    // Convert text to HTML with better structure detection
    const lines = pageContent.split('\n')
    let html = ''
    let inList = false
    let listItems = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line) {
        if (inList && listItems.length > 0) {
          html += `<ul>${listItems.join('')}</ul>`
          listItems = []
          inList = false
        }
        html += '<br>'
        continue
      }
      
      // Detect numbered list items (e.g., "1. ", "2. ", "- ", "• ")
      const numberedListMatch = line.match(/^(\d+\.|[-•])\s+(.+)$/)
      if (numberedListMatch) {
        if (!inList) {
          if (listItems.length > 0) {
            html += `<ul>${listItems.join('')}</ul>`
            listItems = []
          }
          inList = true
        }
        listItems.push(`<li>${numberedListMatch[2]}</li>`)
        continue
      }
      
      // Close list if we were in one
      if (inList) {
        html += `<ul>${listItems.join('')}</ul>`
        listItems = []
        inList = false
      }
      
      // Detect headings (short lines, all caps, or lines ending with colon that are short)
      const isShort = line.length < 60
      const isAllCaps = line === line.toUpperCase() && line.match(/[A-Z]/)
      const endsWithColon = line.endsWith(':')
      const isHeading = (isShort && isAllCaps) || (isShort && endsWithColon && line.length < 40)
      
      if (isHeading) {
        html += `<h3 style="font-weight: 600; margin: 12px 0 8px 0; color: #1f2937; font-size: 13px;">${line.replace(':', '')}</h3>`
      } else {
        // Detect bold patterns (text between ** or lines that look like labels)
        const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/)
        if (boldMatch) {
          html += `<p style="margin: 6px 0;"><strong>${boldMatch[1]}</strong>${boldMatch[2]}</p>`
        } else {
          // Regular paragraph
          html += `<p style="margin: 4px 0; line-height: 1.5;">${line}</p>`
        }
      }
    }
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
      html += `<ul>${listItems.join('')}</ul>`
    }
    
    pagePreviews.value[pageIndex] = { type: 'html', content: html }
    return html
  } catch (error) {
    console.error('Error generating DOCX preview:', error)
    // Fallback to simple text formatting
    const pageContent = props.pages[pageIndex] || ''
    const simpleHtml = pageContent
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        return trimmed ? `<p style="margin: 4px 0;">${trimmed}</p>` : '<br>'
      })
      .join('')
    pagePreviews.value[pageIndex] = { type: 'html', content: simpleHtml }
    return simpleHtml
  } finally {
    loadingPreviews.value[pageIndex] = false
  }
}

// Generate TXT preview
async function generateTxtPreview(pageIndex) {
  if (!props.file) return null
  
  try {
    loadingPreviews.value[pageIndex] = true
    
    // Use the extracted page content
    const pageContent = props.pages[pageIndex] || ''
    const previewText = pageContent.length > 500 
      ? pageContent.substring(0, 500) + '…'
      : pageContent
    
    pagePreviews.value[pageIndex] = { type: 'text', content: previewText }
    return previewText
  } catch (error) {
    console.error('Error generating TXT preview:', error)
    return null
  } finally {
    loadingPreviews.value[pageIndex] = false
  }
}

// Calculate scale for HTML preview to fit content
function getHtmlPreviewStyle(pageIndex) {
  const preview = pagePreviews.value[pageIndex]
  if (!preview || preview.type !== 'html') return {}
  
  // Estimate content height based on line count and character count
  const pageContent = props.pages[pageIndex] || ''
  const lineCount = pageContent.split('\n').filter(l => l.trim()).length
  const estimatedHeight = lineCount * 14 + 40 // Rough estimate: 14px per line + padding
  
  // Container height is approximately 200px * 4/3 = 267px (aspect ratio 3/4) minus padding
  const containerHeight = 267 - 16 // Approximate container height minus padding
  
  // Calculate scale if content is taller than container
  if (estimatedHeight > containerHeight) {
    const scale = containerHeight / estimatedHeight
    return {
      transform: `scale(${Math.max(scale, 0.4)})`, // Minimum scale of 0.4
      transformOrigin: 'top left',
      width: `${100 / Math.max(scale, 0.4)}%`,
      height: `${100 / Math.max(scale, 0.4)}%`
    }
  }
  
  return {}
}

// Calculate scale for text preview to fit content
function getTextPreviewStyle(pageIndex) {
  const pageContent = props.pages[pageIndex] || ''
  const lineCount = pageContent.split('\n').filter(l => l.trim()).length
  const estimatedHeight = lineCount * 14 + 24 // Rough estimate
  
  // Container height is approximately 267px minus padding
  const containerHeight = 267 - 24
  
  // Calculate scale if content is taller than container
  if (estimatedHeight > containerHeight) {
    const scale = containerHeight / estimatedHeight
    return {
      transform: `scale(${Math.max(scale, 0.4)})`,
      transformOrigin: 'top left',
      width: `${100 / Math.max(scale, 0.4)}%`,
      height: `${100 / Math.max(scale, 0.4)}%`
    }
  }
  
  return {}
}

// Generate preview for a page based on file type
async function generatePreview(pageIndex) {
  const type = fileType.value
  
  if (type === 'pdf') {
    // For PDF, generate preview for the actual page number (1-indexed)
    return await generatePdfPreview(pageIndex, pageIndex + 1)
  } else if (type === 'docx') {
    return await generateDocxPreview(pageIndex)
  } else if (type === 'txt') {
    return await generateTxtPreview(pageIndex)
  } else if (type === 'pptx') {
    // PPTX fallback - show text content
    pagePreviews.value[pageIndex] = { type: 'text', content: props.pages[pageIndex] || 'Preview not available' }
    return pagePreviews.value[pageIndex]
  }
  
  return null
}

// Watch for modal visibility and file/pages to generate previews
watch([() => props.visible, () => props.file, () => props.pages], async ([visible, file, pages]) => {
  if (!visible) {
    // Clear previews when modal is hidden
    pagePreviews.value = {}
    loadingPreviews.value = {}
    return
  }
  
  selectedPages.value.clear()
  showPreview.value = {}
  
  // Detect file type
  const detectedType = detectFileType()
  fileType.value = detectedType
  
  // Generate previews for all pages when modal is visible
  if (file && pages && pages.length > 0) {
    // Generate previews in parallel for better performance
    const previewPromises = pages.map((_, i) => {
      return generatePreview(i).catch(error => {
        console.error(`Error generating preview for page ${i}:`, error)
        // Fallback to text preview on error
        pagePreviews.value[i] = { type: 'text', content: pages[i] || 'Preview not available' }
        loadingPreviews.value[i] = false
        return null
      })
    })
    
    await Promise.all(previewPromises)
  }
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
    index: index + 1,
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
                  <!-- Loading state -->
                  <div v-if="loadingPreviews[index]" class="preview-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading preview...</span>
                  </div>
                  
                  <!-- PDF Preview (Image) -->
                  <img
                    v-else-if="fileType === 'pdf' && pagePreviews[index]?.type === 'image'"
                    :src="pagePreviews[index].src"
                    alt="Page preview"
                    class="preview-image"
                    @error="(e) => { console.error('Image load error:', e); pagePreviews[index] = null; }"
                  />
                  
                  <!-- DOCX Preview (HTML) -->
                  <div
                    v-else-if="fileType === 'docx' && pagePreviews[index]?.type === 'html'"
                    class="preview-html-wrapper"
                  >
                    <div
                      class="preview-html"
                      v-html="pagePreviews[index].content"
                      :style="getHtmlPreviewStyle(index)"
                    ></div>
                  </div>
                  
                  <!-- TXT/PPTX Preview (Text) -->
                  <div
                    v-else-if="(fileType === 'txt' || fileType === 'pptx') && pagePreviews[index]?.type === 'text'"
                    class="page-preview-text"
                    :style="getTextPreviewStyle(index)"
                  >
                    {{ pagePreviews[index].content }}
                  </div>
                  
                  <!-- Fallback to text preview -->
                  <div v-else class="page-preview-text">
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
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.modal-body::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.pages-grid::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-preview-text {
  padding: 12px;
  font-size: 10px;
  line-height: 1.4;
  color: #374151;
  width: 100%;
  height: 100%;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
  transform-origin: top left;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.preview-html {
  padding: 8px;
  font-size: 10px;
  line-height: 1.4;
  color: #374151;
  width: 100%;
  height: 100%;
  overflow: hidden;
  word-wrap: break-word;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  transform-origin: top left;
  /* Hide scrollbar if overflow changes to auto */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.preview-html::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.preview-html-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.preview-html-content {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  transform-origin: top left;
}

.preview-html :deep(p) {
  margin: 4px 0;
  line-height: 1.5;
  color: #374151;
}

.preview-html :deep(ul),
.preview-html :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
  list-style-position: outside;
}

.preview-html :deep(li) {
  margin: 4px 0;
  line-height: 1.5;
  color: #374151;
}

.preview-html :deep(h1),
.preview-html :deep(h2),
.preview-html :deep(h3) {
  margin: 12px 0 8px 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.preview-html :deep(h3) {
  font-size: 13px;
}

.preview-html :deep(strong),
.preview-html :deep(b) {
  font-weight: 600;
  color: #1f2937;
}

.preview-html :deep(br) {
  line-height: 1.2;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #6b7280;
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e6e8ec;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
