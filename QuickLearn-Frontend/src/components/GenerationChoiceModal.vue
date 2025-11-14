<script setup>
import { computed } from 'vue'
import { FileText, Copy, X } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  fileName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'select'])

const fileLabel = computed(() => props.fileName || '{ File Name }')

function handleClose() {
  emit('close')
}

function choose(option) {
  // option: 'summary' | 'flashcards'
  emit('select', option)
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-info">
          <FileText :size="20" class="file-icon" />
          <div>
            <h2>What would you like to generate?</h2>
            <p class="file-name">{{ fileLabel }}</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose" aria-label="Close modal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="options-grid">
          <button class="option-card summary" @click="choose('summary')" aria-label="Generate Summary Notes">
            <div class="option-icon summary">
              <FileText :size="22" />
            </div>
            <div class="option-info">
              <h4>Generate Summary Notes</h4>
              <p>Concise highlights, sections, and key takeaways.</p>
            </div>
          </button>

          <button class="option-card flashcards" @click="choose('flashcards')" aria-label="Generate Flashcards">
            <div class="option-icon flashcards">
              <Copy :size="22" />
            </div>
            <div class="option-info">
              <h4>Generate Flashcards</h4>
              <p>Front/back cards for spaced repetition study.</p>
            </div>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="handleClose">Cancel</button>
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
  max-width: 680px;
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

.modal-header h2 {
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

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.option-card {
  display: flex;
  gap: 16px;
  align-items: center;
  border: 2px solid #e6e8ec;
  border-radius: 12px;
  padding: 16px;
  background: #fafbff;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: left;
}
.option-card:hover {
  border-color: #c8cdd6;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}
.option-icon.summary {
  background: #10b981;
}
.option-icon.flashcards {
  background: #667eea;
}

.option-info h4 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
.option-info p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e6e8ec;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
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

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    max-width: calc(100vw - 32px);
    margin: 16px;
  }
  .options-grid {
    grid-template-columns: 1fr;
  }
}

/* Dark mode */
body.dark .modal-content {
  background: #0f172a;
  border: 1px solid #1f2a44;
}
body.dark .modal-header {
  border-color: #1f2a44;
}
body.dark .modal-header h2 {
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
body.dark .option-card {
  border-color: #334155;
  background: #0f172a;
}
body.dark .option-card:hover {
  border-color: #475569;
}
body.dark .option-info h4 {
  color: #e5e7eb;
}
body.dark .option-info p {
  color: #9ca3af;
}
body.dark .modal-footer {
  background: #0b1222;
  border-color: #1f2a44;
}
</style>

