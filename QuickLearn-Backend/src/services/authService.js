const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/db');
const { sendOtpEmail, sendLoginAlertEmail } = require('../config/email');
const { getCookieOptions } = require('../middleware/auth');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function generateOtp() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

function createAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
}

async function register({ username, email, password, confirmPassword, ip, userAgent }) {
	if (!username || !email || !password || !confirmPassword) throw new Error('Missing required fields');
	if (password !== confirmPassword) throw new Error('Passwords do not match');
	if (!PASSWORD_REGEX.test(password)) throw new Error('Password does not meet complexity requirements');

	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [existing] = await conn.execute(
			'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
			[username, email]
		);
		if (existing.length) throw new Error('Username or email already in use');

		const passwordHash = await bcrypt.hash(password, 12);
		const userUuid = uuidv4();
		const [result] = await conn.execute(
			'INSERT INTO users (uuid, username, email, password_hash, is_email_verified) VALUES (?, ?, ?, ?, 0)',
			[userUuid, username, email, passwordHash]
		);
		const userId = result.insertId;

		// Create OTP record
		const otp = generateOtp();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		await conn.execute(
			'INSERT INTO email_verifications (user_id, otp_code, expires_at, attempt_count) VALUES (?, ?, ?, 0)',
			[userId, otp, expiresAt]
		);
		await conn.commit();

		await sendOtpEmail({ to: email, username, otp });
		return { userId, uuid: userUuid };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

async function verifyEmail({ email, otp }) {
	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [users] = await conn.execute('SELECT id, is_email_verified FROM users WHERE email = ? LIMIT 1', [email]);
		if (!users.length) throw new Error('User not found');
		const user = users[0];
		if (user.is_email_verified) {
			await conn.commit();
			return { verified: true };
		}

		const [rows] = await conn.execute(
			'SELECT id, otp_code, expires_at, attempt_count, consumed_at FROM email_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
			[user.id]
		);
		if (!rows.length) throw new Error('OTP not found');
		const rec = rows[0];
		if (rec.consumed_at) throw new Error('OTP already used');
		if (new Date(rec.expires_at) < new Date()) throw new Error('OTP expired');
		if (String(rec.otp_code) !== String(otp)) {
			await conn.execute('UPDATE email_verifications SET attempt_count = attempt_count + 1 WHERE id = ?', [rec.id]);
			throw new Error('Invalid OTP');
		}

		await conn.execute('UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?', [rec.id]);
		await conn.execute('UPDATE users SET is_email_verified = 1 WHERE id = ?', [user.id]);
		await conn.commit();
		return { verified: true };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

// Refresh-token sessions removed

async function login({ identifier, password, ip, userAgent }) {
	const pool = await getPool();
	const [users] = await pool.execute(
		'SELECT id, uuid, username, email, password_hash, is_email_verified FROM users WHERE username = ? OR email = ? LIMIT 1',
		[identifier, identifier]
	);
	if (!users.length) throw new Error('Invalid credentials');
	const user = users[0];
	const ok = await bcrypt.compare(password, user.password_hash);
	if (!ok) throw new Error('Invalid credentials');
	if (!user.is_email_verified) throw new Error('Email not verified');

	await pool.execute('UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [ip || null, user.id]);

    const accessToken = createAccessToken({ sub: String(user.id), uuid: user.uuid, username: user.username });

	// Alert on new device/location
	const [prevSessions] = await pool.execute(
		'SELECT id FROM sessions WHERE user_id = ? AND is_valid = 1 AND (ip_address = ? OR user_agent = ?) LIMIT 1',
		[user.id, ip || null, userAgent || null]
	);
	if (!prevSessions.length) {
		// Send alert asynchronously; do not block response
		void sendLoginAlertEmail({ to: user.email, username: user.username, ip, userAgent });
	}
    return { accessToken, user: { id: user.id, uuid: user.uuid, username: user.username, email: user.email } };
}

// Refresh endpoint removed

async function logout() {
    return { success: true };
}

module.exports = { register, verifyEmail, login, logout };


