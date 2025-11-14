const jwt = require('jsonwebtoken');

function getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 60 * 1000,
        path: '/',
    };
}

function authGuard(req, res, next) {
    try {
        const token = req.cookies && req.cookies.access_token ? req.cookies.access_token : null;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = payload;

        const refreshedToken = jwt.sign({ sub: payload.sub, uuid: payload.uuid, username: payload.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
        res.cookie('access_token', refreshedToken, getCookieOptions());

        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Alternative authentication for API endpoints (supports both cookies and Authorization header)
function authenticateToken(req, res, next) {
    try {
        let token = null;

        // Try to get token from Authorization header first
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Fallback to cookie
        if (!token && req.cookies && req.cookies.access_token) {
            token = req.cookies.access_token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = {
            id: payload.sub,
            uuid: payload.uuid,
            username: payload.username
        };

        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Optional authentication (doesn't fail if no token)
function optionalAuth(req, res, next) {
    try {
        let token = null;

        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        if (!token && req.cookies && req.cookies.access_token) {
            token = req.cookies.access_token;
        }

        if (token) {
            const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.user = {
                id: payload.sub,
                uuid: payload.uuid,
                username: payload.username
            };
        }

        return next();
    } catch (err) {
        // Continue without authentication
        return next();
    }
}

module.exports = { authGuard, getCookieOptions, authenticateToken, optionalAuth };


