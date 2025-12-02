<template>
  <BaseCard
    padding="lg"
    class="leaderboard-panel"
    subtitle="Celebrating the top three community learners and their specialty areas."
  >
    <template #title>
      <div class="leaderboard-panel__title-row">
        <span>Community podium</span>
        <span class="leaderboard-panel__timestamp" v-if="lastUpdatedDisplay">
          Updated {{ lastUpdatedDisplay }}
        </span>
      </div>
    </template>


    <div class="leaderboard-panel__podium-shell">
      <div class="leaderboard-panel__podium">
        <div
          v-for="(member, index) in podium"
          :key="member?.userId || index"
          :class="[
            'leaderboard-panel__podium-slot',
            `leaderboard-panel__podium-slot--${podiumSlots[index]}`
          ]"
        >
          <div class="leaderboard-panel__rank">
            <span
              v-if="podiumSlots[index] === 'first'"
              class="leaderboard-panel__crown"
              aria-hidden="true"
            >
              ★
            </span>
            {{ podiumTitles[index] }}
          </div>
          <span class="avatar avatar--lg leaderboard-panel__avatar">
            <template v-if="member?.profilePicture">
              <img :src="member.profilePicture" alt="" />
            </template>
            <template v-else>
              {{ member?.displayName?.charAt(0).toUpperCase() || '—' }}
            </template>
          </span>
          <div class="leaderboard-panel__name">{{ member?.displayName || '—' }}</div>
          <div class="leaderboard-panel__points">
            {{ formatPoints(member).toLocaleString() }} pts
            <span class="leaderboard-panel__category-tag" v-if="member">
              {{
                selectedCategoryLabel ||
                member?.highlightCategory?.categoryLabel ||
                'Overall'
              }}
            </span>
          </div>
          <div class="leaderboard-panel__pedestal">
            <span>{{ podiumLabels[index] }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="leaderboard-panel__loading">
      Loading leaderboard…
    </div>

    <ul v-else class="leaderboard-panel__list">
      <li v-for="member in leaderboard" :key="member.userId" class="leaderboard-panel__item">
        <div class="leaderboard-panel__profile">
          <span class="avatar avatar--sm">
            <template v-if="member.profilePicture">
              <img :src="member.profilePicture" alt="" />
            </template>
            <template v-else>
              {{ member.displayName.charAt(0).toUpperCase() }}
            </template>
          </span>
          <div>
            <div class="leaderboard-panel__name">{{ member.displayName }}</div>
            <div class="text-sm text-muted">@{{ member.username }}</div>
          </div>
        </div>
        <div class="leaderboard-panel__score">
          <span>{{ formatPoints(member).toLocaleString() }} pts</span>
          <span class="leaderboard-panel__category-chip" v-if="member.highlightCategory">
            {{ selectedCategoryLabel || member.highlightCategory.categoryLabel }}
          </span>
        </div>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useLeaderboardStore } from '../store/leaderboard.store'
import { useLeaderboardSocket } from '../services/socket'

const REFRESH_INTERVAL_MS = 60_000
const leaderboardStore = useLeaderboardStore()
const {
  leadersWithFallback,
  activeCategoryKey,
  activeCategory,
  isLoading
} = storeToRefs(leaderboardStore)

const leaderboard = computed(() => leadersWithFallback.value)
const podium = computed(() => {
  const top = leaderboard.value.slice(0, 3)
  return [top[1] || null, top[0] || null, top[2] || null]
})
const podiumSlots = ['second', 'first', 'third']
const podiumTitles = ['2nd place', 'Champion', '3rd place']
const podiumLabels = ['2nd', '1st', '3rd']

const selectedCategoryKey = computed(() => activeCategoryKey.value)
const selectedCategoryLabel = computed(() => activeCategory.value?.categoryLabel || null)
const lastUpdatedDisplay = computed(() => {
  if (!leaderboardStore.lastUpdated) return null
  const diffMs = Date.now() - leaderboardStore.lastUpdated.getTime()
  if (diffMs < 60_000) return 'just now'
  const minutes = Math.round(diffMs / 60_000)
  return `${minutes}m ago`
})

function formatPoints(member) {
  const raw = selectedCategoryKey.value
    ? member?.categoryScore ?? 0
    : member?.points ?? 0
  return Number(raw) || 0
}

let closeSocket
let refreshTimer

onMounted(async () => {
  if (!leaderboardStore.leaders.length) {
    await leaderboardStore.loadLeaderboard().catch(() => {})
  }
  refreshTimer = window.setInterval(() => {
    leaderboardStore.loadLeaderboard(leaderboardStore.activeCategoryKey || null).catch(() => {})
  }, REFRESH_INTERVAL_MS)
  closeSocket = useLeaderboardSocket(({ data }) => {
    if (!Array.isArray(data) || leaderboardStore.activeCategoryKey) return
    leaderboardStore.leaders = data
    leaderboardStore.lastUpdatedIso = new Date().toISOString()
  })
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (closeSocket) {
    closeSocket()
  }
})
</script>

<style scoped>
.leaderboard-panel__title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.leaderboard-panel__timestamp {
  font-size: 0.85rem;
  color: var(--color-muted);
}


.leaderboard-panel__podium-shell {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-6) var(--space-6) 0;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.3);
  margin-bottom: var(--space-6);
  overflow: hidden;
}

.leaderboard-panel__podium-shell::before {
  content: '';
  position: absolute;
  inset: auto -160px -120px auto;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle at center, rgba(79, 70, 229, 0.18), transparent 70%);
  pointer-events: none;
}

.leaderboard-panel__podium {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: var(--space-6);
  width: 100%;
}

.leaderboard-panel__podium-slot {
  --pedestal-height: 80px;
  text-align: center;
  min-width: 110px;
  display: grid;
  gap: var(--space-2);
  justify-items: center;
  align-items: end;
}

.leaderboard-panel__podium-slot--first {
  --pedestal-height: 118px;
}

.leaderboard-panel__podium-slot--second {
  --pedestal-height: 96px;
}

.leaderboard-panel__podium-slot--third {
  --pedestal-height: 88px;
}

.leaderboard-panel__rank {
  font-size: 0.875rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.leaderboard-panel__crown {
  font-size: 0.9rem;
  color: var(--primary-main);
  filter: drop-shadow(0 6px 12px rgba(79, 70, 229, 0.25));
}

.leaderboard-panel__avatar {
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.18);
  border: 3px solid #ffffff;
  background: #fff;
}

.leaderboard-panel__podium-slot--first .leaderboard-panel__avatar {
  transform: translateY(-4px);
}

.leaderboard-panel__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.leaderboard-panel__points {
  font-size: 0.85rem;
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.leaderboard-panel__category-tag {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary-main);
}

.leaderboard-panel__pedestal {
  width: 100%;
  height: var(--pedestal-height);
  border-radius: 14px 14px 0 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: var(--space-2);
  font-weight: var(--font-weight-semibold);
  border: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* 1st Place - Gold */
.leaderboard-panel__podium-slot--first .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
  color: #1a1a1a;
  box-shadow: 
    0 4px 12px rgba(255, 215, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 215, 0, 0.5);
}

.leaderboard-panel__podium-slot--first .leaderboard-panel__pedestal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
}

/* 2nd Place - Silver */
.leaderboard-panel__podium-slot--second .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%);
  color: #1a1a1a;
  box-shadow: 
    0 4px 12px rgba(192, 192, 192, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(192, 192, 192, 0.5);
}

.leaderboard-panel__podium-slot--second .leaderboard-panel__pedestal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
}

/* 3rd Place - Bronze */
.leaderboard-panel__podium-slot--third .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #cd7f32 0%, #e6a857 50%, #cd7f32 100%);
  color: #ffffff;
  box-shadow: 
    0 4px 12px rgba(205, 127, 50, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-color: rgba(205, 127, 50, 0.5);
}

.leaderboard-panel__podium-slot--third .leaderboard-panel__pedestal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent);
  pointer-events: none;
}

.leaderboard-panel__pedestal span {
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.leaderboard-panel__loading {
  padding: var(--space-4) 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 0.95rem;
  border-top: 1px dashed rgba(226, 232, 240, 0.8);
}

.leaderboard-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.leaderboard-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.leaderboard-panel__item:first-child {
  border-top: none;
}

.leaderboard-panel__profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.leaderboard-panel__score {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.leaderboard-panel__category-chip {
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--primary-main);
}

@media (max-width: 768px) {
  .leaderboard-panel__podium {
    gap: var(--space-4);
  }

  .leaderboard-panel__podium-slot {
    min-width: 92px;
  }

  .leaderboard-panel__podium-slot--first {
    --pedestal-height: 104px;
  }

  .leaderboard-panel__podium-slot--second {
    --pedestal-height: 88px;
  }

  .leaderboard-panel__podium-slot--third {
    --pedestal-height: 78px;
  }

  .leaderboard-panel__item {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .leaderboard-panel__score {
    text-align: left;
  }
}

body.dark .leaderboard-panel__item {
  border-top-color: #1f2a44;
}

body.dark .leaderboard-panel__podium-shell {
  background: rgba(37, 56, 88, 0.65);
  border-color: rgba(51, 65, 85, 0.6);
}

body.dark .leaderboard-panel__name,
body.dark .leaderboard-panel__score {
  color: var(--color-text);
}

body.dark .leaderboard-panel__rank {
  color: #94a3b8;
}

body.dark .leaderboard-panel__crown {
  color: var(--primary-light);
}

body.dark .leaderboard-panel__avatar {
  border-color: rgba(15, 23, 42, 0.9);
  box-shadow: 0 15px 35px rgba(30, 41, 59, 0.55);
}

/* Dark mode podium colors - maintain medal colors but adjust for dark theme */
body.dark .leaderboard-panel__podium-slot--first .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
  color: #1a1a1a;
  box-shadow: 
    0 4px 16px rgba(255, 215, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 215, 0, 0.6);
}

body.dark .leaderboard-panel__podium-slot--second .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%);
  color: #1a1a1a;
  box-shadow: 
    0 4px 16px rgba(192, 192, 192, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(192, 192, 192, 0.6);
}

body.dark .leaderboard-panel__podium-slot--third .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, #cd7f32 0%, #e6a857 50%, #cd7f32 100%);
  color: #ffffff;
  box-shadow: 
    0 4px 16px rgba(205, 127, 50, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-color: rgba(205, 127, 50, 0.6);
}


body.dark .leaderboard-panel__category-tag,
body.dark .leaderboard-panel__category-chip {
  color: var(--primary-light);
}
</style>

