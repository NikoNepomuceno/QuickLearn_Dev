<script setup>
import { ref, watch, computed } from 'vue'
import { FileText, Edit3, HelpCircle, PenTool, ClipboardList, Shuffle, X, Sparkles, CheckCircle2, Clock } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
  defaultCount: { type: Number, default: 10 },
  defaultTimed: { type: Boolean, default: false },
  defaultTimerSeconds: { type: Number, default: 30 },
})

const emit = defineEmits(['close', 'confirm'])

const localCount = ref(props.defaultCount)
const selectedTypes = ref(['multiple_choice'])
const selectedQuizMode = ref(props.defaultTimed ? 'timed' : 'default')
const timedModeEnabled = computed(() => selectedQuizMode.value === 'timed')
const timerSeconds = ref(props.defaultTimerSeconds || 30)
const MIN_TIMER = 10
const MAX_TIMER = 180

function clampTimer(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 30
  return Math.min(MAX_TIMER, Math.max(MIN_TIMER, Math.round(value)))
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      // reset to defaults each time it opens
      localCount.value = props.defaultCount
      selectedTypes.value = ['multiple_choice']
      selectedQuizMode.value = props.defaultTimed ? 'timed' : 'default'
      timerSeconds.value = clampTimer(props.defaultTimerSeconds || 30)
    }
  },
)

watch(
  () => timerSeconds.value,
  (val) => {
    if (val === undefined || val === null) {
      timerSeconds.value = MIN_TIMER
      return
    }
    const numericVal = Number(val)
    if (Number.isNaN(numericVal)) {
      timerSeconds.value = MIN_TIMER
      return
    }
    const clamped = clampTimer(numericVal)
    if (clamped !== numericVal) {
      timerSeconds.value = clamped
    }
  },
)

const typeOptions = [
  {
    key: 'multiple_choice',
    title: 'Multiple Choice',
    desc: 'Standard 4-option questions. Best for comprehension.',
    icon: 'Edit3',
  },
  {
    key: 'true_false',
    title: 'True or False',
    desc: 'Quick fire fact checking items.',
    icon: 'HelpCircle',
  },
  { key: 'identification', title: 'Identification', desc: 'Fill-in-the-blank style challenges.', icon: 'PenTool' },
  {
    key: 'enumeration',
    title: 'Enumeration',
    desc: 'List multiple answers for a single topic.',
    icon: 'ClipboardList',
  },
  { key: 'mixed', title: 'Mixed Mode', desc: 'A dynamic combination of all types for comprehensive testing.', icon: 'Shuffle' },
]

const nonMixedKeys = typeOptions.filter((t) => t.key !== 'mixed').map((t) => t.key)
const quizModeOptions = [
  {
    key: 'default',
    title: 'Classic Mode',
    desc: 'Answer at your own pace without pressure.',
  },
  {
    key: 'timed',
    title: 'Timed Quiz',
    desc: 'Set a timer for every question.',
  },
]

function toggleType(key) {
  if (key === 'mixed') {
    // Mixed means all non-mixed types
    selectedTypes.value = [...nonMixedKeys]
    return
  }

  const idx = selectedTypes.value.indexOf(key)
  if (idx === -1) {
    selectedTypes.value = [...selectedTypes.value, key]
  } else {
    const next = selectedTypes.value.slice()
    next.splice(idx, 1)
    selectedTypes.value = next.length ? next : ['multiple_choice']
  }

  // If user manually selects all non-mixed types, treat as Mixed
  const selectedSet = new Set(selectedTypes.value)
  const allSelected = nonMixedKeys.every((k) => selectedSet.has(k))
  if (allSelected) {
    selectedTypes.value = [...nonMixedKeys]
  }
}

const fileLabel = computed(() => props.fileName || '{ File Name }')

function close() {
  emit('close')
}

function selectQuizMode(modeKey) {
  selectedQuizMode.value = modeKey === 'timed' ? 'timed' : 'default'
}

function confirm() {
  // If all types selected, communicate as 'mixed'; otherwise send explicit list
  const selectedSet = new Set(selectedTypes.value)
  const isMixed = nonMixedKeys.every((k) => selectedSet.has(k))
  const typePayload = isMixed ? 'mixed' : selectedTypes.value.join(',')
  emit('confirm', {
    count: localCount.value,
    type: typePayload,
    timedModeEnabled: timedModeEnabled.value,
    questionTimerSeconds: timedModeEnabled.value ? timerSeconds.value : null,
  })
}

const isMixedSelected = computed(() => nonMixedKeys.every((k) => selectedTypes.value.includes(k)))
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="close">
      <div class="modal">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="header-icon-box">
              <Sparkles :size="20" />
            </div>
            <h3>Configure Your Quiz</h3>
          </div>
          <button class="close-btn" @click="close" aria-label="Close">
            <X :size="20" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Source Material -->
          <div class="section">
            <div class="section-label">SOURCE MATERIAL</div>
            <div class="source-card">
              <div class="file-icon-box">
                <FileText :size="24" />
              </div>
              <div class="file-info">
                <div class="file-name">{{ fileLabel }}</div>
                <div class="file-meta">PDF • Processed</div>
              </div>
              <button class="change-btn">Change</button>
            </div>
          </div>

          <!-- Quiz Type -->
          <div class="section">
            <div class="section-label">QUIZ TYPE</div>
            <div class="type-grid">
              <button
                v-for="t in typeOptions"
                :key="t.key"
                class="option-card"
                :class="{
                  active: t.key === 'mixed' ? isMixedSelected : selectedTypes.includes(t.key)
                }"
                @click="toggleType(t.key)"
              >
                <div class="card-content">
                  <div class="card-top">
                    <span class="card-title">{{ t.title }}</span>
                    <div v-if="(t.key === 'mixed' ? isMixedSelected : selectedTypes.includes(t.key))" class="check-circle">
                      <CheckCircle2 :size="16" />
                    </div>
                  </div>
                  <div class="card-desc">{{ t.desc }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Number of Questions -->
          <div class="section">
            <div class="questions-header">
              <div class="section-label">NUMBER OF QUESTIONS</div>
              <div class="badge">{{ localCount }} Questions</div>
            </div>
            <div class="slider-row">
              <div class="slider-container">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  v-model.number="localCount"
                  class="range-slider"
                  :style="{ backgroundSize: ((localCount - 5) * 100) / 45 + '% 100%' }"
                />
              </div>
              <div class="number-input-box">
                <input type="number" v-model.number="localCount" min="5" max="50" />
              </div>
            </div>
          </div>

          <!-- Quiz Mode -->
          <div class="section">
            <div class="section-label">QUIZ MODE</div>
            <div class="mode-grid">
              <button
                v-for="mode in quizModeOptions"
                :key="mode.key"
                class="option-card"
                :class="{ active: selectedQuizMode === mode.key }"
                @click="selectQuizMode(mode.key)"
              >
                <div class="card-content">
                  <div class="card-top">
                    <span class="card-title">{{ mode.title }}</span>
                    <div v-if="selectedQuizMode === mode.key" class="check-circle">
                      <CheckCircle2 :size="16" />
                    </div>
                  </div>
                  <div class="card-desc">{{ mode.desc }}</div>
                </div>
              </button>
            </div>

            <!-- Timer Config -->
            <div v-if="timedModeEnabled" class="timer-config">
               <div class="timer-row">
                 <div class="timer-icon">
                   <Clock :size="18" />
                 </div>
                 <select v-model.number="timerSeconds" class="timer-select">
                    <option :value="15">15s / question</option>
                    <option :value="30">30s / question</option>
                    <option :value="45">45s / question</option>
                    <option :value="60">1 min / question</option>
                    <option :value="90">1 min 30s / question</option>
                    <option :value="120">2 min / question</option>
                 </select>
               </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-ghost" @click="close">Cancel</button>
          <button class="btn-primary" @click="confirm">
            <Sparkles :size="18" />
            Generate Quiz
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 3000;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 600px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-box {
  width: 36px;
  height: 36px;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.source-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.file-icon-box {
  width: 40px;
  height: 40px;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.file-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.change-btn {
  color: #6366f1;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.change-btn:hover {
  text-decoration: underline;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.option-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.option-card:hover {
  border-color: #d1d5db;
}

.option-card.active {
  border: 2px solid #6366f1;
  background: #eef2ff;
  padding: 15px; /* Adjust for border width to prevent layout shift */
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 15px;
}

.active .card-title {
  color: #4338ca;
}

.check-circle {
  color: #6366f1;
  display: flex;
}

.card-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.active .card-desc {
  color: #5b6b8e;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.badge {
  background: #eef2ff;
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.slider-row {
  display: flex;
  gap: 16px;
  align-items: center;
  background: #f9fafb;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.slider-container {
  flex: 1;
  display: flex;
  align-items: center;
}

.range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  background-image: linear-gradient(#6366f1, #6366f1);
  background-repeat: no-repeat;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  transition: box-shadow 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.2);
}

.number-input-box input {
  width: 60px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.number-input-box input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.timer-config {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.timer-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer-icon {
  color: #6b7280;
}

.timer-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #1f2937;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-ghost {
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  color: #4b5563;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.btn-primary {
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

@media (max-width: 640px) {
  .type-grid, .mode-grid {
    grid-template-columns: 1fr;
  }
  
  .slider-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .number-input-box input {
    width: 100%;
  }
}
</style>
