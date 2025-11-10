-- Add speed-based points and per-question timing to quiz_attempts
-- Safe to run multiple times on MySQL 8+ using IF NOT EXISTS
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS points_earned INT NOT NULL DEFAULT 0
AFTER user_answers,
    ADD COLUMN IF NOT EXISTS question_times_ms JSON NULL
AFTER points_earned;