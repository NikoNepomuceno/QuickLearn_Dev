const nodemailer = require('nodemailer');

function createTransport() {
	// Support both legacy SMTP_* and Laravel-style MAIL_* env vars
	const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
	const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
	const encryption = (process.env.MAIL_ENCRYPTION || '').toLowerCase();
	const secure = typeof process.env.SMTP_SECURE !== 'undefined'
		? process.env.SMTP_SECURE === 'true'
		: (encryption === 'ssl' || (encryption === 'tls' && port === 465));
	const user = process.env.MAIL_USERNAME || process.env.SMTP_USER;
	const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;

	return nodemailer.createTransport({
		host,
		port,
		secure, // false for 587 STARTTLS; true for 465 implicit TLS
		auth: user && pass ? { user, pass } : undefined
	});
}

async function sendOtpEmail({ to, username, otp }) {
	const transporter = createTransport();
	const appName = process.env.APP_NAME || 'QuickLearn';
	const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || `no-reply@${(process.env.DOMAIN || 'quicklearn.local')}`;
	const fromName = process.env.MAIL_FROM_NAME || appName;
	const from = `${fromName} <${fromAddress}>`;
	const html = `
		<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
			<h2>${appName} Email Verification</h2>
			<p>Hi ${username || 'there'},</p>
			<p>Your One-Time Password (OTP) for verifying your email is:</p>
			<div style="font-size:28px;letter-spacing:6px;font-weight:bold;background:#f5f5f5;padding:12px;text-align:center;border-radius:8px">${otp}</div>
			<p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
			<p style="color:#888">Sent by ${appName}</p>
		</div>
	`;
	await transporter.sendMail({ to, from, subject: `${appName} - Verify your email`, html });
}

async function sendLoginAlertEmail({ to, username, ip, userAgent, time }) {
	const transporter = createTransport();
	const appName = process.env.APP_NAME || 'QuickLearn';
	const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || `no-reply@${(process.env.DOMAIN || 'quicklearn.local')}`;
	const fromName = process.env.MAIL_FROM_NAME || appName;
	const from = `${fromName} <${fromAddress}>`;
	const when = time || new Date().toISOString();
	const html = `
		<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
			<h2>${appName}: New Login Detected</h2>
			<p>Hi ${username || 'there'},</p>
			<p>We noticed a new login to your account.</p>
			<ul>
				<li><strong>Time:</strong> ${when}</li>
				<li><strong>IP:</strong> ${ip || 'Unknown'}</li>
				<li><strong>Device:</strong> ${userAgent || 'Unknown'}</li>
			</ul>
			<p>If this was you, no action is needed. If you don't recognize this activity, please reset your password immediately.</p>
			<p style="color:#888">Sent by ${appName}</p>
		</div>
	`;
	await transporter.sendMail({ to, from, subject: `${appName} - New Login Detected`, html });
}

async function sendPasswordResetEmail({ to, username, resetToken }) {
	const transporter = createTransport();
	const appName = process.env.APP_NAME || 'QuickLearn';
	const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || `no-reply@${(process.env.DOMAIN || 'quicklearn.local')}`;
	const fromName = process.env.MAIL_FROM_NAME || appName;
	const from = `${fromName} <${fromAddress}>`;
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
	const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
	const html = `
		<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
			<h2>${appName} Password Reset</h2>
			<p>Hi ${username || 'there'},</p>
			<p>You requested to reset your password. Click the button below to reset your password:</p>
			<div style="text-align:center;margin:30px 0">
				<a href="${resetUrl}" style="background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">Reset Password</a>
			</div>
			<p>Or copy and paste this link into your browser:</p>
			<p style="word-break:break-all;background:#f5f5f5;padding:10px;border-radius:4px">${resetUrl}</p>
			<p>This link will expire in 1 hour. If you did not request this password reset, you can safely ignore this email.</p>
			<p style="color:#888">Sent by ${appName}</p>
		</div>
	`;
	await transporter.sendMail({ to, from, subject: `${appName} - Reset your password`, html });
}

module.exports = { sendOtpEmail, sendLoginAlertEmail, sendPasswordResetEmail };


