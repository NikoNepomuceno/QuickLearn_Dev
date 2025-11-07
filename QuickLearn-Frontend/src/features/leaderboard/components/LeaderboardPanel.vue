<template>
	<div class="grid">
		<div class="panel" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;grid-column: 1 / -1;">
			<h2 class="text-xl font-semibold mb-4">Top Friends</h2>
			<!-- Podium placeholder -->
			<div class="flex items-center justify-center gap-6 mb-6">
				<div v-for="(u, i) in podium" :key="u?.userId || i" class="text-center">
					<div class="avatar" :style="{ background: '#f3f4f6' }">
						<img v-if="u?.profilePicture" :src="u.profilePicture" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
					</div>
					<div class="text-sm mt-2">{{ u?.displayName || '—' }}</div>
					<div class="text-sm" style="color:#6b7280">{{ u?.points ?? 0 }} pts</div>
				</div>
			</div>
			<!-- List -->
			<div>
				<div v-for="u in leaderboard" :key="u.userId" class="flex items-center justify-between" style="padding:12px 0;border-top:1px solid #f3f4f6;">
					<div class="flex items-center gap-4">
						<div class="avatar small">
							<img v-if="u.profilePicture" :src="u.profilePicture" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
						</div>
						<div>
							<div class="font-semibold">{{ u.displayName }}</div>
							<div class="text-sm" style="color:#6b7280">@{{ u.username }}</div>
						</div>
					</div>
					<div class="font-semibold">{{ u.points }} pts</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getLeaderboard } from '../services/leaderboard.api'
import { useLeaderboardSocket } from '../services/socket'

const leaderboard = ref([])
const podium = ref([null, null, null])

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
	closeSocket && closeSocket()
})
</script>

<style scoped>
.avatar {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	border: 1px solid #e5e7eb;
}
.avatar.small {
	width: 40px;
	height: 40px;
}

/* Dark Mode */
body.dark .panel {
	background: #0f172a !important;
	border-color: #1f2a44 !important;
}

body.dark h2 {
	color: #e5e7eb;
}

body.dark .avatar {
	border-color: #1f2a44;
	background: #1f2a44 !important;
}

body.dark .text-sm,
body.dark .text-xl {
	color: #9ca3af !important;
}

body.dark .font-semibold {
	color: #e5e7eb;
}

body.dark .flex.items-center.justify-between {
	border-top-color: #1f2a44 !important;
}
</style>

