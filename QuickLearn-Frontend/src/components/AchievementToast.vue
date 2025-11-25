<template>
  <div
    :id="toast.id"
    :class="[
      'achievement-toast',
      `achievement-toast--${toast.achievement.rarity || 'common'}`,
      { 'achievement-toast--dismissed': toast.dismissed }
    ]"
  >
    <div class="achievement-toast__content">
      <!-- Icon Container -->
      <div class="achievement-toast__icon-wrapper">
        <div
          :class="[
            'achievement-toast__icon',
            `rarity--${toast.achievement.rarity || 'common'}`
          ]"
        >
          <DotLottieVue
            v-if="toast.achievement.lottieUrl && !lottieError"
            :src="toast.achievement.lottieUrl"
            class="achievement-toast__lottie"
            autoplay
            :loop="false"
            @error="handleLottieError"
          />
          <span v-else class="achievement-toast__icon-fallback">
            {{ getIconEmoji(toast.achievement.icon) }}
          </span>
        </div>
        <div class="achievement-toast__badge">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="currentColor" />
            <path
              d="M6 10l2 2 4-4"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <!-- Text Content -->
      <div class="achievement-toast__text">
        <div class="achievement-toast__rarity">
          {{ getRarityLabel(toast.achievement.rarity) }}
        </div>
        <h3 class="achievement-toast__name">
          {{ toast.achievement.name }}
        </h3>
        <p class="achievement-toast__description">
          {{ toast.achievement.description }}
        </p>
        <div class="achievement-toast__points">
          +{{ toast.achievement.points || 0 }} points
        </div>
      </div>

      <!-- Close Button -->
      <button
        class="achievement-toast__close"
        @click="$emit('dismiss', toast.id)"
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const props = defineProps({
  toast: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['dismiss'])

const lottieError = ref(false)

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

function getRarityLabel(rarity) {
  const labels = {
    common: 'COMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY'
  }
  return labels[rarity] || 'COMMON'
}

function handleLottieError() {
  lottieError.value = true
}
</script>

<style scoped>
.achievement-toast {
  min-width: 320px;
  max-width: 420px;
  background: var(--color-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  margin-bottom: 12px;
  border: 2px solid transparent;
  position: relative;
  backdrop-filter: blur(10px);
}

.dark .achievement-toast {
  background: var(--color-bg, #1e293b);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* Rarity-based border colors */
.achievement-toast--common {
  border-color: rgba(148, 163, 184, 0.5);
}

.achievement-toast--rare {
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 10px 40px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.1);
}

.achievement-toast--epic {
  border-color: rgba(139, 92, 246, 0.7);
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.25), 0 0 30px rgba(139, 92, 246, 0.15);
}

.achievement-toast--legendary {
  border-color: rgba(245, 158, 11, 0.8);
  box-shadow: 0 10px 40px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.2);
  animation: legendaryGlow 3s ease-in-out infinite;
}

@keyframes legendaryGlow {
  0%, 100% {
    box-shadow: 0 10px 40px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.2);
  }
  50% {
    box-shadow: 0 10px 40px rgba(245, 158, 11, 0.5), 0 0 60px rgba(245, 158, 11, 0.4);
  }
}

.achievement-toast__content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  position: relative;
}

.achievement-toast__icon-wrapper {
  position: relative;
  flex-shrink: 0;
}

.achievement-toast__icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.achievement-toast__icon.rarity--common {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(100, 116, 139, 0.4));
  border: 3px solid rgba(148, 163, 184, 0.5);
}

.achievement-toast__icon.rarity--rare {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.5));
  border: 3px solid rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
}

.achievement-toast__icon.rarity--epic {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(124, 58, 237, 0.6));
  border: 3px solid rgba(139, 92, 246, 0.7);
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
}

.achievement-toast__icon.rarity--legendary {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.7));
  border: 3px solid rgba(245, 158, 11, 0.8);
  box-shadow: 0 0 50px rgba(245, 158, 11, 0.6);
}

.achievement-toast__lottie {
  width: 100%;
  height: 100%;
}

.achievement-toast__icon-fallback {
  font-size: 2rem;
}

.achievement-toast__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 24px;
  height: 24px;
  background: var(--gradient-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-on-primary);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
  border: 2px solid var(--color-text-on-primary);
  animation: pulse-badge 2s infinite;
  z-index: 2;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.achievement-toast__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.achievement-toast__rarity {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: inline-block;
  width: fit-content;
}

.achievement-toast--common .achievement-toast__rarity {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.achievement-toast--rare .achievement-toast__rarity {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.achievement-toast--epic .achievement-toast__rarity {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.achievement-toast--legendary .achievement-toast__rarity {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.achievement-toast__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  line-height: 1.3;
}

.dark .achievement-toast__name {
  color: var(--color-text, #e5e7eb);
}

.achievement-toast__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .achievement-toast__description {
  color: var(--color-text-muted, #9ca3af);
}

.achievement-toast__points {
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #10b981;
}

.achievement-toast__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.achievement-toast__close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text, #1f2937);
}

.dark .achievement-toast__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text, #e5e7eb);
}

/* Responsive */
@media (max-width: 480px) {
  .achievement-toast {
    min-width: 280px;
    max-width: calc(100vw - 32px);
  }

  .achievement-toast__icon {
    width: 56px;
    height: 56px;
  }
}
</style>

