<template>
  <BaseCard
    padding="lg"
    class="achievements-panel"
    subtitle="Unlock achievements by completing challenges and reaching milestones."
  >
    <template #title>Achievement Wall</template>

    <div v-if="isLoading" class="achievements-panel__loading">
      <div class="spinner"></div>
      <p>Loading achievements...</p>
    </div>

    <div v-else class="achievements-panel__stats">
      <div class="achievements-panel__stat">
        <span class="achievements-panel__stat-value">{{ earnedCount }}/{{ totalCount }}</span>
        <span class="achievements-panel__stat-label">Unlocked</span>
      </div>
      <div class="achievements-panel__stat">
        <span class="achievements-panel__stat-value">{{ totalPointsEarned }}</span>
        <span class="achievements-panel__stat-label">Points from Achievements</span>
      </div>
    </div>

    <div class="achievements-panel__grid">
      <div
        v-for="achievement in achievements"
        :key="achievement.id"
        :class="[
          'achievement-card',
          { 'achievement-card--earned': achievement.earned, 'achievement-card--locked': !achievement.earned },
          `achievement-card--${achievement.rarity || 'common'}`
        ]"
        @click="openDetail(achievement)"
      >
        <div class="achievement-card__icon-wrapper">
          <div class="achievement-card__icon" :class="`rarity--${achievement.rarity || 'common'}`">
            <DotLottieVue
              v-if="achievement.lottieUrl && !lottieErrors[achievement.id]"
              :src="achievement.lottieUrl"
              class="achievement-lottie"
              :autoplay="achievement.earned"
              :loop="achievement.earned"
              @error="() => handleLottieError(achievement.id)"
            />
            <span v-else class="achievement-icon-fallback">{{ getIconEmoji(achievement.icon) }}</span>
          </div>
          <div v-if="achievement.earned" class="achievement-card__badge">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="currentColor" />
              <path d="M6 10l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div v-if="!achievement.earned" class="achievement-card__lock">
            🔒
          </div>
        </div>

        <div class="achievement-card__content">
          <div class="achievement-card__rarity" :class="`rarity--${achievement.rarity || 'common'}`">
            {{ getRarityLabel(achievement.rarity) }}
          </div>
          <h3 class="achievement-card__name">{{ achievement.name }}</h3>
          <p class="achievement-card__description">{{ achievement.description }}</p>

          <div class="achievement-card__footer">
            <span class="achievement-card__points">+{{ achievement.points }} pts</span>
            <div v-if="!achievement.earned && achievement.progress > 0" class="achievement-card__progress">
              <div class="progress-mini">
                <div
                  class="progress-mini__fill"
                  :style="{ width: achievement.progress + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievement Detail Modal -->
    <AchievementDetailModal
      :visible="showDetailModal"
      :achievement="selectedAchievement"
      @close="closeDetail"
    />
  </BaseCard>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { getAllAchievements } from '../services/leaderboard.api'
import AchievementDetailModal from './AchievementDetailModal.vue'

const achievements = ref([])
const isLoading = ref(true)
const showDetailModal = ref(false)
const selectedAchievement = ref(null)
const lottieErrors = ref({})

const earnedCount = computed(() => {
  return achievements.value.filter(a => a.earned).length
})

const totalCount = computed(() => {
  return achievements.value.length
})

const totalPointsEarned = computed(() => {
  return achievements.value
    .filter(a => a.earned)
    .reduce((sum, a) => sum + (a.pointsEarned || a.points || 0), 0)
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

function getRarityLabel(rarity) {
  const labels = {
    common: 'COMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY'
  }
  return labels[rarity] || 'COMMON'
}

function handleLottieError(achievementId) {
  lottieErrors.value[achievementId] = true
}

function openDetail(achievement) {
  selectedAchievement.value = achievement
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedAchievement.value = null
}

onMounted(async () => {
  try {
    isLoading.value = true
    const response = await getAllAchievements()
    achievements.value = response.achievements || []
  } catch (error) {
    console.error('Error loading achievements:', error)
    window.$toast?.error('Failed to load achievements')
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.achievements-panel__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  gap: var(--space-4);
  color: var(--color-text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(79, 70, 229, 0.1);
  border-top-color: var(--primary-main);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.achievements-panel__stats {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-5);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(59, 130, 246, 0.1));
  border-radius: var(--radius-lg);
  border: 1px solid rgba(79, 70, 229, 0.15);
  margin-bottom: var(--space-6);
}

.achievements-panel__stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.achievements-panel__stat-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--primary-main);
  line-height: 1.2;
}

.achievements-panel__stat-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: var(--font-weight-medium);
}

.achievements-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
}

.achievement-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.achievement-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-light), var(--primary-main));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.achievement-card--earned::before {
  transform: scaleX(1);
}

.achievement-card--earned {
  border-color: rgba(79, 70, 229, 0.3);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(59, 130, 246, 0.06));
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
}

.achievement-card--earned:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.2);
  border-color: rgba(79, 70, 229, 0.5);
}

.achievement-card--locked {
  opacity: 0.6;
  filter: grayscale(0.7);
  background: rgba(148, 163, 184, 0.05);
}

.achievement-card--locked:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

.achievement-card__icon-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.achievement-card__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  margin: 0 auto;
  position: relative;
}

.achievement-card__icon.rarity--common {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(100, 116, 139, 0.4));
  border: 3px solid rgba(148, 163, 184, 0.5);
}

.achievement-card__icon.rarity--rare {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.5));
  border: 3px solid rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
}

.achievement-card__icon.rarity--epic {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(124, 58, 237, 0.6));
  border: 3px solid rgba(139, 92, 246, 0.7);
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
}

.achievement-card__icon.rarity--legendary {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.7));
  border: 3px solid rgba(245, 158, 11, 0.8);
  box-shadow: 0 0 50px rgba(245, 158, 11, 0.6);
}

.achievement-lottie {
  width: 100%;
  height: 100%;
}

.achievement-icon-fallback {
  font-size: 2rem;
}

.achievement-card__lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  opacity: 0.8;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  z-index: 1;
}

.achievement-card__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
  border: 2px solid white;
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

.achievement-card__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
}

.achievement-card__rarity {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 8px;
  align-self: center;
}

.rarity--common {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.rarity--rare {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.rarity--epic {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.rarity--legendary {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.achievement-card__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  line-height: 1.3;
}

.achievement-card--locked .achievement-card__name {
  color: var(--color-text-muted);
}

.achievement-card__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  min-height: 2.5rem;
}

.achievement-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: var(--space-2);
}

.achievement-card__points {
  font-weight: var(--font-weight-semibold);
  color: var(--primary-main);
  font-size: 0.875rem;
}

.achievement-card--locked .achievement-card__points {
  color: var(--color-text-muted);
}

.achievement-card__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.progress-mini {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  overflow: hidden;
  min-width: 60px;
}

.progress-mini__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-light), var(--primary-main));
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Rarity-based border colors */
.achievement-card--rare {
  border-color: rgba(59, 130, 246, 0.3);
}

.achievement-card--epic {
  border-color: rgba(139, 92, 246, 0.3);
}

.achievement-card--legendary {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .achievements-panel__grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .achievements-panel__stats {
    flex-direction: column;
    gap: var(--space-4);
  }

  .achievement-card {
    padding: var(--space-4);
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .achievements-panel__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Dark mode */
body.dark .achievement-card {
  background: var(--color-surface);
  border-color: var(--color-border);
}

body.dark .achievement-card--earned {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(59, 130, 246, 0.15));
  border-color: rgba(79, 70, 229, 0.4);
}

body.dark .achievement-card--locked {
  background: rgba(30, 41, 59, 0.5);
}

body.dark .achievements-panel__stats {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(59, 130, 246, 0.2));
  border-color: rgba(79, 70, 229, 0.3);
}

body.dark .progress-mini {
  background: rgba(255, 255, 255, 0.1);
}
</style>

