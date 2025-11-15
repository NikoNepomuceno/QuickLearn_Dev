import { getCurrentUser } from '@/services/authService'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function authFetch(path, options = {}) {
	const headers = options.headers || {}
	if (!headers['Content-Type'] && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
	return fetch(`${API}${path}`, {
		credentials: 'include',
		headers,
		...options
	}).then(async r => {
		if (!r.ok) throw new Error(await r.text())
		return r.json()
	})
}

export async function searchUsers(query) {
	const res = await authFetch(`/api/friends/search?query=${encodeURIComponent(query)}`)
	return res.users || []
}

export async function sendFriendRequest(toUserId) {
	await authFetch('/api/friends/requests', { method: 'POST', body: JSON.stringify({ toUserId }) })
}

export async function getFriends() {
	const res = await authFetch('/api/friends')
	return res.friends || []
}

export async function getLeaderboard() {
	const res = await authFetch('/api/leaderboard')
	return res.data || []
}

export async function getFriendRequests() {
	const res = await authFetch('/api/friends/requests')
	return res.requests || []
}

export async function acceptFriendRequest(requestId) {
	await authFetch(`/api/friends/requests/${requestId}/accept`, { method: 'POST' })
}

export async function declineFriendRequest(requestId) {
	await authFetch(`/api/friends/requests/${requestId}/decline`, { method: 'POST' })
}

export async function getPendingRequestsCount() {
	const res = await authFetch('/api/friends/requests/count')
	return res.count || 0
}

export async function getUserAchievements() {
	const res = await authFetch('/api/achievements/me')
	return res.achievements || []
}

export async function getAllAchievements() {
	const res = await authFetch('/api/achievements/all')
	return res
}

export async function getAchievementProgress(achievementCode) {
	const res = await authFetch(`/api/achievements/${achievementCode}/progress`)
	return res
}

