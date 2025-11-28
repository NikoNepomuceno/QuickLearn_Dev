const { getPool } = require('../config/db');

class UserCategoryStat {
	constructor(data) {
		this.id = data.id;
		this.userId = data.user_id;
		this.categoryKey = data.category_key;
		this.categoryLabel = data.category_label;
		this.topic = data.topic;
		this.subject = data.subject;
		this.totalPoints = Number(data.total_points) || 0;
		this.totalAttempts = Number(data.total_attempts) || 0;
		this.lastContributionAt = data.last_contribution_at;
		this.createdAt = data.created_at;
		this.updatedAt = data.updated_at;
	}

	static normalizeCategoryKey(raw) {
		if (!raw || typeof raw !== 'string') {
			return 'general';
		}
		return raw.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 190);
	}

	static async incrementStats(userId, increments) {
		if (!Array.isArray(increments) || increments.length === 0) {
			return;
		}

		const pool = await getPool();
		const placeholders = [];
		const values = [];

		for (const increment of increments) {
			if (!increment || !Number.isFinite(increment.points) || increment.points <= 0) {
				continue;
			}
			const categoryLabel = increment.categoryLabel || 'General';
			const categoryKey = UserCategoryStat.normalizeCategoryKey(increment.categoryKey || categoryLabel);

			const attempts = Number.isFinite(increment.attempts) && increment.attempts > 0 ? Math.floor(increment.attempts) : 0;
			const points = Math.round(increment.points);

			placeholders.push('(?, ?, ?, ?, ?, ?, ?, NOW())');
			values.push(
				userId,
				categoryKey,
				categoryLabel,
				increment.topic || null,
				increment.subject || null,
				points,
				attempts
			);
		}

		if (!placeholders.length) {
			return;
		}

		await pool.execute(
			`INSERT INTO user_category_stats (
				user_id,
				category_key,
				category_label,
				topic,
				subject,
				total_points,
				total_attempts,
				last_contribution_at
			) VALUES ${placeholders.join(', ')}
			ON DUPLICATE KEY UPDATE
				category_label = VALUES(category_label),
				topic = COALESCE(VALUES(topic), topic),
				subject = COALESCE(VALUES(subject), subject),
				total_points = total_points + VALUES(total_points),
				total_attempts = total_attempts + VALUES(total_attempts),
				last_contribution_at = VALUES(last_contribution_at)`,
			values
		);
	}

	static async getTopCategories(userId, limit = 5) {
		const pool = await getPool();
		const [rows] = await pool.execute(
			`SELECT *
			 FROM user_category_stats
			 WHERE user_id = ?
			 ORDER BY total_points DESC
			 LIMIT ?`,
			[userId, limit]
		);

		return rows.map(row => new UserCategoryStat(row));
	}
}

module.exports = UserCategoryStat;


