const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Stricter limiter for login attempts (security-sensitive)
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Increased to 10 to allow for legitimate login attempts
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many login attempts. Please try again later.' },
	skipSuccessfulRequests: false, // Count all requests
	keyGenerator: (req) => {
		// Use IP + identifier if available for more granular tracking
		// Use ipKeyGenerator helper to properly handle IPv6 addresses
		const ip = ipKeyGenerator(req);
		const identifier = req.body?.identifier || '';
		return identifier ? `${ip}:${identifier.toLowerCase()}` : ip;
	}
});

// More lenient limiter for registration/verification endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20, // Higher limit for registration flow
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again later.' }
});

module.exports = { loginLimiter, authLimiter };


