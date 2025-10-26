-- Migration script to update existing QuickLearn database tables
-- Run these queries to add the missing columns and tables for cloud storage
-- IMPORTANT: Run these one by one and ignore "Duplicate column name" errors
-- 1. Add missing columns to quizzes table
-- Run each ALTER TABLE statement separately:
-- Step 1: Add source_file_id column
ALTER TABLE `quizzes`
ADD COLUMN `source_file_id` BIGINT UNSIGNED NULL;
-- Step 2: Add source file metadata columns
ALTER TABLE `quizzes`
ADD COLUMN `source_file_name` VARCHAR(255) NULL;
ALTER TABLE `quizzes`
ADD COLUMN `source_file_type` VARCHAR(50) NULL;
ALTER TABLE `quizzes`
ADD COLUMN `source_file_size` INT NULL;
-- Step 3: Add other missing columns
ALTER TABLE `quizzes`
ADD COLUMN `text_length` INT NULL;
ALTER TABLE `quizzes`
ADD COLUMN `difficulty` VARCHAR(20) NULL DEFAULT 'medium';
ALTER TABLE `quizzes`
ADD COLUMN `question_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `quizzes`
ADD COLUMN `generated_with_ai` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `quizzes`
ADD COLUMN `processing_time` DATETIME NULL;
ALTER TABLE `quizzes`
ADD COLUMN `metadata` JSON NULL;
-- Step 4: Add index (ignore error if already exists)
ALTER TABLE `quizzes`
ADD KEY `idx_quizzes_source_file_id` (`source_file_id`);
-- Step 5: Add foreign key constraint (ignore error if already exists)
ALTER TABLE `quizzes`
ADD CONSTRAINT `fk_quizzes_source_file_id` FOREIGN KEY (`source_file_id`) REFERENCES `files` (`id`) ON DELETE
SET NULL ON UPDATE CASCADE;
-- 2. Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS `quiz_attempts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `quiz_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `score` INT NOT NULL DEFAULT 0,
    `time_seconds` INT NULL,
    `user_answers` JSON NULL,
    `taken_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_quiz_attempts_quiz_id` (`quiz_id`),
    KEY `idx_quiz_attempts_user_id` (`user_id`),
    KEY `idx_quiz_attempts_taken_at` (`taken_at`),
    CONSTRAINT `fk_quiz_attempts_quiz_id` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_quiz_attempts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 3. Update files table if needed (add missing columns)
-- Check if these columns exist, if not add them:
-- Add missing columns to files table
ALTER TABLE `files`
ADD COLUMN IF NOT EXISTS `width` INT NULL
AFTER `bytes`,
    ADD COLUMN IF NOT EXISTS `height` INT NULL
AFTER `width`,
    ADD COLUMN IF NOT EXISTS `folder` VARCHAR(128) NULL
AFTER `height`;
-- Note: Run each ALTER TABLE statement one by one
-- If you get "Duplicate column name" errors, that means the column already exists and you can skip that statement
-- 4. Add profile fields to users table
-- Add profile picture URL column
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `profile_picture_url` TEXT NULL
AFTER `last_login_ip`;
-- Add display name column
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(50) NULL
AFTER `profile_picture_url`;
-- Add bio column
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `bio` TEXT NULL
AFTER `display_name`;