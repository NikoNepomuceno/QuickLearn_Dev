const express = require('express');
const { register, verifyEmail, resendOtp, login, logout, forgotPassword, resetPassword } = require('../services/authService');
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

router.post('/resend-otp', async (req, res) => {
	try {
		const { email } = req.body || {};
		const result = await resendOtp({ email });
		return res.json({ message: 'OTP resent successfully', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Resend failed' });
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

router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body || {};
		const result = await forgotPassword({ email });
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Forgot password failed' });
	}
});

router.post('/reset-password', async (req, res) => {
	try {
		const { token, password, confirmPassword } = req.body || {};
		const result = await resetPassword({ token, password, confirmPassword });
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Password reset failed' });
	}
});

// Development only: Create test user and get token
// if (process.env.NODE_ENV === 'development') {
// 	router.post('/dev-create-test-user', async (req, res) => {
// 		try {
// 			const { getPool } = require('../config/db');
// 			const bcrypt = require('bcrypt');
// 			const { v4: uuidv4 } = require('uuid');

// 			const pool = await getPool();
// 			const testEmail = 'test@quicklearn.dev';
// 			const testUsername = 'testuser';
// 			const testPassword = 'password123';

// 			// Check if user already exists
// 			const [existing] = await pool.execute(
// 				'SELECT id FROM users WHERE email = ? OR username = ?',
// 				[testEmail, testUsername]
// 			);

// 			let userId;
// 			if (existing.length > 0) {
// 				userId = existing[0].id;
// 			} else {
// 				// Create test user
// 				const passwordHash = await bcrypt.hash(testPassword, 10);
// 				const userUuid = uuidv4();

// 				const [result] = await pool.execute(
// 					`INSERT INTO users (uuid, username, email, password_hash, is_email_verified)
// 					 VALUES (?, ?, ?, ?, 1)`,
// 					[userUuid, testUsername, testEmail, passwordHash]
// 				);
// 				userId = result.insertId;
// 			}

// 			// Generate token
// 			const token = jwt.sign(
// 				{ sub: userId, uuid: uuidv4(), username: testUsername },
// 				process.env.JWT_ACCESS_SECRET,
// 				{ expiresIn: '24h' }
// 			);

// 			res.json({
// 				message: 'Test user created/found',
// 				user: { id: userId, username: testUsername, email: testEmail },
// 				token: token
// 			});
// 		} catch (err) {
// 			console.error('Error creating test user:', err);
// 			res.status(500).json({ error: 'Failed to create test user' });
// 		}
// 	});
// }

module.exports = router;


