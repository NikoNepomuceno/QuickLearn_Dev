const express = require('express');
const { register, verifyEmail, login, logout } = require('../services/authService');
const { getCookieOptions } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/register', async (req, res) => {
	try {
		const { username, email, password, confirmPassword } = req.body || {};
		const result = await register({ username, email, password, confirmPassword, ip: req.ip, userAgent: req.headers['user-agent'] });
		return res.status(201).json({ message: 'Registered. Please verify OTP sent to email.', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Registration failed' });
	}
});

router.post('/verify-email', async (req, res) => {
	try {
		const { email, otp } = req.body || {};
		const result = await verifyEmail({ email, otp });
		return res.json({ message: 'Email verified', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Verification failed' });
	}
});

// Failure-only limiter: 5 failed attempts -> 15s lock
const failedAttempts = new Map(); // key -> { count, lockedUntil }
function getLoginKey(req) {
    const identifier = req.body?.identifier || '';
    return `${identifier.toLowerCase()}|${req.ip}`;
}

router.post('/login', async (req, res) => {
	try {
        const { identifier, password } = req.body || {};
        const key = getLoginKey(req);
        const rec = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
        if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
            const waitSec = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
            return res.status(429).json({ error: `Too many failed attempts. Try again in ${waitSec}s` });
        }
        const result = await login({ identifier, password, ip: req.ip, userAgent: req.headers['user-agent'] });
        // Set httpOnly cookie for access token
        res.cookie('access_token', result.accessToken, getCookieOptions());
        // reset counter on success
        failedAttempts.delete(key);
        return res.json({ user: result.user });
	} catch (err) {
        const key = getLoginKey(req);
        const prev = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
        const nextCount = prev.count + 1;
        const lockedUntil = nextCount >= 5 ? Date.now() + 15 * 1000 : 0;
        failedAttempts.set(key, { count: nextCount, lockedUntil });
        const baseMsg = err.message || 'Login failed';
        if (lockedUntil) {
            return res.status(429).json({ error: `${baseMsg}. Account temporarily locked for 15s` });
        }
        return res.status(400).json({ error: baseMsg });
	}
});

// Refresh removed

router.post('/logout', async (req, res) => {
	try {
        // Clear access cookie
        res.clearCookie('access_token', { path: '/' });
        const result = await logout();
        return res.json(result);
	} catch (err) {
		return res.status(200).json({ success: true });
	}
});

// Current user endpoint for frontend to check auth
router.get('/me', (req, res) => {
    try {
        const token = req.cookies && req.cookies.access_token ? req.cookies.access_token : null;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        return res.json({ user: { id: Number(payload.sub), uuid: payload.uuid, username: payload.username } });
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
});

module.exports = router;


