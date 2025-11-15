-- Achievements System Migration
-- Creates tables for achievements, user achievements, and user stats
-- Run this migration to add the achievements system to QuickLearn
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
-- 1. Create achievements table
CREATE TABLE IF NOT EXISTS `achievements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `icon` VARCHAR(100) NULL,
    `category` VARCHAR(50) NULL,
    `rarity` ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    `points` INT NOT NULL DEFAULT 0,
    `lottie_url` VARCHAR(500) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_achievements_code` (`code`),
    KEY `idx_achievements_category` (`category`),
    KEY `idx_achievements_rarity` (`rarity`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 2. Create user_achievements table
CREATE TABLE IF NOT EXISTS `user_achievements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `achievement_id` BIGINT UNSIGNED NOT NULL,
    `earned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `metadata` JSON NULL,
    `points_earned` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_user_achievements_user_achievement` (`user_id`, `achievement_id`),
    KEY `idx_user_achievements_user_id` (`user_id`),
    KEY `idx_user_achievements_achievement_id` (`achievement_id`),
    KEY `idx_user_achievements_earned_at` (`earned_at`),
    CONSTRAINT `fk_user_achievements_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_user_achievements_achievement_id` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 3. Create user_stats table
CREATE TABLE IF NOT EXISTS `user_stats` (
    `user_id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    `consecutive_correct_answers` INT NOT NULL DEFAULT 0,
    `total_quizzes_taken` INT NOT NULL DEFAULT 0,
    `total_perfect_scores` INT NOT NULL DEFAULT 0,
    `total_questions_answered` INT NOT NULL DEFAULT 0,
    `total_correct_answers` INT NOT NULL DEFAULT 0,
    `longest_streak` INT NOT NULL DEFAULT 0,
    `quizzes_90_plus_count` INT NOT NULL DEFAULT 0,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_stats_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 4. Insert 10 achievements
INSERT INTO `achievements` (
        `code`,
        `name`,
        `description`,
        `icon`,
        `category`,
        `rarity`,
        `points`,
        `lottie_url`
    )
VALUES (
        'perfect_score',
        'Perfect Score',
        'Get a perfect score (100%) on any quiz',
        'star',
        'quiz',
        'rare',
        500,
        NULL
    ),
    (
        'five_streak',
        'Hot Streak',
        'Answer 5 questions correctly in a row',
        'fire',
        'streak',
        'common',
        200,
        NULL
    ),
    (
        'ten_streak',
        'On Fire',
        'Answer 10 questions correctly in a row',
        'flame',
        'streak',
        'rare',
        500,
        NULL
    ),
    (
        'first_quiz',
        'Getting Started',
        'Complete your first quiz',
        'play',
        'milestone',
        'common',
        100,
        NULL
    ),
    (
        'quiz_master',
        'Quiz Master',
        'Complete 10 quizzes',
        'trophy',
        'milestone',
        'rare',
        300,
        NULL
    ),
    (
        'speed_demon',
        'Speed Demon',
        'Complete a quiz in under 2 minutes',
        'bolt',
        'speed',
        'epic',
        250,
        NULL
    ),
    (
        'accuracy_king',
        'Accuracy King',
        'Get 90% or higher on 5 quizzes',
        'crown',
        'accuracy',
        'epic',
        400,
        NULL
    ),
    (
        'centurion',
        'Centurion',
        'Answer 100 questions correctly',
        'medal',
        'milestone',
        'rare',
        600,
        NULL
    ),
    (
        'dedicated',
        'Dedicated Learner',
        'Complete 25 quizzes',
        'book',
        'milestone',
        'epic',
        500,
        NULL
    ),
    (
        'unbeatable',
        'Unbeatable',
        'Get a perfect score on 3 different quizzes',
        'shield',
        'quiz',
        'legendary',
        1000,
        NULL
    ) ON DUPLICATE KEY
UPDATE `name` =
VALUES(`name`),
    `description` =
VALUES(`description`);
-- Set all lottie_url values to NULL (Lottie URLs will be added later when actual animations are available)
UPDATE `achievements`
SET `lottie_url` = NULL
WHERE `lottie_url` IS NOT NULL;
SET FOREIGN_KEY_CHECKS = 1;