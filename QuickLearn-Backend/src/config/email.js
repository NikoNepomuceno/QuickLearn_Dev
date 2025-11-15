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

async function sendQuizReminderEmail({ to, username, incompleteQuizzes }) {
	const transporter = createTransport();
	const appName = process.env.APP_NAME || 'QuickLearn';
	const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || `no-reply@${(process.env.DOMAIN || 'quicklearn.local')}`;
	const fromName = process.env.MAIL_FROM_NAME || appName;
	const from = `${fromName} <${fromAddress}>`;
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
	
	const quizList = incompleteQuizzes.map(quiz => {
		const quizUrl = `${frontendUrl}/quiz/${quiz.uuid}`;
		return `
			<li style="margin:12px 0;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #667eea">
				<strong style="color:#1e293b">${quiz.title || 'Untitled Quiz'}</strong>
				<br>
				<span style="color:#64748b;font-size:14px">Created: ${new Date(quiz.created_at).toLocaleDateString()}</span>
				<br>
				<a href="${quizUrl}" style="color:#667eea;text-decoration:none;font-weight:600;margin-top:8px;display:inline-block">Take Quiz →</a>
			</li>
		`;
	}).join('');

	const html = `
		<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
			<h2 style="color:#1e293b">${appName}: Quiz Reminder</h2>
			<p>Hi ${username || 'there'},</p>
			<p>You have ${incompleteQuizzes.length} incomplete ${incompleteQuizzes.length === 1 ? 'quiz' : 'quizzes'} waiting for you:</p>
			<ul style="list-style:none;padding:0;margin:20px 0">
				${quizList}
			</ul>
			<div style="text-align:center;margin:30px 0">
				<a href="${frontendUrl}/quizzes" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">View All Quizzes</a>
			</div>
			<p style="color:#64748b;font-size:14px">Don't want these reminders? You can manage your notification preferences in your account settings.</p>
			<p style="color:#888;font-size:12px;margin-top:30px">Sent by ${appName}</p>
		</div>
	`;
	await transporter.sendMail({ to, from, subject: `${appName} - Complete Your Quizzes`, html });
}

async function sendWeeklyDigestEmail({ to, username, weeklyStats }) {
	const transporter = createTransport();
	const appName = process.env.APP_NAME || 'QuickLearn';
	const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || `no-reply@${(process.env.DOMAIN || 'quicklearn.local')}`;
	const fromName = process.env.MAIL_FROM_NAME || appName;
	const from = `${fromName} <${fromAddress}>`;
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
	
	const statsHtml = `
		<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:24px 0">
			<div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:20px;border-radius:12px;text-align:center">
				<div style="font-size:32px;font-weight:bold;margin-bottom:8px">${weeklyStats.quizzesCreated || 0}</div>
				<div style="font-size:14px;opacity:0.9">Quizzes Created</div>
			</div>
			<div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;padding:20px;border-radius:12px;text-align:center">
				<div style="font-size:32px;font-weight:bold;margin-bottom:8px">${weeklyStats.quizzesTaken || 0}</div>
				<div style="font-size:14px;opacity:0.9">Quizzes Completed</div>
			</div>
			<div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:20px;border-radius:12px;text-align:center">
				<div style="font-size:32px;font-weight:bold;margin-bottom:8px">${weeklyStats.averageScore || 0}%</div>
				<div style="font-size:14px;opacity:0.9">Average Score</div>
			</div>
			<div style="background:linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);color:white;padding:20px;border-radius:12px;text-align:center">
				<div style="font-size:32px;font-weight:bold;margin-bottom:8px">${weeklyStats.achievementsEarned || 0}</div>
				<div style="font-size:14px;opacity:0.9">Achievements</div>
			</div>
		</div>
	`;

	const html = `
		<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
			<h2 style="color:#1e293b">${appName}: Your Weekly Summary</h2>
			<p>Hi ${username || 'there'},</p>
			<p>Here's a summary of your activity this week:</p>
			${statsHtml}
			${weeklyStats.quizzesCreated > 0 || weeklyStats.quizzesTaken > 0 ? `
				<p style="margin-top:24px">Keep up the great work! Continue learning and improving your skills.</p>
			` : `
				<p style="margin-top:24px">Ready to get started? Create your first quiz or explore existing ones!</p>
			`}
			<div style="text-align:center;margin:30px 0">
				<a href="${frontendUrl}" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold">Continue Learning</a>
			</div>
			<p style="color:#64748b;font-size:14px">Don't want weekly summaries? You can manage your notification preferences in your account settings.</p>
			<p style="color:#888;font-size:12px;margin-top:30px">Sent by ${appName}</p>
		</div>
	`;
	await transporter.sendMail({ to, from, subject: `${appName} - Your Weekly Summary`, html });
}

module.exports = { sendOtpEmail, sendLoginAlertEmail, sendPasswordResetEmail, sendQuizReminderEmail, sendWeeklyDigestEmail };


