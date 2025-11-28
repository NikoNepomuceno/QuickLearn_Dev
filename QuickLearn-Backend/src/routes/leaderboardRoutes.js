const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../config/db');
const UserCategoryStat = require('../models/UserCategoryStat');

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
		const limitRaw = Number(req.query.limit);
		const limit = isNaN(limitRaw) ? 50 : Math.min(50, Math.max(1, limitRaw));
		const categoryParam = req.query.categoryKey || req.query.category || null;
		const categoryKeyFilter = categoryParam ? UserCategoryStat.normalizeCategoryKey(categoryParam) : null;
		const pool = await getPool();
		// Get only accepted friends - this ensures we only show current user + their friends
		const friendIds = await getFriends(userId, pool);
		// Include current user + friends only (not all users)
		const allIds = Array.from(new Set([userId, ...friendIds]));
		// If no friends and no user (shouldn't happen), return empty
		if (!allIds.length) return res.json({ data: [] });
		const placeholders = allIds.map(() => '?').join(',');
		// Query points from quiz attempts
		const [quizPoints] = await pool.query(
			`SELECT qa.user_id AS userId, COALESCE(SUM(COALESCE(qa.points_earned, qa.score)), 0) AS points
			 FROM quiz_attempts qa
			 WHERE qa.user_id IN (${placeholders})
			 GROUP BY qa.user_id`,
			allIds
		);
		
		// Query points from achievements
		const [achievementPoints] = await pool.query(
			`SELECT ua.user_id AS userId, COALESCE(SUM(ua.points_earned), 0) AS points
			 FROM user_achievements ua
			 WHERE ua.user_id IN (${placeholders})
			 GROUP BY ua.user_id`,
			allIds
		);
		
		// Combine both sources
		const quizPmap = new Map(quizPoints.map(r => [Number(r.userId), Number(r.points)]));
		const achievementPmap = new Map(achievementPoints.map(r => [Number(r.userId), Number(r.points)]));
		// Query profiles only for current user and their friends
		const [profiles] = await pool.query(
			`SELECT id AS userId, username, COALESCE(display_name, username) AS displayName,
				COALESCE(profile_picture_url, '') AS profilePicture
			 FROM users WHERE id IN (${placeholders})`,
			allIds
		);
		const [categoryRows] = await pool.query(
			`SELECT 
				user_id AS userId,
				category_key AS categoryKey,
				category_label AS categoryLabel,
				topic,
				subject,
				total_points AS totalPoints,
				total_attempts AS totalAttempts,
				last_contribution_at AS lastContributionAt
			 FROM user_category_stats
			 WHERE user_id IN (${placeholders})`,
			allIds
		);

		const categoryStatsByUser = new Map();
		const categoryTotals = new Map();

		for (const row of categoryRows) {
			const key = row.categoryKey || UserCategoryStat.normalizeCategoryKey(row.categoryLabel);
			const stat = {
				categoryKey: key,
				categoryLabel: row.categoryLabel,
				topic: row.topic,
				subject: row.subject,
				totalPoints: Number(row.totalPoints) || 0,
				totalAttempts: Number(row.totalAttempts) || 0,
				lastContributionAt: row.lastContributionAt
			};

			if (!categoryStatsByUser.has(Number(row.userId))) {
				categoryStatsByUser.set(Number(row.userId), []);
			}
			categoryStatsByUser.get(Number(row.userId)).push(stat);

			let aggregate = categoryTotals.get(key);
			if (!aggregate) {
				aggregate = {
					categoryKey: key,
					categoryLabel: row.categoryLabel,
					totalPoints: 0,
					participants: new Set()
				};
				categoryTotals.set(key, aggregate);
			}
			aggregate.totalPoints += stat.totalPoints;
			aggregate.participants.add(Number(row.userId));
		}

		for (const stats of categoryStatsByUser.values()) {
			stats.sort((a, b) => b.totalPoints - a.totalPoints);
		}

		const availableCategories = Array.from(categoryTotals.values())
			.map(cat => ({
				categoryKey: cat.categoryKey,
				categoryLabel: cat.categoryLabel,
				totalPoints: cat.totalPoints,
				participants: cat.participants.size
			}))
			.sort((a, b) => b.totalPoints - a.totalPoints);

		const activeCategoryMeta = categoryKeyFilter
			? availableCategories.find(cat => cat.categoryKey === categoryKeyFilter) || null
			: null;

		const data = profiles.map(p => ({
			userId: Number(p.userId),
			username: p.username,
			displayName: p.displayName,
			profilePicture: p.profilePicture,
			points: (quizPmap.get(Number(p.userId)) || 0) + (achievementPmap.get(Number(p.userId)) || 0),
			categoryBreakdown: categoryStatsByUser.get(Number(p.userId)) || []
		}))
		.map(entry => {
			const highlightCategory = categoryKeyFilter
				? entry.categoryBreakdown.find(cat => cat.categoryKey === categoryKeyFilter)
				: entry.categoryBreakdown[0];
			const categoryScore = highlightCategory ? highlightCategory.totalPoints : 0;
			return {
				...entry,
				categoryScore: categoryKeyFilter ? categoryScore : undefined,
				highlightCategory: highlightCategory ? {
					categoryKey: highlightCategory.categoryKey,
					categoryLabel: highlightCategory.categoryLabel,
					totalPoints: highlightCategory.totalPoints
				} : null
			};
		})
		.sort((a, b) => {
			const metricA = categoryKeyFilter ? (a.categoryScore || 0) : a.points;
			const metricB = categoryKeyFilter ? (b.categoryScore || 0) : b.points;
			return metricB - metricA;
		})
		.slice(0, limit);
		res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
		res.set('Vary', 'Origin, Authorization, Cookie');
		return res.json({
			data,
			availableCategories,
			activeCategory: activeCategoryMeta,
			categoryKey: categoryKeyFilter
		});
	} catch (err) {
		console.error('Leaderboard endpoint error:', err);
		return res.status(500).json({ error: 'Failed to load leaderboard' });
	}
});

module.exports = router;


