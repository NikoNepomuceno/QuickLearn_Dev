-- Migration: Create question_bank table
-- This table stores extracted questions from quizzes for the Question Bank feature
CREATE TABLE IF NOT EXISTS `question_bank` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `uuid` CHAR(36) NOT NULL,
    `original_quiz_id` BIGINT UNSIGNED NULL,
    `question_data` JSON NOT NULL,
    `topic` VARCHAR(128) NULL,
    `category` VARCHAR(128) NULL,
    `subject` VARCHAR(128) NULL,
    `difficulty` ENUM('easy', 'medium', 'hard') NULL,
    `question_type` VARCHAR(32) NOT NULL,
    `keywords` JSON NULL,
    `ai_categorized` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_question_bank_uuid` (`uuid`),
    KEY `idx_question_bank_user_id` (`user_id`),
    KEY `idx_question_bank_topic` (`topic`),
    KEY `idx_question_bank_category` (`category`),
    KEY `idx_question_bank_difficulty` (`difficulty`),
    KEY `idx_question_bank_type` (`question_type`),
    KEY `idx_question_bank_original_quiz_id` (`original_quiz_id`),
    CONSTRAINT `fk_question_bank_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_question_bank_quiz_id` FOREIGN KEY (`original_quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE
    SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;