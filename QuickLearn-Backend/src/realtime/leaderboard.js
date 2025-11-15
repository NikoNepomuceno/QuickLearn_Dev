const { getPool } = require('../config/db');
const friendsCache = new Map(); 
const lbCache = new Map(); 
const lastBroadcastAt = new Map();

function nowMs() { return Date.now(); }
function getWithTtl(map, key) {
	const v = map.get(key);
	return v && v.exp > nowMs() ? v.data : null;
}
function setWithTtl(map, key, data, ttlMs) {
	map.set(key, { data, exp: nowMs() + ttlMs });
}

async function getFriendsOfUser(userId) {
	const pool = await getPool();
	const [rows] = await pool.execute(
		`SELECT CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END AS friend_id
		 FROM friend_requests fr
		 WHERE (fr.requester_id = ? OR fr.addressee_id = ?) AND fr.status = 'accepted'`,
		[userId, userId, userId]
	);
	return rows.map(r => Number(r.friend_id));
}

async function getUserPoints(userIds) {
	if (!userIds.length) return [];
	const pool = await getPool();
	
	// Get points from quiz attempts
	const [quizPoints] = await pool.query(
		`SELECT qa.user_id AS userId, COALESCE(SUM(COALESCE(qa.points_earned, qa.score)), 0) AS points
		 FROM quiz_attempts qa
		 WHERE qa.user_id IN (${userIds.map(() => '?').join(',')})
		 GROUP BY qa.user_id`,
		userIds
	);
	
	// Get points from achievements
	const [achievementPoints] = await pool.query(
		`SELECT ua.user_id AS userId, COALESCE(SUM(ua.points_earned), 0) AS points
		 FROM user_achievements ua
		 WHERE ua.user_id IN (${userIds.map(() => '?').join(',')})
		 GROUP BY ua.user_id`,
		userIds
	);
	
	// Combine both sources
	const quizMap = new Map(quizPoints.map(r => [Number(r.userId), Number(r.points)]));
	const achievementMap = new Map(achievementPoints.map(r => [Number(r.userId), Number(r.points)]));
	
	return userIds.map(id => ({ 
		userId: id, 
		points: (quizMap.get(id) || 0) + (achievementMap.get(id) || 0)
	}));
}

async function getUserBasicProfile(userIds) {
	if (!userIds.length) return [];
	const pool = await getPool();
	const [rows] = await pool.query(
		`SELECT id AS userId, username, COALESCE(display_name, username) AS displayName,
			COALESCE(profile_picture_url, '') AS profilePicture
		 FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
		userIds
	);
	return rows.map(r => ({
		userId: Number(r.userId),
		username: r.username,
		displayName: r.displayName,
		profilePicture: r.profilePicture
	}));
}

async function getLeaderboardForUser(userId) {
	// Get only accepted friends - this ensures we only show current user + their friends
	const friendIds = await getFriendsOfUser(userId);
	// Include current user + friends only (not all users)
	const all = Array.from(new Set([Number(userId), ...friendIds]));
	const [points, profiles] = await Promise.all([
		getUserPoints(all),
		getUserBasicProfile(all)
	]);
	const profileMap = new Map(profiles.map(p => [p.userId, p]));
	return points
		.map(({ userId: id, points }) => ({
			userId: id,
			points,
			...profileMap.get(id)
		}))
		.sort((a, b) => b.points - a.points);
}

async function getFriendsEffective(userId) {
	if (process.env.ENABLE_LB_CACHE === '1') {
		const hit = getWithTtl(friendsCache, userId);
		if (hit) return hit;
		const data = await getFriendsOfUser(userId);
		setWithTtl(friendsCache, userId, data, 15_000);
		return data;
	}
	return getFriendsOfUser(userId);
}

async function getLeaderboardEffective(userId) {
	if (process.env.ENABLE_LB_CACHE === '1') {
		const hit = getWithTtl(lbCache, userId);
		if (hit) return hit;
		const data = await getLeaderboardForUser(userId);
		setWithTtl(lbCache, userId, data, 5_000);
		return data;
	}
	return getLeaderboardForUser(userId);
}

function setupLeaderboardRealtime(io) {
	io.on('connection', socket => {
		const viewerId = Number(socket.data.userId);
		if (!viewerId) {
			return socket.disconnect(true);
		}
		socket.join(`leaderboard:${viewerId}`);

		socket.on('leaderboard:subscribe', async () => {
			try {
				const data = await getLeaderboardEffective(viewerId);
				socket.emit('leaderboard:update', { data });
			} catch (e) {}
		});

		socket.on('disconnect', () => {
		});
	});
}

async function broadcastLeaderboardFor(io, userId) {
	if (process.env.ENABLE_LB_CACHE === '1') {
		const last = lastBroadcastAt.get(userId) || 0;
		const n = nowMs();
		if (n - last < 1000) return;
		lastBroadcastAt.set(userId, n);
	}
	const audience = Array.from(new Set([Number(userId), ...await getFriendsEffective(userId)]));
	await Promise.all(audience.map(async viewerId => {
		const data = await getLeaderboardEffective(viewerId);
		io.to(`leaderboard:${viewerId}`).emit('leaderboard:update', { data });
	}));
}

module.exports = { setupLeaderboardRealtime, broadcastLeaderboardFor };


