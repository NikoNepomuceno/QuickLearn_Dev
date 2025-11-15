const { getPool } = require('../config/db');
const Achievement = require('./Achievement');

class UserAchievement {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.achievementId = data.achievement_id;
        this.earnedAt = data.earned_at;
        this.metadata = data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : null;
        this.pointsEarned = data.points_earned || 0;
    }

    static async create(userId, achievementId, metadata = null) {
        const pool = await getPool();
        
        // Check if user already has this achievement
        const existing = await UserAchievement.findByUserAndAchievement(userId, achievementId);
        if (existing) {
            return existing; // Already earned
        }

        // Get achievement to get points value
        const achievement = await Achievement.findById(achievementId);
        const pointsEarned = achievement ? achievement.points : 0;

        const [result] = await pool.execute(
            `INSERT INTO user_achievements (user_id, achievement_id, metadata, points_earned)
             VALUES (?, ?, ?, ?)`,
            [userId, achievementId, metadata ? JSON.stringify(metadata) : null, pointsEarned]
        );

        return await UserAchievement.findById(result.insertId);
    }

    static async findByUserAndAchievement(userId, achievementId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
            [userId, achievementId]
        );
        
        if (rows.length === 0) return null;
        return new UserAchievement(rows[0]);
    }

    static async findByUserId(userId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT ua.*, a.code, a.name, a.description, a.icon, a.category, a.rarity, a.points, a.lottie_url
             FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.id
             WHERE ua.user_id = ?
             ORDER BY ua.earned_at DESC`,
            [userId]
        );
        
        return rows.map(row => ({
            id: row.id,
            achievementId: row.achievement_id,
            code: row.code,
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            rarity: row.rarity,
            points: row.points,
            lottieUrl: row.lottie_url,
            earnedAt: row.earned_at,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
            pointsEarned: row.points_earned || 0
        }));
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM user_achievements WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        return new UserAchievement(rows[0]);
    }

    static async hasAchievement(userId, achievementCode) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT ua.id FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.id
             WHERE ua.user_id = ? AND a.code = ?`,
            [userId, achievementCode]
        );
        
        return rows.length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            achievementId: this.achievementId,
            earnedAt: this.earnedAt,
            metadata: this.metadata,
            pointsEarned: this.pointsEarned
        };
    }
}

module.exports = UserAchievement;

