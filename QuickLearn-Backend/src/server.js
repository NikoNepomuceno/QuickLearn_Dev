require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const quizRoutes = require('./routes/quizRoutes');
const notesRoutes = require('./routes/notesRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// CORS with credentials to support httpOnly cookies
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    return next();
});

app.use(express.json());
app.use(cookieParser());
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

module.exports = app;


