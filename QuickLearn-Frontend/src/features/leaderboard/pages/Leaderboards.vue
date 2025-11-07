<template>
	<div class="layout">
		<Sidebar />
		<div class="leaderboards-page">
			<h1 class="text-2xl font-bold mb-4">Leaderboards</h1>
			<div class="panel" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
				<div class="flex gap-4 mb-4">
					<button
						class="btn"
						:class="{ active: activeTab === 'friends' }"
						@click="activeTab = 'friends'"
					>
						View Friends
					</button>
					<button
						class="btn"
						:class="{ active: activeTab === 'leaderboard' }"
						@click="activeTab = 'leaderboard'"
					>
						Leaderboard
					</button>
					<button
						class="btn btn-with-badge"
						:class="{ active: activeTab === 'inbox' }"
						@click="handleInboxClick"
					>
						Inbox
						<span v-if="badgeCount > 0" class="badge">{{ badgeCount }}</span>
					</button>
				</div>
				<div>
					<FriendsPanel v-if="activeTab === 'friends'" />
					<LeaderboardPanel v-else-if="activeTab === 'leaderboard'" />
					<InboxPanel 
						v-else-if="activeTab === 'inbox'" 
						@requests-viewed="clearBadge"
						@request-updated="fetchRequestsCount"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import FriendsPanel from '../components/FriendsPanel.vue'
import LeaderboardPanel from '../components/LeaderboardPanel.vue'
import InboxPanel from '../components/InboxPanel.vue'
import { getPendingRequestsCount } from '../services/leaderboard.api'

const activeTab = ref('leaderboard')
const badgeCount = ref(0)

onMounted(async () => {
	await fetchRequestsCount()
	// Poll for new requests every 30 seconds
	setInterval(fetchRequestsCount, 30000)
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
.layout { display: flex; min-height: 100vh; }
.leaderboards-page {
	flex: 1;
	margin: 0;
	padding: 24px;
	background:
		radial-gradient(1000px 600px at 20% -10%, rgba(102, 126, 234, 0.12), transparent 60%),
		radial-gradient(900px 500px at 120% 10%, rgba(118, 75, 162, 0.1), transparent 60%);
}
.btn {
	padding: 10px 14px;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	background: #ffffff;
	cursor: pointer;
	transition: all 0.2s;
	color: #1f2937;
}
.btn.active {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: #fff;
	border-color: transparent;
	box-shadow: var(--primary-glow);
}
.btn-with-badge {
	position: relative;
}
.badge {
	position: absolute;
	top: -6px;
	right: -6px;
	background: linear-gradient(135deg, #ef4444, #dc2626);
	color: white;
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
	0%, 100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
}

/* Dark Mode */
body.dark .leaderboards-page {
	background:
		radial-gradient(1000px 600px at 20% -10%, rgba(102, 126, 234, 0.1), transparent 60%),
		radial-gradient(900px 500px at 120% 10%, rgba(118, 75, 162, 0.08), transparent 60%);
}

body.dark .leaderboards-page h1 {
	color: #e5e7eb;
}

body.dark .panel {
	background: #0f172a !important;
	border-color: #1f2a44 !important;
	box-shadow:
		0 10px 25px rgba(0, 0, 0, 0.35),
		0 6px 12px rgba(0, 0, 0, 0.3);
}

body.dark .btn {
	background: #0b1222;
	border-color: #1f2a44;
	color: #e5e7eb;
}

body.dark .btn:hover:not(.active) {
	background: #1f2a44;
	border-color: #334466;
}

body.dark .btn.active {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: #fff;
	border-color: transparent;
}
</style>

