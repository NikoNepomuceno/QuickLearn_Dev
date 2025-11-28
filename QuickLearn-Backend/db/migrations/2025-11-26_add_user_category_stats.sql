-- Adds aggregated per-user per-category stats to support category leaderboards
CREATE TABLE IF NOT EXISTS `user_category_stats` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `category_key` VARCHAR(191) NOT NULL,
    `category_label` VARCHAR(191) NOT NULL,
    `topic` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `total_points` BIGINT NOT NULL DEFAULT 0,
    `total_attempts` INT NOT NULL DEFAULT 0,
    `last_contribution_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_user_category` (`user_id`, `category_key`),
    KEY `idx_user_category_stats_user_id` (`user_id`),
    CONSTRAINT `fk_user_category_stats_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;