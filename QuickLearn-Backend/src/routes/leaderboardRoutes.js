const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../config/db');

const router = express.Router();

async function getFriends(userId, pool) {
	const [rows] = await pool.execute(
		`SELECT CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END AS friend_id
		 FROM friend_requests fr
		 WHERE (fr.requester_id = ? OR fr.addressee_id = ?) AND fr.status = 'accepted'`,
		[userId, userId, userId]
	);
	return rows.map(r => Number(r.friend_id));
}

router.get('/', authenticateToken, async (req, res) => {
	try {
		const userId = Number(req.user.id);
		const limit = Math.min(50, Number(req.query.limit) || 50);
		const pool = await getPool();
		const friendIds = await getFriends(userId, pool);
		const allIds = Array.from(new Set([userId, ...friendIds]));
		if (!allIds.length) return res.json({ data: [] });
		const [points] = await pool.query(
			`SELECT qa.user_id AS userId, COALESCE(SUM(COALESCE(qa.points_earned, qa.score)), 0) AS points
			 FROM quiz_attempts qa
			 WHERE qa.user_id IN (${allIds.map(() => '?').join(',')})
			 GROUP BY qa.user_id`,
			allIds
		);
		const [profiles] = await pool.query(
			`SELECT id AS userId, username, COALESCE(display_name, username) AS displayName,
				COALESCE(profile_picture_url, '') AS profilePicture
			 FROM users WHERE id IN (${allIds.map(() => '?').join(',')})`,
			allIds
		);
		const pmap = new Map(points.map(r => [Number(r.userId), Number(r.points)]));
		const data = profiles.map(p => ({
			userId: Number(p.userId),
			username: p.username,
			displayName: p.displayName,
			profilePicture: p.profilePicture,
			points: pmap.get(Number(p.userId)) || 0
		}))
		.sort((a, b) => b.points - a.points)
		.slice(0, limit);
		res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
		res.set('Vary', 'Origin, Authorization, Cookie');
		return res.json({ data });
	} catch (err) {
		console.error('Leaderboard endpoint error:', err);
		return res.status(500).json({ error: 'Failed to load leaderboard' });
	}
});

module.exports = router;


