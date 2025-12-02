<template>
  <teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-content" :class="rarityClass">

        <div class="modal-inner">
          <!-- Achievement Icon with Lottie -->
          <div class="modal-icon-container" :class="`icon-${achievement.rarity || 'common'}`">
            <DotLottieVue
              v-if="achievement.lottieUrl && !lottieError"
              :src="achievement.lottieUrl"
              class="modal-lottie"
              autoplay
              loop
              @error="handleLottieError"
            />
            <div v-else class="achievement-icon-fallback">
              {{ getIconEmoji(achievement.icon) }}
            </div>
          </div>

          <!-- Achievement Title -->
          <h2 class="modal-title">{{ achievement.name }}</h2>

          <!-- Rarity Badge -->
          <div class="modal-rarity-badge" :class="`rarity-${achievement.rarity || 'common'}`">
            {{ rarityLabel }}
          </div>

          <!-- Description -->
          <p class="modal-description">{{ achievement.description }}</p>

          <!-- Progress Bar (for locked achievements) -->
          <div v-if="!achievement.earned" class="achievement-modal__progress">
            <div class="progress-header">
              <span class="progress-label">Progress</span>
              <span class="progress-percentage">{{ achievement.progress }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: achievement.progress + '%' }"
                :class="rarityClass"
              ></div>
            </div>
            <div class="progress-stats">
              <span>{{ achievement.current || 0 }} / {{ achievement.target || 0 }}</span>
            </div>
          </div>

          <!-- Status Badge (for unlocked achievements) -->
          <div v-else class="modal-status-unlocked">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
              <circle cx="10" cy="10" r="10" fill="currentColor" />
              <path
                d="M6 10l2 2 4-4"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Unlocked</span>
            <div v-if="achievement.earnedAt" class="achievement-date" style="margin-top: 8px; font-size: 0.75rem; opacity: 0.8;">
              Earned on {{ formatDate(achievement.earnedAt) }}
            </div>
          </div>

          <!-- Points -->
          <div class="achievement-modal__points">
            <span class="points-label">REWARD</span>
            <span class="points-value">+{{ achievement.points }} points</span>
          </div>

          <!-- Close Button -->
          <button class="modal-close-button" @click="close">
            Close
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  achievement: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])
const lottieError = ref(false)

const rarityClass = computed(() => {
  return `rarity--${props.achievement.rarity || 'common'}`
})

const rarityLabel = computed(() => {
  const labels = {
    common: 'COMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY'
  }
  return labels[props.achievement.rarity] || 'COMMON'
})

function getIconEmoji(icon) {
  const iconMap = {
    star: '⭐',
    fire: '🔥',
    flame: '🔥',
    play: '▶️',
    trophy: '🏆',
    bolt: '⚡',
    crown: '👑',
    medal: '🥇',
    book: '📚',
    shield: '🛡️'
  }
  return iconMap[icon] || '🏆'
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function handleLottieError() {
  lottieError.value = true
}

function close() {
  emit('close')
}

// Reset error when achievement changes
watch(() => props.achievement?.id, () => {
  lottieError.value = false
})
</script>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 5000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal Container */
.modal-content {
  position: relative;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 1.5rem;
  padding: 2rem;
  max-width: 28rem;
  width: 100%;
  border-width: 2px;
  background: rgba(26, 26, 26, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Rarity-based border colors */
.modal-content.rarity--common {
  border-color: rgba(148, 163, 184, 0.4);
}

.modal-content.rarity--rare {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 40px rgba(59, 130, 246, 0.2);
}

.modal-content.rarity--epic {
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 50px rgba(139, 92, 246, 0.3);
}

.modal-content.rarity--legendary {
  border-color: rgba(245, 158, 11, 0.7);
  box-shadow: 0 0 60px rgba(245, 158, 11, 0.4);
  animation: legendaryGlow 3s ease-in-out infinite, modalFadeIn 0.3s ease;
}

@keyframes legendaryGlow {
  0%, 100% {
    box-shadow: 0 0 60px rgba(245, 158, 11, 0.4);
    border-color: rgba(245, 158, 11, 0.7);
  }
  50% {
    box-shadow: 0 0 80px rgba(245, 158, 11, 0.6);
    border-color: rgba(245, 158, 11, 0.9);
  }
}

/* Modal Inner Content */
.modal-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Modal Icon Container */
.modal-icon-container {
  display: inline-block;
  padding: 1.5rem;
  border-radius: 9999px;
  border-width: 2px;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.icon-common {
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.1);
}

.icon-rare {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.15);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}

.icon-epic {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(139, 92, 246, 0.15);
  box-shadow: 0 0 25px rgba(139, 92, 246, 0.3);
}

.icon-legendary {
  border-color: rgba(245, 158, 11, 0.7);
  background: rgba(245, 158, 11, 0.15);
  box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
}

/* Modal Lottie Animation */
.modal-lottie {
  width: 80px;
  height: 80px;
  margin: 0 auto;
}

.achievement-icon-fallback {
  font-size: 3rem;
  display: block;
}

/* Modal Achievement Name */
.modal-title {
  font-size: 1.875rem; /* 30px */
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem 0;
}

/* Modal Rarity Badge */
.modal-rarity-badge {
  display: inline-block;
  padding: 0.25rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

/* Rarity Badge Colors */
.rarity-legendary {
  background: rgb(251, 191, 36);
  color: black;
}

.rarity-epic {
  background: rgb(168, 85, 247);
  color: white;
}

.rarity-rare {
  background: rgb(59, 130, 246);
  color: white;
}

.rarity-common {
  background-color: rgb(107, 114, 128);
  color: white;
}

/* Modal Description */
.modal-description {
  color: rgb(209, 213, 219); /* gray-300 */
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  line-height: 1.5;
}

/* Modal Status Badge */
.modal-status-unlocked {
  background-color: rgba(34, 197, 94, 0.2);
  border: 1px solid rgb(34, 197, 94);
  border-radius: 0.75rem;
  padding: 1rem;
  color: rgb(74, 222, 128); /* green-400 */
  font-weight: 600;
  width: 100%;
  margin-bottom: 1rem;
}

.modal-status-locked {
  background-color: rgba(51, 65, 85, 0.5);
  border: 1px solid rgb(71, 85, 105);
  border-radius: 0.75rem;
  padding: 1rem;
  color: rgb(156, 163, 175); /* gray-400 */
  width: 100%;
  margin-bottom: 1rem;
}

.achievement-date {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

/* Progress Section */
.achievement-modal__progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill.rarity--common {
  background: #64748b;
}

.progress-fill.rarity--rare {
  background: linear-gradient(90deg, rgb(59, 130, 246), rgb(34, 211, 238));
}

.progress-fill.rarity--epic {
  background: linear-gradient(90deg, rgb(168, 85, 247), rgb(236, 72, 153));
}

.progress-fill.rarity--legendary {
  background: linear-gradient(90deg, rgb(251, 191, 36), rgb(249, 115, 22));
}

.progress-stats {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Points Section */
.achievement-modal__points {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  width: 100%;
  margin-bottom: 1rem;
}

.points-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.points-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(251, 191, 36); /* yellow-400 */
}

/* Modal Close Button */
.modal-close-button {
  margin-top: 0.5rem;
  padding: 0.5rem 1.5rem;
  background-color: rgb(147, 51, 234); /* purple-600 */
  color: white;
  border-radius: 9999px;
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  width: 100%;
  font-size: 1rem;
}

.modal-close-button:hover {
  background-color: rgb(126, 34, 206); /* purple-700 */
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 90vw;
    padding: 1.5rem;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .modal-icon-container {
    padding: 1rem;
  }

  .modal-lottie {
    width: 60px;
    height: 60px;
  }

  .achievement-icon-fallback {
    font-size: 2.5rem;
  }
}
</style>

