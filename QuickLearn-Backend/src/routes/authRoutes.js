const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { register, verifyEmail, resendOtp, login, logout, forgotPassword, resetPassword } = require('../services/authService');
const { generateState, buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleProfile, loginOrCreateFromGoogle } = require('../services/oauthService');
const { getCookieOptions } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', loginLimiter, async (req, res) => {
	try {
		const { username, email, password, confirmPassword } = req.body || {};
		const result = await register({ username, email, password, confirmPassword, ip: req.ip, userAgent: req.headers['user-agent'] });
		return res.status(201).json({ message: 'Registered. Please verify OTP sent to email.', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Registration failed' });
	}
});

router.post('/verify-email', loginLimiter, async (req, res) => {
	try {
		const { email, otp } = req.body || {};
		const result = await verifyEmail({ email, otp });
		return res.json({ message: 'Email verified', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Verification failed' });
	}
});

router.post('/resend-otp', loginLimiter, async (req, res) => {
	try {
		const { email } = req.body || {};
		const result = await resendOtp({ email });
		return res.json({ message: 'OTP resent successfully', ...result });
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Resend failed' });
	}
});

const failedAttempts = new Map(); 
function getLoginKey(req) {
    const identifier = req.body?.identifier || '';
    return `${identifier.toLowerCase()}|${req.ip}`;
}

router.post('/login', loginLimiter, async (req, res) => {
	try {
        const { identifier, password } = req.body || {};
        const key = getLoginKey(req);
        const rec = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
        if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
            const waitSec = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
            return res.status(429).json({ error: `Too many failed attempts. Try again in ${waitSec}s` });
        }
        const result = await login({ identifier, password, ip: req.ip, userAgent: req.headers['user-agent'] });
        res.cookie('access_token', result.accessToken, getCookieOptions());
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


router.post('/forgot-password', loginLimiter, async (req, res) => {
	try {
		const { email } = req.body || {};
		const result = await forgotPassword({ email });
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Forgot password failed' });
	}
});

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

router.post('/reset-password', async (req, res) => {
	try {
		const { token, password, confirmPassword } = req.body || {};
		const result = await resetPassword({ token, password, confirmPassword });
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Password reset failed' });
	}
});

router.post('/update-password', async (req, res) => {
	try {
		const token = req.cookies && req.cookies.access_token ? req.cookies.access_token : null;
		if (!token) return res.status(401).json({ error: 'Unauthorized' });
		
		const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
		const { currentPassword, newPassword } = req.body || {};
		
		// Import the auth service function for updating password
		const { updatePassword } = require('../services/authService');
		const result = await updatePassword({ 
			userId: payload.sub, 
			currentPassword, 
			newPassword 
		});
		
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Password update failed' });
	}
});

router.delete('/account', async (req, res) => {
	try {
		const token = req.cookies && req.cookies.access_token ? req.cookies.access_token : null;
		if (!token) return res.status(401).json({ error: 'Unauthorized' });
		
		const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
		
		// Import the auth service function for deleting account
		const { deleteAccount } = require('../services/authService');
		const result = await deleteAccount({ userId: payload.sub });
		
		// Clear the access cookie
		res.clearCookie('access_token', { path: '/' });
		
		return res.json(result);
	} catch (err) {
		return res.status(400).json({ error: err.message || 'Account deletion failed' });
	}
});

router.get('/oauth/google/start', (req, res) => {
	try {
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'Google OAuth not configured: missing GOOGLE_CLIENT_ID' });
        }
        if (!process.env.GOOGLE_REDIRECT_URI) {
            const fallback = `${req.protocol}://${req.get('host')}/api/auth/oauth/google/callback`;
            process.env.GOOGLE_REDIRECT_URI = fallback;
        }
        const makeState = typeof generateState === 'function'
            ? generateState
            : () => crypto.randomBytes(16).toString('hex');
        const state = makeState();
		res.cookie('oauth_state', state, { ...getCookieOptions(), maxAge: 60 * 1000 });
        const url = typeof buildGoogleAuthUrl === 'function'
            ? buildGoogleAuthUrl(state)
            : (() => {
                const params = new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                    response_type: 'code',
                    scope: 'openid email profile',
                    access_type: 'offline',
                    prompt: 'consent',
                    state
                });
                return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            })();
		return res.redirect(url);
	} catch (err) {
        console.error('Failed to start Google OAuth:', err);
        return res.status(500).json({ error: 'Failed to start Google OAuth' });
	}
});

router.get('/oauth/google/callback', async (req, res) => {
	try {
		const { code, state } = req.query || {};
        const savedState = req.cookies?.oauth_state;
        if (!code || !state || !savedState || state !== savedState) {
            console.warn('Invalid OAuth state', {
                hasCode: Boolean(code),
                stateFromQuery: state,
                stateFromCookie: savedState,
                cookieHeader: req.headers?.cookie
            });
			return res.status(400).json({ error: 'Invalid OAuth state' });
		}
		res.clearCookie('oauth_state', { path: '/' });
        const tokens = await exchangeCodeForTokens(code);
        const profile = await fetchGoogleProfile(tokens.access_token);

		const result = await loginOrCreateFromGoogle(profile, {
			ip: req.ip,
			userAgent: req.headers['user-agent']
		});
		res.cookie('access_token', result.accessToken, getCookieOptions());
		const redirectBase = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

		const welcome = result.isNewUser ? 'new' : 'returning';
		return res.redirect(`${redirectBase}/upload?welcome=${welcome}`);
	} catch (err) {
        console.error('Google OAuth callback failed:', err);
        return res.status(500).json({ error: 'Callback failed' });
	}
});

module.exports = router;


