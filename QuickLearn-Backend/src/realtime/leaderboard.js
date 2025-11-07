const { getPool } = require('../config/db');

async function getFriendsOfUser(userId) {
	const pool = await getPool();
	// Accepted friendships bidirectionally
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
	// Compute from quiz_attempts as initial model
	const [rows] = await pool.query(
		`SELECT qa.user_id AS userId, COALESCE(SUM(qa.score), 0) AS points
		 FROM quiz_attempts qa
		 WHERE qa.user_id IN (${userIds.map(() => '?').join(',')})
		 GROUP BY qa.user_id`,
		userIds
	);
	// Ensure all users present with 0
	const map = new Map(rows.map(r => [Number(r.userId), Number(r.points)]));
	return userIds.map(id => ({ userId: id, points: map.get(id) || 0 }));
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
	const friendIds = await getFriendsOfUser(userId);
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

function setupLeaderboardRealtime(io) {
	io.on('connection', socket => {
		const viewerId = Number(socket.data.userId);
		if (!viewerId) {
			return socket.disconnect(true);
		}
		// Each viewer has their own room; we will emit updates relevant to their friend list
		socket.join(`leaderboard:${viewerId}`);

		socket.on('leaderboard:subscribe', async () => {
			try {
				const data = await getLeaderboardForUser(viewerId);
				socket.emit('leaderboard:update', { data });
			} catch (e) {}
		});

		socket.on('disconnect', () => {
			// no-op
		});
	});
}

async function broadcastLeaderboardFor(io, userId) {
	// The affected viewers are: the user and all their friends
	const audience = Array.from(new Set([Number(userId), ...await getFriendsOfUser(userId)]));
	await Promise.all(audience.map(async viewerId => {
		const data = await getLeaderboardForUser(viewerId);
		io.to(`leaderboard:${viewerId}`).emit('leaderboard:update', { data });
	}));
}

module.exports = { setupLeaderboardRealtime, broadcastLeaderboardFor };


