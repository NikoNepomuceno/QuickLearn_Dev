<script setup>
import { ref, watch, computed } from 'vue'
import { FileText, Edit3, HelpCircle, PenTool, ClipboardList, Shuffle, X } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
  defaultCount: { type: Number, default: 10 }
})

const emit = defineEmits(['close', 'confirm'])

const localCount = ref(props.defaultCount)
const selectedType = ref('multiple_choice')

watch(() => props.visible, (v) => {
  if (v) {
    // reset to defaults each time it opens
    localCount.value = props.defaultCount
    selectedType.value = 'multiple_choice'
  }
})

const typeOptions = [
  { key: 'multiple_choice', title: 'Multiple Choice', desc: '4 options per question', icon: 'Edit3' },
  { key: 'true_false', title: 'True or False', desc: 'Simple true/false items', icon: 'HelpCircle' },
  { key: 'identification', title: 'Identification', desc: 'Fill-in-the-blank', icon: 'PenTool' },
  { key: 'enumeration', title: 'Enumeration', desc: 'List multiple answers', icon: 'ClipboardList' },
  { key: 'mixed', title: 'Mixed', desc: 'Combination of all types', icon: 'Shuffle' }
]

const fileLabel = computed(() => props.fileName || '{ File Name }')

function close() {
  emit('close')
}

function confirm() {
  emit('confirm', { count: localCount.value, type: selectedType.value })
}
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="close">
      <div class="modal">
        <div class="modal-head">
          <h3>
            <FileText :size="20" />
            Configure Your Quiz
          </h3>
          <button class="icon-btn" @click="close" aria-label="Close">
            <X :size="16" />
          </button>
        </div>

        <div class="section">
          <label class="source">
            <span class="icon">
              <FileText :size="18" />
            </span>
            <div class="meta">
              <div class="label">Source File</div>
              <div class="name">{{ fileLabel }}</div>
            </div>
          </label>
        </div>

        <div class="section">
          <div class="section-title">Quiz Type</div>
          <div class="type-grid">
            <button
              v-for="t in typeOptions"
              :key="t.key"
              class="type-card"
              :class="{ active: selectedType === t.key }"
              @click="selectedType = t.key"
            >
              <div class="left">
                <component :is="t.icon" :size="20" />
              </div>
              <div class="right">
                <div class="t-title">{{ t.title }}</div>
                <div class="t-desc">{{ t.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Number of Questions</div>
          <div class="slider-row">
            <input type="range" min="5" max="50" step="1" v-model.number="localCount" />
            <div class="count">{{ localCount }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" @click="close">Cancel</button>
          <button class="btn primary" @click="confirm">⚡ Generate Quiz</button>
        </div>
      </div>
    </div>
  </teleport>
  </template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 3000;
  padding: 16px;
}
.modal {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border: 1px solid #e6e8ec;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px 8px;
}
.modal-head h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}
.icon-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.icon-btn:hover { background: #f3f4f6; color: #374151; }
.section { padding: 10px 18px; }
.section + .section { padding-top: 6px; }
.section-title { font-weight: 700; margin: 8px 0 10px; }
.source {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  padding: 12px;
  background: #f9fafb;
}
.source .icon {
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
}
.source .label { font-size: 12px; color: #6b7280; }
.source .name { font-weight: 600; }
.type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.type-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #e6e8ec;
  background: #fff;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}
.type-card .left {
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
}
.t-title { font-weight: 700; }
.t-desc { color: #6b7280; font-size: 12px; }
.type-card.active { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }
.slider-row { display: flex; gap: 10px; align-items: center; }
.slider-row input[type="range"] { flex: 1; }
.count { width: 42px; text-align: right; font-weight: 700; }
.actions { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px 18px; }
.btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.ghost { background: #fff; border: 1px solid #e6e8ec; }
.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; }
</style>

