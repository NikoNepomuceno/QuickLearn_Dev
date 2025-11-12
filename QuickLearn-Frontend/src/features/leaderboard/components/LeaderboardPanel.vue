<template>
  <BaseCard
    padding="lg"
    class="leaderboard-panel"
    subtitle="Celebrating the top three community learners this week."
  >
    <template #title>Community podium</template>

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
            {{ (member?.points ?? 0).toLocaleString() }} pts
          </div>
          <div class="leaderboard-panel__pedestal">
            <span>{{ podiumLabels[index] }}</span>
          </div>
        </div>
      </div>
    </div>

    <ul class="leaderboard-panel__list">
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
        <div class="leaderboard-panel__score">{{ member.points }} pts</div>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { getLeaderboard } from '../services/leaderboard.api'
import { useLeaderboardSocket } from '../services/socket'

const leaderboard = ref([])
const podium = ref([null, null, null])
const podiumSlots = ['second', 'first', 'third']
const podiumTitles = ['2nd place', 'Champion', '3rd place']
const podiumLabels = ['2nd', '1st', '3rd']

function recomputePodium(list) {
  const top = list.slice(0, 3)
  podium.value = [top[1] || null, top[0] || null, top[2] || null]
}

let closeSocket

onMounted(async () => {
  const initial = await getLeaderboard()
  leaderboard.value = initial
  recomputePodium(initial)
  closeSocket = useLeaderboardSocket(({ data }) => {
    leaderboard.value = data
    recomputePodium(data)
  })
})

onBeforeUnmount(() => {
  if (closeSocket) {
    closeSocket()
  }
})
</script>

<style scoped>
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
}

.leaderboard-panel__pedestal {
  width: 100%;
  height: var(--pedestal-height);
  border-radius: 14px 14px 0 0;
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.9), rgba(203, 213, 225, 0.95));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: var(--space-2);
  font-weight: var(--font-weight-semibold);
  color: #1f2937;
  border: 1px solid rgba(203, 213, 225, 0.8);
}

.leaderboard-panel__podium-slot--first .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
  color: #ffffff;
}

.leaderboard-panel__podium-slot--second .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.6), rgba(59, 130, 246, 0.85));
  color: #ffffff;
}

.leaderboard-panel__podium-slot--third .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.6), rgba(239, 68, 68, 0.82));
  color: #ffffff;
}

.leaderboard-panel__pedestal span {
  font-size: 0.85rem;
  letter-spacing: 0.04em;
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
  }
}

body.dark .leaderboard-panel__item {
  border-top-color: #1f2a44;
}

body.dark .leaderboard-panel__podium-shell {
  background:
    linear-gradient(135deg, rgba(37, 56, 88, 0.65), rgba(30, 41, 59, 0.8)),
    rgba(15, 23, 42, 0.92);
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

body.dark .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: #cbd5f5;
  border: 1px solid rgba(51, 65, 85, 0.7);
}

body.dark .leaderboard-panel__podium-slot--first .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
}

body.dark .leaderboard-panel__podium-slot--second .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.7), rgba(59, 130, 246, 0.95));
}

body.dark .leaderboard-panel__podium-slot--third .leaderboard-panel__pedestal {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.65), rgba(239, 68, 68, 0.9));
}
</style>

