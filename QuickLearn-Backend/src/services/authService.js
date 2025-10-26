const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { sendOtpEmail, sendLoginAlertEmail, sendPasswordResetEmail } = require('../config/email');
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

async function resendOtp({ email }) {
	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [users] = await conn.execute('SELECT id, username, is_email_verified FROM users WHERE email = ? LIMIT 1', [email]);
		if (!users.length) throw new Error('User not found');
		const user = users[0];
		if (user.is_email_verified) {
			await conn.commit();
			return { message: 'Email already verified' };
		}

		// Generate new OTP
		const otp = generateOtp();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		
		// Insert new OTP record
		await conn.execute(
			'INSERT INTO email_verifications (user_id, otp_code, expires_at, attempt_count) VALUES (?, ?, ?, 0)',
			[user.id, otp, expiresAt]
		);
		await conn.commit();

		await sendOtpEmail({ to: email, username: user.username, otp });
		return { message: 'OTP resent successfully' };
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

async function forgotPassword({ email }) {
	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [users] = await conn.execute('SELECT id, username, email FROM users WHERE email = ? LIMIT 1', [email]);
		if (!users.length) {
			await conn.commit();
			throw new Error('Invalid Email');
		}
		const user = users[0];

		// Generate secure reset token
		const resetToken = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		// Invalidate any existing reset tokens for this user
		await conn.execute('UPDATE password_reset_tokens SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL', [user.id]);

		// Insert new reset token
		await conn.execute(
			'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
			[user.id, resetToken, expiresAt]
		);
		await conn.commit();

		// Send reset email
		await sendPasswordResetEmail({ to: user.email, username: user.username, resetToken });
		return { message: 'Password reset link has been sent to your email.' };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

async function resetPassword({ token, password, confirmPassword }) {
	if (!token || !password || !confirmPassword) throw new Error('Missing required fields');
	if (password !== confirmPassword) throw new Error('Passwords do not match');
	if (!PASSWORD_REGEX.test(password)) throw new Error('Password does not meet complexity requirements');

	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		
		// Find valid reset token
		const [tokens] = await conn.execute(
			'SELECT id, user_id, expires_at, consumed_at FROM password_reset_tokens WHERE token = ? LIMIT 1',
			[token]
		);
		if (!tokens.length) throw new Error('Invalid or expired reset token');
		const tokenRecord = tokens[0];
		
		if (tokenRecord.consumed_at) throw new Error('Reset token has already been used');
		if (new Date(tokenRecord.expires_at) < new Date()) throw new Error('Reset token has expired');

		// Hash new password
		const passwordHash = await bcrypt.hash(password, 12);

		// Update user password
		await conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenRecord.user_id]);

		// Mark token as consumed
		await conn.execute('UPDATE password_reset_tokens SET consumed_at = NOW() WHERE id = ?', [tokenRecord.id]);

		// Invalidate all other reset tokens for this user
		await conn.execute('UPDATE password_reset_tokens SET consumed_at = NOW() WHERE user_id = ? AND id != ? AND consumed_at IS NULL', [tokenRecord.user_id, tokenRecord.id]);

		await conn.commit();
		return { message: 'Password reset successfully' };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

async function updatePassword({ userId, currentPassword, newPassword }) {
	if (!currentPassword || !newPassword) throw new Error('Missing required fields');
	if (!PASSWORD_REGEX.test(newPassword)) throw new Error('New password does not meet complexity requirements');

	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		
		// Get user's current password hash
		const [users] = await conn.execute('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
		if (!users.length) throw new Error('User not found');
		const user = users[0];
		
		// Verify current password
		const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
		if (!isCurrentPasswordValid) throw new Error('Current password is incorrect');
		
		// Hash new password
		const newPasswordHash = await bcrypt.hash(newPassword, 12);
		
		// Update password
		await conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
		
		await conn.commit();
		return { message: 'Password updated successfully' };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

async function deleteAccount({ userId }) {
	const pool = await getPool();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		
		// Verify user exists
		const [users] = await conn.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
		if (!users.length) throw new Error('User not found');
		
		// Delete all user-related data in the correct order (respecting foreign key constraints)
		// Delete quiz attempts first (references quizzes)
		await conn.execute('DELETE FROM quiz_attempts WHERE user_id = ?', [userId]);
		
		// Delete quizzes (references users)
		await conn.execute('DELETE FROM quizzes WHERE user_id = ?', [userId]);
		
		// Delete files (references users)
		await conn.execute('DELETE FROM files WHERE user_id = ?', [userId]);
		
		// Delete email verifications
		await conn.execute('DELETE FROM email_verifications WHERE user_id = ?', [userId]);
		
		// Delete password reset tokens
		await conn.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
		
		// Delete sessions
		await conn.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
		
		// Finally, delete the user
		await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
		
		await conn.commit();
		return { message: 'Account deleted successfully' };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

module.exports = { register, verifyEmail, resendOtp, login, logout, forgotPassword, resetPassword, updatePassword, deleteAccount };


