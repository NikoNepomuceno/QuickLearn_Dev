const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getPool } = require('../config/db');

// Use Node 18+/20+ global fetch when available; otherwise lazy-load node-fetch
const fetch = (typeof global !== 'undefined' && typeof global.fetch === 'function')
    ? global.fetch.bind(global)
    : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function generateState() {
	return crypto.randomBytes(16).toString('hex');
}

function buildGoogleAuthUrl(state) {
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
}

async function exchangeCodeForTokens(code) {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID,
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
			code,
			grant_type: 'authorization_code',
			redirect_uri: process.env.GOOGLE_REDIRECT_URI
		})
	});
	const json = await res.json();
	if (!res.ok) {
		throw new Error(json?.error_description || json?.error || 'OAuth exchange failed');
	}
	return json; 
}

async function fetchGoogleProfile(accessToken) {
	const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	const profile = await res.json();
	if (!res.ok || !profile?.email) {
		throw new Error('Failed to fetch Google profile');
	}
	return profile;
}

function createAccessToken(payload) {
	return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
}

async function loginOrCreateFromGoogle(profile, { ip, userAgent }) {
	const pool = await getPool();

	let userRows = [];
	try {
		[userRows] = await pool.execute(
			'SELECT id, uuid, username, email FROM users WHERE google_id = ? LIMIT 1',
			[profile.sub]
		);
	} catch {
		userRows = [];
	}

	let user = userRows[0];

	if (!user) {
		const [byEmail] = await pool.execute(
			'SELECT id, uuid, username, email FROM users WHERE email = ? LIMIT 1',
			[profile.email]
		);
		if (byEmail.length) {
			user = byEmail[0];
			try {
				await pool.execute('UPDATE users SET google_id = ? WHERE id = ?', [profile.sub, user.id]);
			} catch {}
		}
	}

	if (!user) {
		const base = (profile.name || profile.email.split('@')[0] || 'user')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '')
			.slice(0, 20) || 'user';
		let username = base;
		let i = 0;
		while (true) {
			const [rows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
			if (!rows.length) break;
			i++;
			username = `${base}${i}`;
		}

		const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
		const userUuid = uuidv4();

		let sql = 'INSERT INTO users (uuid, username, email, password_hash, is_email_verified) VALUES (?, ?, ?, ?, ?)';
		let params = [userUuid, username, profile.email, passwordHash, profile.email_verified ? 1 : 0];
		try {
			sql = 'INSERT INTO users (uuid, username, email, password_hash, is_email_verified, google_id) VALUES (?, ?, ?, ?, ?, ?)';
			params = [userUuid, username, profile.email, passwordHash, profile.email_verified ? 1 : 0, profile.sub];
		} catch {}

		const [insert] = await pool.execute(sql, params);
		user = { id: insert.insertId, uuid: userUuid, username, email: profile.email };
	}

	try {
		await pool.execute('UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [ip || null, user.id]);
	} catch {}

	const accessToken = createAccessToken({
		sub: String(user.id),
		uuid: user.uuid,
		username: user.username
	});

	return { accessToken, user };
}

module.exports = {
	generateState,
	buildGoogleAuthUrl,
	exchangeCodeForTokens,
	fetchGoogleProfile,
	loginOrCreateFromGoogle
};