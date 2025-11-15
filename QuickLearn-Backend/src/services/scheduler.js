const cron = require('node-cron');
const {
    getUsersForQuizReminders,
    getIncompleteQuizzes,
    getUsersForWeeklyDigest,
    aggregateWeeklyStats
} = require('./notificationService');
const { sendQuizReminderEmail, sendWeeklyDigestEmail } = require('../config/email');

let quizReminderJob = null;
let weeklyDigestJob = null;

/**
 * Send quiz reminders to users with incomplete quizzes
 */
async function sendQuizReminders() {
    try {
        console.log('[Scheduler] Starting quiz reminder job...');
        const users = await getUsersForQuizReminders();
        console.log(`[Scheduler] Found ${users.length} users with quiz reminders enabled`);
        
        let emailsSent = 0;
        let errors = 0;
        
        for (const user of users) {
            try {
                // Check if emailNotifications is also enabled
                const prefs = user.notificationPreferences;
                if (prefs && prefs.emailNotifications === false) {
                    continue; // Skip if email notifications are disabled
                }
                
                const incompleteQuizzes = await getIncompleteQuizzes(user.id, 2);
                
                if (incompleteQuizzes.length > 0) {
                    await sendQuizReminderEmail({
                        to: user.email,
                        username: user.username,
                        incompleteQuizzes: incompleteQuizzes
                    });
                    emailsSent++;
                    console.log(`[Scheduler] Sent quiz reminder to ${user.username} (${incompleteQuizzes.length} incomplete quizzes)`);
                }
            } catch (error) {
                errors++;
                console.error(`[Scheduler] Error sending quiz reminder to user ${user.id}:`, error.message);
            }
        }
        
        console.log(`[Scheduler] Quiz reminder job completed: ${emailsSent} emails sent, ${errors} errors`);
    } catch (error) {
        console.error('[Scheduler] Error in quiz reminder job:', error);
    }
}

/**
 * Send weekly digest emails to users
 */
async function sendWeeklyDigests() {
    try {
        console.log('[Scheduler] Starting weekly digest job...');
        const users = await getUsersForWeeklyDigest();
        console.log(`[Scheduler] Found ${users.length} users with weekly digest enabled`);
        
        let emailsSent = 0;
        let errors = 0;
        
        for (const user of users) {
            try {
                // Check if emailNotifications is also enabled
                const prefs = user.notificationPreferences;
                if (prefs && prefs.emailNotifications === false) {
                    continue; // Skip if email notifications are disabled
                }
                
                const weeklyStats = await aggregateWeeklyStats(user.id);
                
                await sendWeeklyDigestEmail({
                    to: user.email,
                    username: user.username,
                    weeklyStats: weeklyStats
                });
                emailsSent++;
                console.log(`[Scheduler] Sent weekly digest to ${user.username}`);
            } catch (error) {
                errors++;
                console.error(`[Scheduler] Error sending weekly digest to user ${user.id}:`, error.message);
            }
        }
        
        console.log(`[Scheduler] Weekly digest job completed: ${emailsSent} emails sent, ${errors} errors`);
    } catch (error) {
        console.error('[Scheduler] Error in weekly digest job:', error);
    }
}

/**
 * Initialize and start all scheduled jobs
 * @param {boolean} enabled - Whether to enable the scheduler (default: true in production)
 */
function initializeScheduler(enabled = true) {
    if (!enabled) {
        console.log('[Scheduler] Scheduler is disabled');
        return;
    }
    
    // Daily quiz reminder job - runs at 9:00 AM every day
    quizReminderJob = cron.schedule('0 9 * * *', sendQuizReminders, {
        scheduled: true,
        timezone: 'UTC'
    });
    console.log('[Scheduler] Quiz reminder job scheduled: Daily at 9:00 AM UTC');
    
    // Weekly digest job - runs every Monday at 8:00 AM
    weeklyDigestJob = cron.schedule('0 8 * * 1', sendWeeklyDigests, {
        scheduled: true,
        timezone: 'UTC'
    });
    console.log('[Scheduler] Weekly digest job scheduled: Every Monday at 8:00 AM UTC');
    
    console.log('[Scheduler] All jobs initialized successfully');
}

/**
 * Stop all scheduled jobs
 */
function stopScheduler() {
    if (quizReminderJob) {
        quizReminderJob.stop();
        quizReminderJob = null;
    }
    if (weeklyDigestJob) {
        weeklyDigestJob.stop();
        weeklyDigestJob = null;
    }
    console.log('[Scheduler] All jobs stopped');
}

module.exports = {
    initializeScheduler,
    stopScheduler,
    sendQuizReminders, // Exported for manual testing
    sendWeeklyDigests  // Exported for manual testing
};

