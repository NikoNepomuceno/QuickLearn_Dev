-- Notification Preferences Migration
-- Adds notification_preferences JSON column to users table
-- Run this migration to enable email notification preferences
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- Add notification_preferences column to users table
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `notification_preferences` JSON NULL
AFTER `bio`;

-- Set default notification preferences for existing users
UPDATE `users`
SET `notification_preferences` = JSON_OBJECT(
    'emailNotifications', true,
    'quizReminders', true,
    'weeklyDigest', false
)
WHERE `notification_preferences` IS NULL;

-- Set default for new users (via ALTER TABLE DEFAULT)
-- Note: MySQL doesn't support DEFAULT for JSON columns, so we handle this in application code

SET FOREIGN_KEY_CHECKS = 1;

