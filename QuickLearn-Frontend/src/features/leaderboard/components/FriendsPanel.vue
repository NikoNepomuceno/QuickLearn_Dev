<template>
  <section class="friends-panel">
    <div class="friends-panel__search">
      <BaseInput
        v-model="query"
        placeholder="Search username to add friends..."
        @focus="handleFocus"
        @blur="handleBlur"
        class="friends-panel__search-input"
      >
        <template #prefix>
          <Search :size="16" aria-hidden="true" />
        </template>
      </BaseInput>

      <div v-if="showDropdown && query" class="friends-panel__dropdown">
        <div v-if="loading" class="friends-panel__empty">Searching…</div>
        <div v-else-if="results.length === 0" class="friends-panel__empty">No users found</div>
        <ul v-else class="friends-panel__results" role="listbox">
          <li
            v-for="u in results"
            :key="u.userId"
            class="friends-panel__result"
          >
            <div class="friends-panel__result-info">
              <span class="avatar avatar--sm">
                <template v-if="u.profilePicture">
                  <img :src="u.profilePicture" alt="" />
                </template>
                <template v-else>
                  {{ u.displayName.charAt(0).toUpperCase() }}
                </template>
              </span>
              <div>
                <div class="friends-panel__name">{{ u.displayName }}</div>
                <div class="text-sm text-muted">@{{ u.username }}</div>
              </div>
            </div>
            <BaseButton
              v-if="u.requestStatus === 'pending'"
              variant="outline"
              size="sm"
              disabled
            >
              <Clock :size="16" aria-hidden="true" />
              <span>Friend request sent</span>
            </BaseButton>
            <BaseButton
              v-else
              variant="outline"
              size="sm"
              @mousedown.prevent="sendRequest(u.userId)"
            >
              <UserPlus :size="16" aria-hidden="true" />
              <span>Add friend</span>
            </BaseButton>
          </li>
        </ul>
      </div>
    </div>

    <BaseCard padding="md" class="friends-panel__card">
      <template #title>My Friends</template>

      <div v-if="friendsLoading" class="friends-panel__empty">Loading…</div>
      <div v-else-if="friends.length === 0" class="friends-panel__empty">
        You haven't added any friends yet.
      </div>
      <ul v-else class="friends-panel__list">
        <li v-for="f in friends" :key="f.userId" class="friends-panel__item">
          <div class="friends-panel__profile">
            <span class="avatar avatar--sm">
              <template v-if="f.profilePicture">
                <img :src="f.profilePicture" alt="" />
              </template>
              <template v-else>
                {{ f.displayName.charAt(0).toUpperCase() }}
              </template>
            </span>
            <div>
              <div class="friends-panel__name">{{ f.displayName }}</div>
              <div class="text-sm text-muted">@{{ f.username }}</div>
            </div>
          </div>
        </li>
      </ul>
    </BaseCard>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { Search, UserPlus, Clock } from 'lucide-vue-next'
import { searchUsers, sendFriendRequest, getFriends } from '../services/leaderboard.api'

const query = ref('')
const results = ref([])
const loading = ref(false)
const showDropdown = ref(false)

const friends = ref([])
const friendsLoading = ref(false)

let debounceTimer

onMounted(async () => {
	await loadFriends()
})

watch(query, () => {
	clearTimeout(debounceTimer)
	if (!query.value) {
		results.value = []
		loading.value = false
		return
	}
	loading.value = true
	debounceTimer = setTimeout(async () => {
		results.value = await searchUsers(query.value)
		loading.value = false
	}, 300)
})

async function loadFriends() {
	friendsLoading.value = true
	try {
		friends.value = await getFriends()
	} finally {
		friendsLoading.value = false
	}
}

async function sendRequest(userId) {
	try {
		await sendFriendRequest(userId)
		// Find the user's display name for the toast message
		const user = results.value.find(u => u.userId === userId)
		const userName = user?.displayName || 'Friend'
		window.$toast?.success(`Friend request sent to ${userName} successfully!`)
		// Update the request status in the results so the button shows "Friend request sent"
		if (user) {
			user.requestStatus = 'pending'
		}
		await loadFriends()
	} catch (error) {
		console.error('Failed to send friend request:', error)
		window.$toast?.error('Failed to send friend request. Please try again.')
	}
}

function handleBlur() {
	setTimeout(() => {
		showDropdown.value = false
	}, 180)
}

function handleFocus() {
	showDropdown.value = true
}
</script>

<style scoped>
.friends-panel {
  display: grid;
  gap: var(--space-6);
}

.friends-panel__search {
  position: relative;
  display: grid;
  gap: var(--space-2);
}

.friends-panel__search-input :deep(.base-input__control) {
  padding-left: var(--space-2);
}

.friends-panel__dropdown {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  max-height: 22rem;
  overflow-y: auto;
  z-index: 10;
}

.friends-panel__results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.friends-panel__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  transition: background-color var(--transition-base);
}

.friends-panel__result:last-child {
  border-bottom: none;
}

.friends-panel__result:hover {
  background: rgba(148, 163, 184, 0.08);
}

.friends-panel__result-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.friends-panel__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.friends-panel__empty {
  padding: var(--space-4) var(--space-5);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.friends-panel__card :deep(h2) {
  margin: 0;
  font-size: var(--font-size-lg);
}

.friends-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.friends-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.friends-panel__item + .friends-panel__item {
  padding-top: var(--space-3);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.friends-panel__profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 768px) {
  .friends-panel__result {
    flex-direction: column;
    align-items: flex-start;
  }

  .friends-panel__result > .base-button {
    width: 100%;
  }
}

body.dark .friends-panel__dropdown {
  background: #0f172a;
  border-color: #1f2a44;
  box-shadow: var(--shadow-md);
}

body.dark .friends-panel__result {
  border-bottom-color: #1f2a44;
}

body.dark .friends-panel__result:hover {
  background: rgba(31, 41, 55, 0.75);
}

body.dark .friends-panel__empty {
  color: var(--color-text-muted);
}
</style>

