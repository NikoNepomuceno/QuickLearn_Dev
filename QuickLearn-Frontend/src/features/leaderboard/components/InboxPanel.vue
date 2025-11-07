<template>
	<div>
		<div class="panel" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
			<h2 class="text-lg font-semibold mb-4">Friend Requests</h2>
			
			<div v-if="loading" class="text-sm" style="color:#6b7280;text-align:center;padding:20px;">
				Loading...
			</div>
			
			<div v-else-if="requests.length === 0" class="text-sm" style="color:#6b7280;text-align:center;padding:20px;">
				No pending friend requests
			</div>
			
			<div v-else>
				<div 
					v-for="request in requests" 
					:key="request.requestId" 
					class="request-item"
				>
					<div class="flex items-center gap-4">
						<div class="avatar">
							<img 
								v-if="request.fromUser.profilePicture" 
								:src="request.fromUser.profilePicture" 
								alt="" 
								style="width:100%;height:100%;object-fit:cover;border-radius:50%;" 
							/>
							<div v-else class="avatar-placeholder">
								{{ request.fromUser.displayName.charAt(0).toUpperCase() }}
							</div>
						</div>
						<div class="flex-1">
							<div class="font-semibold">{{ request.fromUser.displayName }}</div>
							<div class="text-sm" style="color:#6b7280">@{{ request.fromUser.username }}</div>
							<div class="text-xs" style="color:#9ca3af;margin-top:4px;">{{ formatTime(request.createdAt) }}</div>
						</div>
					</div>
					
					<div class="flex gap-2">
						<button 
							class="btn btn-accept" 
							@click="handleAccept(request.requestId)"
							:disabled="request.processing"
						>
							Accept
						</button>
						<button 
							class="btn btn-decline" 
							@click="handleDecline(request.requestId)"
							:disabled="request.processing"
						>
							Decline
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../services/leaderboard.api'

const requests = ref([])
const loading = ref(false)

const emit = defineEmits(['requestsViewed', 'requestUpdated'])

onMounted(async () => {
	await loadRequests()
	// Emit event to clear badge when inbox is viewed
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
		// Remove from list
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
		// Remove from list
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
.request-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	border-top: 1px solid #f3f4f6;
	gap: 16px;
}

.request-item:first-child {
	border-top: none;
}

.avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	border: 1px solid #e5e7eb;
	overflow: hidden;
	flex-shrink: 0;
}

.avatar-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: white;
	font-weight: 600;
	font-size: 20px;
}

.btn {
	padding: 8px 16px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	background: #ffffff;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	transition: all 0.2s;
	color: #1f2937;
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-accept {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: white;
	border: none;
}

.btn-accept:hover:not(:disabled) {
	opacity: 0.9;
	transform: translateY(-1px);
}

.btn-decline {
	color: #6b7280;
}

.btn-decline:hover:not(:disabled) {
	background: #f3f4f6;
	border-color: #d1d5db;
}

.flex {
	display: flex;
}

.flex-1 {
	flex: 1;
}

.items-center {
	align-items: center;
}

.gap-2 {
	gap: 8px;
}

.gap-4 {
	gap: 16px;
}

/* Dark Mode */
body.dark .panel {
	background: #0f172a !important;
	border-color: #1f2a44 !important;
}

body.dark h2 {
	color: #e5e7eb;
}

body.dark .request-item {
	border-top-color: #1f2a44;
}

body.dark .avatar {
	border-color: #1f2a44;
}

body.dark .btn {
	background: #0b1222;
	border-color: #1f2a44;
	color: #e5e7eb;
}

body.dark .btn-accept {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: white;
	border: none;
}

body.dark .btn-decline {
	color: #9ca3af;
}

body.dark .btn-decline:hover:not(:disabled) {
	background: #1f2a44;
	border-color: #334466;
}

body.dark .text-sm,
body.dark .text-xs {
	color: #9ca3af !important;
}

body.dark .font-semibold {
	color: #e5e7eb;
}
</style>

