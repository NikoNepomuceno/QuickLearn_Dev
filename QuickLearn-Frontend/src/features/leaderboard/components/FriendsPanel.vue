<template>
	<div>
		<!-- Search and Add Friends -->
		<div class="search-container">
			<div class="flex gap-2 mb-4">
				<input 
					v-model="query" 
					@input="onSearch" 
					@focus="showDropdown = true"
					@blur="handleBlur"
					type="text" 
					placeholder="Search username to add friends..." 
					style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:10px;" 
				/>
			</div>
			
			<!-- Dropdown Results -->
			<div v-if="showDropdown && query" class="search-dropdown">
				<div v-if="loading" class="text-sm" style="color:#6b7280;padding:12px;">Searching…</div>
				<div v-else-if="results.length === 0" class="text-sm" style="color:#6b7280;padding:12px;">No users found</div>
				<div v-else>
					<div 
						v-for="u in results" 
						:key="u.userId" 
						class="dropdown-item"
						@mousedown.prevent="sendRequest(u.userId)"
					>
						<div class="flex items-center gap-4">
							<div class="avatar small">
								<img v-if="u.profilePicture" :src="u.profilePicture" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
							</div>
							<div>
								<div class="font-semibold">{{ u.displayName }}</div>
								<div class="text-sm" style="color:#6b7280">@{{ u.username }}</div>
							</div>
						</div>
						<button class="btn">Add friend</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Friends List -->
		<div class="panel" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
			<h2 class="text-lg font-semibold" style="margin-bottom:8px;">My Friends</h2>
			<div v-if="friendsLoading" class="text-sm" style="color:#6b7280">Loading…</div>
			<div v-else-if="friends.length === 0" class="text-sm" style="color:#6b7280">You haven't added any friends yet.</div>
			<div v-else>
				<div v-for="f in friends" :key="f.userId" class="flex items-center justify-between" style="padding:10px 0;border-top:1px solid #f3f4f6;">
					<div class="flex items-center gap-4">
						<div class="avatar small">
							<img v-if="f.profilePicture" :src="f.profilePicture" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
						</div>
						<div>
							<div class="font-semibold">{{ f.displayName }}</div>
							<div class="text-sm" style="color:#6b7280">@{{ f.username }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { searchUsers, sendFriendRequest, getFriends } from '../services/leaderboard.api'

const query = ref('')
const results = ref([])
const loading = ref(false)
const showDropdown = ref(false)

const friends = ref([])
const friendsLoading = ref(false)

onMounted(async () => {
	await loadFriends()
})

async function loadFriends() {
	friendsLoading.value = true
	try {
		friends.value = await getFriends()
	} finally {
		friendsLoading.value = false
	}
}

let t
function onSearch() {
	clearTimeout(t)
	loading.value = true
	t = setTimeout(async () => {
		results.value = query.value ? await searchUsers(query.value) : []
		loading.value = false
	}, 300)
}

async function sendRequest(userId) {
	await sendFriendRequest(userId)
	// Close dropdown and clear search after sending request
	showDropdown.value = false
	query.value = ''
	results.value = []
	// Reload friends list
	await loadFriends()
}

function handleBlur() {
	// Delay to allow click event to fire first
	setTimeout(() => {
		showDropdown.value = false
	}, 200)
}
</script>

<style scoped>
.search-container {
	position: relative;
}

.search-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	background: #fff;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	max-height: 400px;
	overflow-y: auto;
	z-index: 50;
	margin-top: 4px;
}

.dropdown-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid #f3f4f6;
	cursor: pointer;
	transition: background-color 0.15s;
}

.dropdown-item:last-child {
	border-bottom: none;
}

.dropdown-item:hover {
	background-color: #f9fafb;
}

.btn {
	padding: 8px 12px;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	background: #ffffff;
	cursor: pointer;
	transition: all 0.2s;
	color: #1f2937;
}

.btn:hover {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: #fff;
	border-color: transparent;
}

.avatar.small {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: 1px solid #e5e7eb;
}

/* Dark Mode */
body.dark .panel {
	background: #0f172a !important;
	border-color: #1f2a44 !important;
}

body.dark h2 {
	color: #e5e7eb;
}

body.dark .search-dropdown {
	background: #0f172a;
	border-color: #1f2a44;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 6px 12px rgba(0, 0, 0, 0.4);
}

body.dark .dropdown-item {
	border-bottom-color: #1f2a44;
}

body.dark .dropdown-item:hover {
	background-color: #1f2a44;
}

body.dark .btn {
	background: #0b1222;
	border-color: #1f2a44;
	color: #e5e7eb;
}

body.dark .btn:hover {
	background: linear-gradient(135deg, var(--primary-light), var(--primary-main));
	color: #fff;
	border-color: transparent;
}

body.dark .avatar.small {
	border-color: #1f2a44;
}

body.dark .text-sm {
	color: #9ca3af !important;
}

body.dark .font-semibold {
	color: #e5e7eb;
}
</style>

