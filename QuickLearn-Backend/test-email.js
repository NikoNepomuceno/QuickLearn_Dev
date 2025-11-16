require('dotenv').config();
const { sendOtpEmail } = require('./src/config/email');

async function testEmail() {
    try {
        console.log('Testing SMTP2GO email configuration...');
        console.log('Host:', process.env.MAIL_HOST || process.env.SMTP_HOST || 'Not set');
        console.log('Port:', process.env.MAIL_PORT || process.env.SMTP_PORT || 'Not set');
        console.log('From Address:', process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM || 'Not set');
        console.log('');
        
        // Get test email from command line or use a default
        const testEmail = process.argv[2] || process.env.TEST_EMAIL;
        
        if (!testEmail) {
            console.error('❌ Please provide a test email address:');
            console.error('   node test-email.js your-email@example.com');
            console.error('   OR set TEST_EMAIL in your .env file');
            process.exit(1);
        }
        
        console.log(`Sending test email to: ${testEmail}...`);
        console.log('');
        
        await sendOtpEmail({
            to: testEmail,
            username: 'Test User',
            otp: '123456'
        });
        
        console.log('✅ Email sent successfully!');
        console.log('📧 Check your inbox (and spam folder) for the test email.');
        console.log('');
        console.log('If you don\'t receive the email:');
        console.log('1. Check SMTP2GO dashboard for delivery status');
        console.log('2. Verify your SMTP credentials in .env');
        console.log('3. Ensure your sender email is verified in SMTP2GO');
    } catch (error) {
        console.error('❌ Email failed:', error.message);
        console.error('');
        console.error('Full error details:');
        console.error(error);
        console.error('');
        console.error('Troubleshooting:');
        console.error('1. Verify MAIL_HOST=mail.smtp2go.com in .env');
        console.error('2. Verify MAIL_PORT=2525 (or 8025, 587, 25) in .env');
        console.error('3. Check MAIL_USERNAME and MAIL_PASSWORD are correct');
        console.error('4. Ensure sender email is verified in SMTP2GO dashboard');
        process.exit(1);
    }
    process.exit(0);
}

testEmail();

