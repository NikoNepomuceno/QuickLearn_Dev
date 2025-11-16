<template>
  <AppShell
    title="Leaderboards"
    subtitle="Track your progress and connect with the community."
    content-width="wide"
  >
    <!-- Animation Overlay -->
    <div v-if="showAnimation" class="loading-overlay">
      <div class="loading-content">
        <DotLottieVue
          src="https://lottie.host/c9a79438-794c-4085-9fc2-2d9646a06ba7/ICInAK6k3O.lottie"
          class="loading-animation"
          autoplay
          loop
        />
      </div>
    </div>

    <Transition name="fade" appear>
      <div v-if="!showAnimation" class="leaderboards-page">
        <div class="content-grid">
        <section class="main-panel">
          <header class="main-panel__header">
            <div class="main-panel__headline">
              <h3>Community leaderboards</h3>
              <p>Switch between views to compare your impact with friends and the wider community.</p>
            </div>
          </header>

          <nav class="tab-group" role="tablist" aria-label="Leaderboard views">
            <button
              class="btn"
              :class="{ active: activeTab === 'friends' }"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'friends'"
              :tabindex="activeTab === 'friends' ? 0 : -1"
              @click="activeTab = 'friends'"
            >
              View friends
            </button>
            <button
              class="btn"
              :class="{ active: activeTab === 'leaderboard' }"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'leaderboard'"
              :tabindex="activeTab === 'leaderboard' ? 0 : -1"
              @click="activeTab = 'leaderboard'"
            >
              Leaderboard
            </button>
            <button
              class="btn"
              :class="{ active: activeTab === 'achievements' }"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'achievements'"
              :tabindex="activeTab === 'achievements' ? 0 : -1"
              @click="activeTab = 'achievements'"
            >
              Achievements
            </button>
            <button
              class="btn btn-with-badge"
              :class="{ active: activeTab === 'inbox' }"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'inbox'"
              :tabindex="activeTab === 'inbox' ? 0 : -1"
              @click="handleInboxClick"
            >
              Inbox
              <span v-if="badgeCount > 0" class="badge">{{ badgeCount }}</span>
            </button>
          </nav>

          <p class="tab-helper">
            <span v-if="activeTab === 'friends'">
              Check in on your friends, celebrate wins, and offer encouragement.
            </span>
            <span v-else-if="activeTab === 'leaderboard'">
              Track the top learners this week and stay motivated to climb the ranks.
            </span>
            <span v-else-if="activeTab === 'achievements'">
              View your earned achievements and track your progress toward unlocking new ones.
            </span>
            <span v-else>
              Review friend requests and community invites waiting for your response.
            </span>
          </p>

          <div class="panel-body">
            <FriendsPanel v-if="activeTab === 'friends'" />
            <LeaderboardPanel v-else-if="activeTab === 'leaderboard'" />
            <AchievementsPanel v-else-if="activeTab === 'achievements'" />
            <InboxPanel
              v-else
              @requests-viewed="clearBadge"
              @request-updated="fetchRequestsCount"
            />
          </div>
        </section>
      </div>
      </div>
    </Transition>
  </AppShell>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, Transition } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import FriendsPanel from '../components/FriendsPanel.vue'
import LeaderboardPanel from '../components/LeaderboardPanel.vue'
import InboxPanel from '../components/InboxPanel.vue'
import AchievementsPanel from '../components/AchievementsPanel.vue'
import { getPendingRequestsCount } from '../services/leaderboard.api'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const activeTab = ref('leaderboard')
const badgeCount = ref(0)

// Check if animation has been shown before (using sessionStorage so it clears on browser close)
const ANIMATION_STORAGE_KEY = 'leaderboard-animation-shown'
const hasSeenAnimation = () => {
  try {
    return sessionStorage.getItem(ANIMATION_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const showAnimation = ref(!hasSeenAnimation())
let animationTimeout = null

let pollHandle

onMounted(async () => {
  // Start fetching data in parallel
  fetchRequestsCount()
  pollHandle = window.setInterval(fetchRequestsCount, 30000)

  // Hide animation after it plays (3 seconds) and mark as shown
  if (showAnimation.value) {
    animationTimeout = setTimeout(() => {
      showAnimation.value = false
      try {
        sessionStorage.setItem(ANIMATION_STORAGE_KEY, 'true')
      } catch (error) {
        console.warn('Failed to save animation state:', error)
      }
    }, 3000)
  }
})

onBeforeUnmount(() => {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = undefined
  }
  if (animationTimeout) {
    clearTimeout(animationTimeout)
    animationTimeout = null
  }
})

async function fetchRequestsCount() {
  try {
    badgeCount.value = await getPendingRequestsCount()
  } catch (error) {
    console.error('Failed to fetch pending requests count:', error)
  }
}

function handleInboxClick() {
  activeTab.value = 'inbox'
}

function clearBadge() {
  badgeCount.value = 0
}
</script>

<style scoped>
.leaderboards-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  min-height: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}

.main-panel {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 24px;
  padding: 28px;
  box-shadow:
    0 20px 60px rgba(15, 23, 42, 0.1),
    0 10px 25px rgba(15, 23, 42, 0.04);
  display: grid;
  gap: 20px;
}

.main-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 24px;
}

.main-panel__headline h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  text-transform: capitalize;
}

.main-panel__headline p {
  margin: 0;
  max-width: 520px;
  color: #4b5563;
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tab-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn {
  padding: 10px 18px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  border-radius: 999px;
  background: #ffffff;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border 0.2s ease,
    box-shadow 0.2s ease, transform 0.2s ease;
  color: #1f2937;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.btn:hover {
  transform: translateY(-1px);
  border-color: rgba(79, 70, 229, 0.4);
  color: var(--primary-main);
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.12);
}

.btn.active {
  background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
  color: #ffffff;
  border-color: transparent;
  box-shadow: var(--primary-glow);
}

.btn-with-badge {
  position: relative;
}

.tab-helper {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
}

.panel-body {
  background: #f8fafc;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.7);
  min-height: 320px;
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

/* Tablet and below */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Mobile landscape and below */
@media (max-width: 768px) {
  .leaderboards-page {
    padding: 16px;
    gap: 16px;
  }

  .main-panel {
    padding: 20px;
    border-radius: 20px;
    gap: 16px;
  }

  .main-panel__header {
    gap: 16px;
  }

  .main-panel__headline h3 {
    font-size: 18px;
  }

  .main-panel__headline p {
    font-size: 14px;
    max-width: 100%;
  }

  .tab-group {
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 4px;
  }

  .tab-group::-webkit-scrollbar {
    display: none;
  }

  .btn {
    padding: 10px 16px;
    font-size: 14px;
    white-space: nowrap;
    min-height: 44px;
    flex-shrink: 0;
  }

  .tab-helper {
    font-size: 13px;
  }

  .panel-body {
    padding: 16px;
    border-radius: 16px;
    min-height: 280px;
  }

  .badge {
    font-size: 10px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    top: -4px;
    right: -4px;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .leaderboards-page {
    padding: 12px;
    gap: 12px;
  }

  .main-panel {
    padding: 16px;
    border-radius: 16px;
    gap: 14px;
  }

  .main-panel__header {
    gap: 12px;
  }

  .main-panel__headline h3 {
    font-size: 16px;
    margin-bottom: 6px;
  }

  .main-panel__headline p {
    font-size: 13px;
    line-height: 1.5;
  }

  .tab-group {
    gap: 6px;
  }

  .btn {
    padding: 10px 14px;
    font-size: 13px;
    min-height: 42px;
  }

  .tab-helper {
    font-size: 12px;
    line-height: 1.5;
  }

  .panel-body {
    padding: 14px;
    border-radius: 12px;
    min-height: 240px;
  }
}

/* Extra small mobile */
@media (max-width: 360px) {
  .leaderboards-page {
    padding: 10px;
  }

  .main-panel {
    padding: 14px;
  }

  .main-panel__headline h3 {
    font-size: 15px;
  }

  .btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .panel-body {
    padding: 12px;
  }
}

body.dark .main-panel__headline h3 {
  color: #f8fafc;
}

body.dark .main-panel__headline p,
body.dark .tab-helper {
  color: #cbd5f5;
}

body.dark .content-grid .main-panel {
  background: #0f172a;
  border-color: rgba(30, 41, 59, 0.8);
  box-shadow:
    0 24px 60px rgba(2, 6, 23, 0.7),
    0 10px 24px rgba(2, 6, 23, 0.5);
}

body.dark .panel-body {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(30, 41, 59, 0.7);
}

body.dark .btn {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(63, 76, 107, 0.7);
  color: #e2e8f0;
}

body.dark .btn:hover {
  color: #ffffff;
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 15px 28px rgba(129, 140, 248, 0.25);
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .btn {
    min-height: 44px;
  }

  .btn:active {
    transform: translateY(0);
    opacity: 0.8;
  }

  .btn:hover {
    transform: none;
  }
}

/* Landscape orientation adjustments */
@media (max-width: 768px) and (orientation: landscape) {
  .leaderboards-page {
    padding: 12px;
  }

  .main-panel {
    padding: 16px;
  }

  .panel-body {
    min-height: 200px;
  }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px) saturate(180%);
  -webkit-backdrop-filter: blur(8px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.loading-content {
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-animation {
  width: 300px;
  height: 300px;
  max-width: 90vw;
  max-height: 90vw;
}

@media (max-width: 768px) {
  .loading-animation {
    width: 250px;
    height: 250px;
  }
}

@media (max-width: 480px) {
  .loading-animation {
    width: 200px;
    height: 200px;
  }

  .loading-content {
    padding: 16px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Dark mode for loading overlay */
body.dark .loading-overlay {
  background: rgba(15, 23, 42, 0.9);
}

/* Fade-in transition for page content */
.fade-enter-active {
  transition: opacity 0.5s ease-out;
}

.fade-enter-from {
  opacity: 0;
}

.fade-enter-to {
  opacity: 1;
}
</style>

