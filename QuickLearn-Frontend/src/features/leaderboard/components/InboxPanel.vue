<template>
  <BaseCard padding="md" class="inbox-panel">
    <template #title>Friend Requests</template>

    <div v-if="loading" class="inbox-panel__empty">Loading…</div>
    <div v-else-if="requests.length === 0" class="inbox-panel__empty">
      No pending friend requests
    </div>
    <ul v-else class="inbox-panel__list">
      <li v-for="request in requests" :key="request.requestId" class="inbox-panel__item">
        <div class="inbox-panel__profile">
          <span class="avatar">
            <template v-if="request.fromUser.profilePicture">
              <img :src="request.fromUser.profilePicture" alt="" />
            </template>
            <template v-else>
              {{ request.fromUser.displayName.charAt(0).toUpperCase() }}
            </template>
          </span>
          <div class="inbox-panel__details">
            <div class="inbox-panel__name">{{ request.fromUser.displayName }}</div>
            <div class="text-sm text-muted">@{{ request.fromUser.username }}</div>
            <div class="inbox-panel__timestamp">{{ formatTime(request.createdAt) }}</div>
          </div>
        </div>
        <div class="inbox-panel__actions">
          <BaseButton
            size="sm"
            variant="primary"
            :loading="request.processing"
            @click="handleAccept(request.requestId)"
          >
            Accept
          </BaseButton>
          <BaseButton
            size="sm"
            variant="ghost"
            :loading="request.processing"
            @click="handleDecline(request.requestId)"
          >
            Decline
          </BaseButton>
        </div>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../services/leaderboard.api'

const requests = ref([])
const loading = ref(false)

const emit = defineEmits(['requestsViewed', 'requestUpdated'])

onMounted(async () => {
	await loadRequests()
	emit('requestsViewed')
})

async function loadRequests() {
	loading.value = true
	try {
		requests.value = await getFriendRequests()
	} catch (error) {
		console.error('Failed to load friend requests:', error)
	} finally {
		loading.value = false
	}
}

async function handleAccept(requestId) {
	const request = requests.value.find(r => r.requestId === requestId)
	if (request) request.processing = true

	try {
		await acceptFriendRequest(requestId)
		requests.value = requests.value.filter(r => r.requestId !== requestId)
		emit('requestUpdated')
	} catch (error) {
		console.error('Failed to accept request:', error)
		if (request) request.processing = false
	}
}

async function handleDecline(requestId) {
	const request = requests.value.find(r => r.requestId === requestId)
	if (request) request.processing = true

	try {
		await declineFriendRequest(requestId)
		requests.value = requests.value.filter(r => r.requestId !== requestId)
		emit('requestUpdated')
	} catch (error) {
		console.error('Failed to decline request:', error)
		if (request) request.processing = false
	}
}

function formatTime(timestamp) {
	const now = new Date()
	const date = new Date(timestamp)
	const diff = now - date
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (days > 0) return `${days}d ago`
	if (hours > 0) return `${hours}h ago`
	if (minutes > 0) return `${minutes}m ago`
	return 'Just now'
}
</script>

<style scoped>
.inbox-panel__empty {
  padding: var(--space-5);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.inbox-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.inbox-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.inbox-panel__item:first-child {
  border-top: none;
  padding-top: 0;
}

.inbox-panel__profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.inbox-panel__details {
  display: grid;
  gap: 2px;
}

.inbox-panel__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.inbox-panel__timestamp {
  font-size: var(--font-size-xs);
  color: var(--color-text-soft);
  margin-top: 2px;
}

.inbox-panel__actions {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
}

@media (max-width: 768px) {
  .inbox-panel__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .inbox-panel__actions {
    width: 100%;
  }

  .inbox-panel__actions > .base-button {
    flex: 1;
  }
}

body.dark .inbox-panel__item {
  border-top-color: #1f2a44;
}

body.dark .inbox-panel__timestamp {
  color: #9ca3af;
}
</style>

