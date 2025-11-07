import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useLeaderboardSocket(onUpdate) {
	const socket = io(API, {
		transports: ['websocket'],
		withCredentials: true
	})

	function handleUpdate(payload) {
		try { onUpdate && onUpdate(payload) } catch {}
	}

	socket.on('connect_error', () => {})
	socket.on('leaderboard:update', handleUpdate)

	socket.emit('leaderboard:subscribe')

	return function close() {
		socket.off('leaderboard:update', handleUpdate)
		socket.close()
	}
}


