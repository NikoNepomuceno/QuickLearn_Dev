const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../config/db');

const router = express.Router();

// Search users by username/display name
router.get('/search', authenticateToken, async (req, res) => {
	try {
		const q = (req.query.query || '').trim();
		if (!q) return res.json({ users: [] });
		const pool = await getPool();
		const [rows] = await pool.execute(
			`SELECT id AS userId, username, COALESCE(display_name, username) AS displayName,
				COALESCE(profile_picture_url, '') AS profilePicture
			 FROM users
			 WHERE username LIKE ? OR display_name LIKE ?
			 LIMIT 20`,
			[`%${q}%`, `%${q}%`]
		);
		// Exclude self
		return res.json({ users: rows.filter(u => Number(u.userId) !== Number(req.user.id)) });
	} catch (err) {
		console.error('Search users error:', err);
		return res.status(500).json({ error: 'Failed to search users' });
	}
});

// Send friend request
router.post('/requests', authenticateToken, async (req, res) => {
	try {
		const { toUserId } = req.body || {};
		const fromId = Number(req.user.id);
		const toId = Number(toUserId);
		if (!toId || toId === fromId) return res.status(400).json({ error: 'Invalid user' });
		const pool = await getPool();
		// If already friends or pending, ignore
		await pool.execute(
			`INSERT INTO friend_requests (requester_id, addressee_id, status, created_at)
			 VALUES (?, ?, 'pending', NOW())
			 ON DUPLICATE KEY UPDATE status = VALUES(status), created_at = NOW()`,
			[fromId, toId]
		);
		return res.json({ ok: true });
	} catch (err) {
		console.error('Create friend request error:', err);
		return res.status(500).json({ error: 'Failed to send request' });
	}
});

// Helper to parse compound request id formatted as "<requesterId>:<addresseeId>"
function parseCompoundRequestId(id) {
    if (!id || typeof id !== 'string' || !id.includes(':')) return [NaN, NaN];
    const parts = id.split(':');
    if (parts.length !== 2) return [NaN, NaN];
    const requesterId = Number(parts[0]);
    const addresseeId = Number(parts[1]);
    return [requesterId, addresseeId];
}

// List pending friend requests for current user (inbox)
router.get('/requests', authenticateToken, async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT fr.requester_id AS requesterId, fr.addressee_id AS addresseeId, fr.created_at AS createdAt,
                    u.id AS userId, u.username, COALESCE(u.display_name, u.username) AS displayName,
                    COALESCE(u.profile_picture_url, '') AS profilePicture
             FROM friend_requests fr
             JOIN users u ON u.id = fr.requester_id
             WHERE fr.addressee_id = ? AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );
        const requests = rows.map(r => ({
            requestId: `${r.requesterId}:${r.addresseeId}`,
            fromUser: {
                userId: Number(r.userId),
                username: r.username,
                displayName: r.displayName,
                profilePicture: r.profilePicture
            },
            createdAt: r.createdAt
        }));
        return res.json({ requests });
    } catch (err) {
        console.error('List pending requests error:', err);
        return res.status(500).json({ error: 'Failed to load friend requests' });
    }
});

// Count pending friend requests for badge
router.get('/requests/count', authenticateToken, async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const pool = await getPool();
        const [rows] = await pool.execute(
            `SELECT COUNT(*) AS cnt FROM friend_requests WHERE addressee_id = ? AND status = 'pending'`,
            [userId]
        );
        const count = Number(rows[0]?.cnt || 0);
        return res.json({ count });
    } catch (err) {
        console.error('Count pending requests error:', err);
        return res.status(500).json({ error: 'Failed to load pending count' });
    }
});

// Accept friend request by compound requestId "<requesterId>:<addresseeId>"
router.post('/requests/:id/accept', authenticateToken, async (req, res) => {
    try {
        const [requesterId, addresseeId] = parseCompoundRequestId(req.params.id);
        if (!requesterId || !addresseeId) return res.status(400).json({ error: 'Invalid request id' });
        if (Number(req.user.id) !== Number(addresseeId)) return res.status(403).json({ error: 'Forbidden' });
        const pool = await getPool();
        await pool.execute(
            `UPDATE friend_requests SET status = 'accepted'
             WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
            [requesterId, addresseeId]
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error('Accept request by id error:', err);
        return res.status(500).json({ error: 'Failed to accept request' });
    }
});

// Accept friend request by requesterId (numeric-only legacy route)
router.post('/requests/:requesterId/accept', authenticateToken, async (req, res) => {
    try {
        const requesterId = Number(req.params.requesterId);
        const addresseeId = Number(req.user.id);
        if (!requesterId) return res.status(400).json({ error: 'Invalid request' });
        const pool = await getPool();
        await pool.execute(
            `UPDATE friend_requests SET status = 'accepted'
             WHERE requester_id = ? AND addressee_id = ?`,
            [requesterId, addresseeId]
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error('Accept friend request error:', err);
        return res.status(500).json({ error: 'Failed to accept request' });
    }
});

// Decline friend request by compound requestId "<requesterId>:<addresseeId>"
router.post('/requests/:id/decline', authenticateToken, async (req, res) => {
    try {
        const [requesterId, addresseeId] = parseCompoundRequestId(req.params.id);
        if (!requesterId || !addresseeId) return res.status(400).json({ error: 'Invalid request id' });
        if (Number(req.user.id) !== Number(addresseeId)) return res.status(403).json({ error: 'Forbidden' });
        const pool = await getPool();
        await pool.execute(
            `UPDATE friend_requests SET status = 'declined'
             WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
            [requesterId, addresseeId]
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error('Decline request by id error:', err);
        return res.status(500).json({ error: 'Failed to decline request' });
    }
});

// List friends
router.get('/', authenticateToken, async (req, res) => {
	try {
		const userId = Number(req.user.id);
		const pool = await getPool();
		const [rows] = await pool.execute(
			`SELECT CASE WHEN fr.requester_id = ? THEN fr.addressee_id ELSE fr.requester_id END AS friend_id
			 FROM friend_requests fr
			 WHERE (fr.requester_id = ? OR fr.addressee_id = ?) AND fr.status = 'accepted'`,
			[userId, userId, userId]
		);
		const friendIds = rows.map(r => Number(r.friend_id));
		if (!friendIds.length) return res.json({ friends: [] });
		const [profiles] = await pool.query(
			`SELECT id AS userId, username, COALESCE(display_name, username) AS displayName,
				COALESCE(profile_picture_url, '') AS profilePicture
			 FROM users WHERE id IN (${friendIds.map(() => '?').join(',')})`,
			friendIds
		);
		return res.json({ friends: profiles });
	} catch (err) {
		console.error('List friends error:', err);
		return res.status(500).json({ error: 'Failed to load friends' });
	}
});

module.exports = router;


