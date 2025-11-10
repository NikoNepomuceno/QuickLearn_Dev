-- Verify index usage for leaderboard queries
-- Expected to use idx_friend_requests_req_status or idx_friend_requests_add_status
EXPLAIN
SELECT CASE
        WHEN fr.requester_id = ? THEN fr.addressee_id
        ELSE fr.requester_id
    END AS friend_id
FROM friend_requests fr
WHERE (
        fr.requester_id = ?
        OR fr.addressee_id = ?
    )
    AND fr.status = 'accepted';
-- Expected to use idx_quiz_attempts_user
EXPLAIN
SELECT qa.user_id AS userId,
    COALESCE(SUM(qa.score), 0) AS points
FROM quiz_attempts qa
WHERE qa.user_id IN (?, ?, ?)
GROUP BY qa.user_id;