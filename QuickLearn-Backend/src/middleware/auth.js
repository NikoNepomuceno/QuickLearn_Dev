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

        // Sliding idle timeout: refresh cookie expiration with a new token
        const refreshedToken = jwt.sign({ sub: payload.sub, uuid: payload.uuid, username: payload.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
        res.cookie('access_token', refreshedToken, getCookieOptions());

        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { authGuard, getCookieOptions };


