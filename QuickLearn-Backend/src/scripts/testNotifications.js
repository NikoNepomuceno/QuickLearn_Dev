/**
 * Test script for notification system
 * Run with: node src/scripts/testNotifications.js
 * 
 * This script allows you to manually test:
 * 1. Quiz reminder emails
 * 2. Weekly digest emails
 * 3. Notification preference queries
 */

require('dotenv').config();
const { 
    getUsersForQuizReminders, 
    getIncompleteQuizzes,
    getUsersForWeeklyDigest,
    aggregateWeeklyStats 
} = require('../services/notificationService');
const { sendQuizReminderEmail, sendWeeklyDigestEmail } = require('../config/email');

async function testQuizReminders() {
    console.log('\n=== Testing Quiz Reminders ===');
    try {
        const users = await getUsersForQuizReminders();
        console.log(`Found ${users.length} users with quiz reminders enabled`);
        
        if (users.length === 0) {
            console.log('No users found with quiz reminders enabled. Make sure:');
            console.log('1. You have users with is_email_verified = 1');
            console.log('2. Their notification_preferences has quizReminders: true');
            return;
        }
        
        for (const user of users) {
            console.log(`\nChecking user: ${user.username} (${user.email})`);
            const incompleteQuizzes = await getIncompleteQuizzes(user.id, 2);
            console.log(`  Found ${incompleteQuizzes.length} incomplete quizzes`);
            
            if (incompleteQuizzes.length > 0) {
                console.log('  Quizzes:');
                incompleteQuizzes.forEach(quiz => {
                    console.log(`    - ${quiz.title} (created: ${quiz.created_at})`);
                });
                
                // Send the email
                try {
                    await sendQuizReminderEmail({ to: user.email, username: user.username, incompleteQuizzes });
                    console.log(`  ✓ Email sent to ${user.email}`);
                } catch (emailError) {
                    console.error(`  ✗ Failed to send email to ${user.email}:`, emailError.message);
                }
            }
        }
    } catch (error) {
        console.error('Error testing quiz reminders:', error);
    }
}

async function testWeeklyDigest() {
    console.log('\n=== Testing Weekly Digest ===');
    try {
        const users = await getUsersForWeeklyDigest();
        console.log(`Found ${users.length} users with weekly digest enabled`);
        
        if (users.length === 0) {
            console.log('No users found with weekly digest enabled. Make sure:');
            console.log('1. You have users with is_email_verified = 1');
            console.log('2. Their notification_preferences has weeklyDigest: true');
            return;
        }
        
        for (const user of users) {
            console.log(`\nChecking user: ${user.username} (${user.email})`);
            const stats = await aggregateWeeklyStats(user.id);
            console.log('  Weekly stats:', stats);
            
            // Send the email
            try {
                await sendWeeklyDigestEmail({ to: user.email, username: user.username, weeklyStats: stats });
                console.log(`  ✓ Email sent to ${user.email}`);
            } catch (emailError) {
                console.error(`  ✗ Failed to send email to ${user.email}:`, emailError.message);
            }
        }
    } catch (error) {
        console.error('Error testing weekly digest:', error);
    }
}

async function testNotificationPreferences() {
    console.log('\n=== Testing Notification Preferences Query ===');
    try {
        const reminderUsers = await getUsersForQuizReminders();
        const digestUsers = await getUsersForWeeklyDigest();
        
        console.log(`Users with quiz reminders: ${reminderUsers.length}`);
        console.log(`Users with weekly digest: ${digestUsers.length}`);
        
        if (reminderUsers.length > 0) {
            console.log('\nQuiz reminder users:');
            reminderUsers.forEach(user => {
                console.log(`  - ${user.username} (${user.email})`);
                console.log(`    Preferences:`, user.notificationPreferences);
            });
        }
        
        if (digestUsers.length > 0) {
            console.log('\nWeekly digest users:');
            digestUsers.forEach(user => {
                console.log(`  - ${user.username} (${user.email})`);
                console.log(`    Preferences:`, user.notificationPreferences);
            });
        }
    } catch (error) {
        console.error('Error testing notification preferences:', error);
    }
}

async function runTests() {
    console.log('🚀 Starting Notification System Tests - EMAIL SENDING ENABLED\n');
    console.log('⚠️  This will send actual emails to users!\n');
    
    await testNotificationPreferences();
    await testQuizReminders();
    await testWeeklyDigest();
    
    console.log('\n✅ Tests completed! Check email inboxes for the sent emails.');
    process.exit(0);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

