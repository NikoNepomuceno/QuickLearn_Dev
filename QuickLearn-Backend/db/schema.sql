-- QuickLearn MySQL schema
-- Import this file in phpMyAdmin to create the initial database tables
-- Compatible with MySQL 8.x (works on MariaDB with minor differences)
-- Create database (optional). Uncomment if you want phpMyAdmin to create DB
-- CREATE DATABASE IF NOT EXISTS `quicklearn` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `quicklearn`;
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
-- Users table: application accounts
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` CHAR(36) NULL DEFAULT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `last_login_at` DATETIME NULL DEFAULT NULL,
    `last_login_ip` VARCHAR(45) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_users_username` (`username`),
    UNIQUE KEY `uniq_users_email` (`email`),
    KEY `idx_users_uuid` (`uuid`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Email OTP verifications
CREATE TABLE IF NOT EXISTS `email_verifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `otp_code` CHAR(6) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `consumed_at` DATETIME NULL DEFAULT NULL,
    `attempt_count` INT NOT NULL DEFAULT 0,
    `last_sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `transport` VARCHAR(32) NOT NULL DEFAULT 'smtp',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_email_verifications_user_id` (`user_id`),
    KEY `idx_email_verifications_expires_at` (`expires_at`),
    CONSTRAINT `fk_email_verifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Password reset tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `consumed_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_password_reset_tokens_token` (`token`),
    KEY `idx_password_reset_tokens_user_id` (`user_id`),
    KEY `idx_password_reset_tokens_expires_at` (`expires_at`),
    CONSTRAINT `fk_password_reset_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Sessions / Refresh tokens store
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `refresh_token_hash` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `ip_address` VARCHAR(45) NULL DEFAULT NULL,
    `device_fingerprint` VARCHAR(255) NULL DEFAULT NULL,
    `is_valid` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `revoked_at` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_sessions_user_id` (`user_id`),
    KEY `idx_sessions_is_valid` (`is_valid`),
    KEY `idx_sessions_refresh_hash` (`refresh_token_hash`),
    CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Files uploaded by users (stored on Cloudinary, metadata here)
CREATE TABLE IF NOT EXISTS `files` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `public_id` VARCHAR(255) NOT NULL,
    `resource_type` VARCHAR(32) NULL DEFAULT NULL,
    `format` VARCHAR(32) NULL DEFAULT NULL,
    `url` TEXT NULL,
    `secure_url` TEXT NULL,
    `bytes` INT NULL DEFAULT NULL,
    `width` INT NULL DEFAULT NULL,
    `height` INT NULL DEFAULT NULL,
    `folder` VARCHAR(128) NULL DEFAULT NULL,
    `original_filename` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_files_user_id` (`user_id`),
    KEY `idx_files_public_id` (`public_id`),
    CONSTRAINT `fk_files_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Quizzes table: stores quiz data and metadata
CREATE TABLE IF NOT EXISTS `quizzes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `uuid` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `questions` JSON NOT NULL,
    `source_file_id` BIGINT UNSIGNED NULL,
    `source_file_name` VARCHAR(255) NULL,
    `source_file_type` VARCHAR(50) NULL,
    `source_file_size` INT NULL,
    `text_length` INT NULL,
    `difficulty` VARCHAR(20) NULL DEFAULT 'medium',
    `question_count` INT NOT NULL DEFAULT 0,
    `generated_with_ai` TINYINT(1) NOT NULL DEFAULT 1,
    `processing_time` DATETIME NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_quizzes_uuid` (`uuid`),
    KEY `idx_quizzes_user_id` (`user_id`),
    KEY `idx_quizzes_source_file_id` (`source_file_id`),
    KEY `idx_quizzes_created_at` (`created_at`),
    CONSTRAINT `fk_quizzes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_quizzes_source_file_id` FOREIGN KEY (`source_file_id`) REFERENCES `files` (`id`) ON DELETE
    SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Quiz attempts table: stores user quiz attempt results
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
SET FOREIGN_KEY_CHECKS = 1;