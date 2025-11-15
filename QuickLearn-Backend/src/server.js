require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const responseTime = require('response-time');
const quizRoutes = require('./routes/quizRoutes');
const notesRoutes = require('./routes/notesRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adaptiveRoutes = require('./routes/adaptiveRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const flashcardsRoutes = require('./routes/flashcardsRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');
const achievementRoutes = require('./routes/achievementRoutes');

const app = express();
app.set('trust proxy', 1);

// CORS with credentials to support httpOnly cookies
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
	origin: allowedOrigin,
	credentials: true,
	methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
	allowedHeaders: ['Content-Type','Authorization'],
	maxAge: 600
}));

// Body parsers with limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(cookieParser());
// Optional lightweight response-time in dev or when enabled explicitly
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_RESPONSE_TIME === '1') {
	app.use(responseTime());
}
// Compression (skip tiny payloads)
app.use(compression({ threshold: 1024 }));
// Optional global rate limiter
if (process.env.ENABLE_GLOBAL_RATELIMIT === '1') {
	const globalLimiter = rateLimit({
		windowMs: 60 * 1000,
		limit: 300,
		standardHeaders: true,
		legacyHeaders: false
	});
	app.use(globalLimiter);
}
app.use(helmet({
	crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.get('/health', (req, res) => {
	res.json({ 
		status: 'ok',
		aiService: process.env.DEEPSEEK_API_KEY ? 'DeepSeek AI Available' : 'AI Service Not Configured'
	});
});

app.use('/api/quiz', quizRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/achievements', achievementRoutes);

module.exports = app;


