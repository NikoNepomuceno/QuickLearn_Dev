import { getCurrentUser } from '@/services/authService'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

async function authFetch(path, options = {}) {
	const headers = options.headers || {}
	if (!headers['Content-Type'] && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
	
	try {
		const response = await fetch(`${API}${path}`, {
			credentials: 'include',
			headers,
			...options
		})
		
		if (!response.ok) {
			// Extract actual error message from response
			let errorMessage = `Request failed with status ${response.status}`
			try {
				const errorData = await response.json()
				errorMessage = errorData.error || errorData.message || errorMessage
			} catch {
				try {
					const errorText = await response.text()
					if (errorText) errorMessage = errorText
				} catch {}
			}
			throw new Error(errorMessage)
		}
		
		return await response.json()
	} catch (error) {
		// Check for network/CORS errors
		if (error.message.includes('Failed to fetch') || 
			error.message.includes('NetworkError') ||
			error.name === 'TypeError' ||
			error.message.includes('Network request failed')) {
			console.error('Network error in leaderboard API:', {
				apiBase: API,
				path,
				error: error.message
			})
			throw new Error('Unable to connect to server. Please check your connection and try again.')
		}
		throw error
	}
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

