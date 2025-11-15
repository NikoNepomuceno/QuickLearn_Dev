const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('./server');
const { Server } = require('socket.io');
const { setupLeaderboardRealtime } = require('./realtime/leaderboard');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.IO with CORS aligned to API CORS
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const io = new Server(server, {
	cors: { origin: allowedOrigin, credentials: true },
	perMessageDeflate: process.env.ENABLE_WS_DEFLATE === '1' ? {
		threshold: 1024,
		concurrencyLimit: 8
	} : false
});
// Expose IO for services to broadcast
global.__io = io;

// Authenticate socket connections using JWT from cookie or Authorization header
io.use((socket, next) => {
	try {
		const headers = socket.handshake.headers || {};
		let token = null;
		// Authorization: Bearer <token>
		if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
			token = headers.authorization.substring(7);
		}
		// Cookie fallback
		if (!token && headers.cookie) {
			const parts = headers.cookie.split(';').map(s => s.trim());
			for (const p of parts) {
				if (p.startsWith('access_token=')) {
					token = decodeURIComponent(p.split('=')[1]);
					break;
				}
			}
		}
		if (!token) return next(new Error('Unauthorized'));
		const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
		socket.data.userId = payload.sub;
		socket.data.username = payload.username;
		return next();
	} catch (err) {
		return next(new Error('Unauthorized'));
	}
});

// Wire leaderboard realtime events
setupLeaderboardRealtime(io);

// Initialize notification scheduler
const { initializeScheduler } = require('./services/scheduler');
const schedulerEnabled = process.env.ENABLE_NOTIFICATION_SCHEDULER !== 'false' && process.env.NODE_ENV !== 'test';

server.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
	
	// Initialize scheduler after server starts
	if (schedulerEnabled) {
		initializeScheduler(true);
	} else {
		console.log('[Scheduler] Notification scheduler is disabled');
	}
});



