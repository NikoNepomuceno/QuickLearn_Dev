const { getPool } = require('../config/db');

/**
 * Get users who have quiz reminders enabled and email verified
 * @returns {Promise<Array>} Array of user objects with id, email, username
 */
async function getUsersForQuizReminders() {
    const pool = await getPool();
    const [users] = await pool.execute(`
        SELECT id, email, username, notification_preferences
        FROM users
        WHERE is_email_verified = 1
          AND JSON_EXTRACT(notification_preferences, '$.quizReminders') = true
    `);
    
    return users.map(user => {
        let prefs = null;
        if (user.notification_preferences) {
            try {
                prefs = typeof user.notification_preferences === 'string' 
                    ? JSON.parse(user.notification_preferences) 
                    : user.notification_preferences;
            } catch (error) {
                console.warn(`Failed to parse notification preferences for user ${user.id}:`, error);
            }
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            notificationPreferences: prefs
        };
    });
}

/**
 * Get incomplete quizzes for a user that are older than specified days
 * A quiz is incomplete if it has no quiz_attempts
 * @param {number} userId - User ID
 * @param {number} daysOld - Minimum age in days (default: 2)
 * @returns {Promise<Array>} Array of incomplete quiz objects
 */
async function getIncompleteQuizzes(userId, daysOld = 2) {
    const pool = await getPool();
    const [quizzes] = await pool.execute(`
        SELECT q.id, q.uuid, q.title, q.created_at
        FROM quizzes q
        WHERE q.user_id = ?
          AND q.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
          AND NOT EXISTS (
              SELECT 1 FROM quiz_attempts qa 
              WHERE qa.quiz_id = q.id AND qa.user_id = ?
          )
        ORDER BY q.created_at ASC
    `, [userId, daysOld, userId]);
    
    return quizzes.map(quiz => ({
        id: quiz.id,
        uuid: quiz.uuid,
        title: quiz.title,
        created_at: quiz.created_at
    }));
}

/**
 * Get users who have weekly digest enabled and email verified
 * @returns {Promise<Array>} Array of user objects with id, email, username
 */
async function getUsersForWeeklyDigest() {
    const pool = await getPool();
    const [users] = await pool.execute(`
        SELECT id, email, username, notification_preferences
        FROM users
        WHERE is_email_verified = 1
          AND JSON_EXTRACT(notification_preferences, '$.weeklyDigest') = true
    `);
    
    return users.map(user => {
        let prefs = null;
        if (user.notification_preferences) {
            try {
                prefs = typeof user.notification_preferences === 'string' 
                    ? JSON.parse(user.notification_preferences) 
                    : user.notification_preferences;
            } catch (error) {
                console.warn(`Failed to parse notification preferences for user ${user.id}:`, error);
            }
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            notificationPreferences: prefs
        };
    });
}

/**
 * Aggregate weekly statistics for a user (past 7 days)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Object with quizzesCreated, quizzesTaken, averageScore, achievementsEarned
 */
async function aggregateWeeklyStats(userId) {
    const pool = await getPool();
    
    // Get quizzes created in past 7 days
    const [quizzesCreated] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM quizzes
        WHERE user_id = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [userId]);
    
    // Get quiz attempts in past 7 days
    const [quizzesTaken] = await pool.execute(`
        SELECT COUNT(*) as count, AVG(score) as avgScore
        FROM quiz_attempts
        WHERE user_id = ?
          AND taken_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [userId]);
    
    // Get achievements earned in past 7 days (if user_achievements table exists)
    let achievementsEarned = 0;
    try {
        const [achievements] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM user_achievements
            WHERE user_id = ?
              AND earned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [userId]);
        achievementsEarned = parseInt(achievements[0]?.count || 0);
    } catch (error) {
        // Table might not exist, ignore
        console.warn('user_achievements table not found, skipping achievements count');
    }
    
    return {
        quizzesCreated: parseInt(quizzesCreated[0]?.count || 0),
        quizzesTaken: parseInt(quizzesTaken[0]?.count || 0),
        averageScore: Math.round(parseFloat(quizzesTaken[0]?.avgScore || 0)),
        achievementsEarned: achievementsEarned
    };
}

module.exports = {
    getUsersForQuizReminders,
    getIncompleteQuizzes,
    getUsersForWeeklyDigest,
    aggregateWeeklyStats
};

