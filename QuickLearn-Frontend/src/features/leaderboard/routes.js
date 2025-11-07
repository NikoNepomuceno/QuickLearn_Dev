import Leaderboards from './pages/Leaderboards.vue'

export const leaderboardRoutes = [
	{ path: '/leaderboards', name: 'leaderboards', component: Leaderboards, meta: { requiresAuth: true } }
]

