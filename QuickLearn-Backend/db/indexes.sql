-- QuickLearn additional indexes for performance
-- Run these on MySQL 8.x (adjust syntax if needed for MariaDB)

-- Friend requests: accepted lookups by requester/addressee
CREATE INDEX idx_friend_requests_req_status ON friend_requests (requester_id, status);
CREATE INDEX idx_friend_requests_add_status ON friend_requests (addressee_id, status);

-- Quiz attempts: aggregate by user
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts (user_id);

-- Notes:
-- If indexes already exist, MySQL will error; run conditionally or drop first:
--   DROP INDEX idx_friend_requests_req_status ON friend_requests;
--   DROP INDEX idx_friend_requests_add_status ON friend_requests;
--   DROP INDEX idx_quiz_attempts_user ON quiz_attempts;


