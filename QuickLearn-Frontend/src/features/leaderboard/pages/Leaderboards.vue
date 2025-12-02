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
        <!-- Leaderboard tab with sidebar layout -->
        <template v-if="activeTab === 'leaderboard'">
          <div class="leaderboard-container">
            <aside class="leaderboard-sidebar" role="complementary" aria-label="Leaderboard filters">
              <LeaderboardFilters
                :selected-category-key="activeCategoryKey"
                :grouped-categories="groupedCategories"
                :has-categories="hasCategories"
                @select-category="handleCategorySelect"
                @clear-filter="handleCategoryClear"
              />
            </aside>
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
                {{ leaderboardHelper }}
              </p>

              <div class="panel-body">
                <LeaderboardPanel />
              </div>
            </section>
          </div>
        </template>

        <!-- Other tabs without sidebar -->
        <template v-else>
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
                <span v-else-if="activeTab === 'achievements'">
                  View your earned achievements and track your progress toward unlocking new ones.
                </span>
                <span v-else>
                  Review friend requests and community invites waiting for your response.
                </span>
              </p>

              <div class="panel-body">
                <FriendsPanel v-if="activeTab === 'friends'" />
                <AchievementsPanel v-else-if="activeTab === 'achievements'" />
                <InboxPanel
                  v-else
                  @requests-viewed="clearBadge"
                  @request-updated="fetchRequestsCount"
                />
              </div>
            </section>
          </div>
        </template>
      </div>
    </Transition>
  </AppShell>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, Transition, computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppShell from '@/components/layout/AppShell.vue'
import FriendsPanel from '../components/FriendsPanel.vue'
import LeaderboardPanel from '../components/LeaderboardPanel.vue'
import LeaderboardFilters from '../components/LeaderboardFilters.vue'
import InboxPanel from '../components/InboxPanel.vue'
import AchievementsPanel from '../components/AchievementsPanel.vue'
import { getPendingRequestsCount } from '../services/leaderboard.api'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useLeaderboardStore } from '../store/leaderboard.store'

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
const leaderboardStore = useLeaderboardStore()
const { activeCategory, activeCategoryKey, availableCategories } = storeToRefs(leaderboardStore)
const activeCategoryLabel = computed(() => activeCategory.value?.categoryLabel || 'Overall')
const leaderboardHelper = computed(() => {
  if (!activeCategory.value) {
    return 'Track the top learners this week and stay motivated to climb the ranks.'
  }
  return `Comparing strengths in ${activeCategory.value.categoryLabel}.`
})

// Function to detect parent category from label
function detectParentCategory(categoryLabel) {
  const label = String(categoryLabel || '').toLowerCase()
  
  if (label.includes('next.js') || label.includes('nextjs') || label.includes('next ')) {
    return 'Next.js'
  }
  if (label.includes('react') && !label.includes('next')) {
    return 'React'
  }
  if (label.includes('angular')) {
    return 'Angular'
  }
  if (label.includes('vue')) {
    return 'Vue'
  }
  if (label.includes('spa') || label.includes('single page application')) {
    return 'SPA'
  }
  if (label.includes('lifecycle') || label.includes('life cycle')) {
    return 'Lifecycle'
  }
  if (
    label.includes('routing') ||
    label.includes('route') ||
    label.includes('navigation') ||
    label.includes('router')
  ) {
    return 'Routing'
  }
  if (label.includes('component') || label.includes('composition')) {
    return 'Components'
  }
  if (label.includes('data fetching') || label.includes('data fetch')) {
    return 'Data Fetching'
  }
  
  return 'Other'
}

// Group categories by parent
const groupedCategories = computed(() => {
  const categories = availableCategories.value || []
  const groups = new Map()
  
  categories.forEach(category => {
    const parent = detectParentCategory(category.categoryLabel)
    if (!groups.has(parent)) {
      groups.set(parent, {
        parentName: parent,
        categories: [],
        totalPoints: 0
      })
    }
    const group = groups.get(parent)
    group.categories.push(category)
    group.totalPoints += category.totalPoints || 0
  })
  
  return Array.from(groups.values())
    .map(group => ({
      ...group,
      categories: group.categories.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
})

const hasCategories = computed(() => (availableCategories.value || []).length > 0)

function handleCategorySelect(categoryKey) {
  leaderboardStore.setCategory(categoryKey)
}

function handleCategoryClear() {
  leaderboardStore.setCategory(null)
}

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
  gap: var(--space-6);
  padding: var(--space-7);
  min-height: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: start;
}

.main-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-7);
  box-shadow: var(--shadow-md);
  display: grid;
  gap: var(--space-5);
}

.main-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.main-panel__headline h3 {
  margin: 0 0 var(--space-2);
  font-family: var(--font-family-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-heading);
  letter-spacing: var(--letter-spacing-tight);
  text-transform: capitalize;
}

.main-panel__headline p {
  margin: 0;
  max-width: 520px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  color: var(--color-paragraph);
  line-height: var(--line-height-base);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.tab-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.btn {
  padding: var(--space-2) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.5;
  color: var(--color-text);
  letter-spacing: 0.01em;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  background: var(--color-surface-emphasis);
}

.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
  box-shadow: var(--primary-glow);
}

.btn.active:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-with-badge {
  position: relative;
}

.tab-helper {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);
  color: var(--color-text-muted);
}

.tab-helper__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: rgba(102, 126, 234, 0.12);
  color: var(--color-primary);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.panel-body {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  min-height: 320px;
}

.leaderboard-container {
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
  gap: clamp(20px, 2vw, 32px);
  align-items: start;
  position: relative;
}

.leaderboard-sidebar {
  position: sticky;
  top: var(--space-5);
  align-self: start;
  height: fit-content;
  max-height: calc(100vh - var(--space-10));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}

.leaderboard-sidebar::-webkit-scrollbar {
  width: 6px;
}

.leaderboard-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.leaderboard-sidebar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.leaderboard-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-danger);
  color: var(--color-text-on-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-2);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: pulse 2s infinite;
  border: 2px solid var(--color-surface);
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
    padding: var(--space-4);
    gap: var(--space-4);
  }

  .main-panel {
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    gap: var(--space-4);
  }

  .main-panel__header {
    gap: var(--space-4);
  }

  .main-panel__headline h3 {
    font-size: var(--font-size-lg);
  }

  .main-panel__headline p {
    font-size: var(--font-size-sm);
    max-width: 100%;
  }

  .tab-group {
    gap: var(--space-2);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: var(--space-1);
  }

  .tab-group::-webkit-scrollbar {
    display: none;
  }

  .btn {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    min-height: 44px;
    flex-shrink: 0;
  }

  .tab-helper {
    font-size: var(--font-size-xs);
  }

  .panel-body {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    min-height: 280px;
  }

  .leaderboard-container {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .leaderboard-sidebar {
    position: static;
  }

  .badge {
    font-size: 10px;
    min-width: 18px;
    height: 18px;
    padding: 0 var(--space-1);
    top: -4px;
    right: -4px;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .leaderboards-page {
    padding: var(--space-3);
    gap: var(--space-3);
  }

  .main-panel {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    gap: var(--space-3);
  }

  .main-panel__header {
    gap: var(--space-3);
  }

  .main-panel__headline h3 {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-2);
  }

  .main-panel__headline p {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-base);
  }

  .tab-group {
    gap: var(--space-2);
  }

  .btn {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    min-height: 42px;
  }

  .tab-helper {
    font-size: 11px;
    line-height: var(--line-height-base);
  }

  .panel-body {
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    min-height: 240px;
  }
}

/* Extra small mobile */
@media (max-width: 360px) {
  .leaderboards-page {
    padding: var(--space-2);
  }

  .main-panel {
    padding: var(--space-3);
  }

  .main-panel__headline h3 {
    font-size: var(--font-size-sm);
  }

  .btn {
    padding: var(--space-2) var(--space-3);
    font-size: 11px;
  }

  .panel-body {
    padding: var(--space-3);
  }
}

/* Dark mode styles with improved contrast */
body.dark .main-panel__headline h3 {
  color: var(--color-heading);
}

body.dark .main-panel__headline p {
  color: var(--color-paragraph);
}

body.dark .tab-helper {
  color: var(--color-text-muted);
}

body.dark .tab-helper__chip {
  background: rgba(102, 126, 234, 0.2);
  color: var(--color-primary-soft);
  border-color: rgba(102, 126, 234, 0.3);
}

body.dark .content-grid .main-panel {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: var(--shadow-lg);
}

body.dark .panel-body {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .btn {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

body.dark .btn:hover {
  color: var(--color-primary-soft);
  border-color: var(--color-primary);
  background: var(--color-surface-emphasis);
  box-shadow: var(--shadow-sm);
}

body.dark .btn.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
}

body.dark .btn.active:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

body.dark .badge {
  border-color: var(--color-surface);
}

body.dark .leaderboard-sidebar {
  scrollbar-color: rgba(148, 163, 184, 0.2) transparent;
}

body.dark .leaderboard-sidebar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
}

body.dark .leaderboard-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
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
  background: rgba(0, 0, 0, 0.5);
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
  padding: var(--space-5);
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
    padding: var(--space-4);
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
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
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

