# Notification System Testing Guide

## Prerequisites

1. **Database Migration**: Make sure you've run the migration:
   ```sql
   -- Run this in your MySQL database
   SOURCE db/migrations/add_notification_preferences.sql;
   ```
   Or manually execute the SQL in the file.

2. **Dependencies**: Install node-cron (already done):
   ```bash
   npm install
   ```

3. **Email Configuration**: Ensure your `.env` has email settings:
   ```
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   MAIL_FROM_ADDRESS=your_email@gmail.com
   MAIL_FROM_NAME=QuickLearn
   FRONTEND_URL=http://localhost:5173
   ```

## Testing Steps

### 1. Test Notification Service Queries

Run the test script to verify the service functions work:

```bash
node src/scripts/testNotifications.js
```

This will show:
- Users with quiz reminders enabled
- Users with weekly digest enabled
- Incomplete quizzes for each user
- Weekly stats aggregation

**Expected Output**: You should see users and their incomplete quizzes listed.

### 2. Test API Endpoints

#### A. Get Notification Preferences

**Using curl** (replace `YOUR_TOKEN` with your JWT token):
```bash
curl -X GET http://localhost:3000/api/user/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  --cookie-jar cookies.txt
```

**Using browser/Postman**:
- URL: `GET http://localhost:3000/api/user/notifications`
- Include authentication cookie or Bearer token
- Expected response:
  ```json
  {
    "emailNotifications": true,
    "quizReminders": true,
    "weeklyDigest": false
  }
  ```

#### B. Update Notification Preferences

**Using curl**:
```bash
curl -X PUT http://localhost:3000/api/user/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "emailNotifications": true,
    "quizReminders": true,
    "weeklyDigest": true
  }'
```

**Using browser/Postman**:
- URL: `PUT http://localhost:3000/api/user/notifications`
- Body (JSON):
  ```json
  {
    "emailNotifications": true,
    "quizReminders": true,
    "weeklyDigest": true
  }
  ```
- Expected response:
  ```json
  {
    "message": "Notification preferences updated successfully",
    "preferences": {
      "emailNotifications": true,
      "quizReminders": true,
      "weeklyDigest": true
    }
  }
  ```

### 3. Test Frontend Integration

1. Start the frontend: `cd QuickLearn-Frontend && npm run dev`
2. Log in to your account
3. Navigate to Settings page
4. Go to "Notifications" section
5. Toggle the notification preferences
6. Verify the changes are saved (check browser console for API calls)

### 4. Test Email Sending

To actually send test emails, edit `src/scripts/testNotifications.js`:

1. Find the commented lines:
   ```javascript
   // await sendQuizReminderEmail(...);
   // await sendWeeklyDigestEmail(...);
   ```

2. Uncomment them:
   ```javascript
   await sendQuizReminderEmail({ to: user.email, username: user.username, incompleteQuizzes });
   await sendWeeklyDigestEmail({ to: user.email, username: user.username, weeklyStats: stats });
   ```

3. Run the script again:
   ```bash
   node src/scripts/testNotifications.js
   ```

4. Check the email inboxes for the test emails.

### 5. Test Scheduler Jobs

The scheduler runs automatically when the server starts. To test manually:

**Option A: Wait for scheduled time**
- Quiz reminders: Daily at 9:00 AM UTC
- Weekly digest: Every Monday at 8:00 AM UTC

**Option B: Trigger manually in code**

Create a test file `testScheduler.js`:
```javascript
require('dotenv').config();
const { sendQuizReminders, sendWeeklyDigests } = require('./src/services/scheduler');

// Test quiz reminders
sendQuizReminders().then(() => {
  console.log('Quiz reminders test completed');
  process.exit(0);
});

// Or test weekly digest
// sendWeeklyDigests().then(() => {
//   console.log('Weekly digest test completed');
//   process.exit(0);
// });
```

Run: `node testScheduler.js`

## Verification Checklist

- [ ] Database migration applied (check `users` table has `notification_preferences` column)
- [ ] Test script runs without errors
- [ ] API GET endpoint returns preferences
- [ ] API PUT endpoint updates preferences
- [ ] Frontend Settings page loads preferences from API
- [ ] Frontend Settings page saves preferences to API
- [ ] Email sending works (if uncommented in test script)
- [ ] Scheduler initializes when server starts (check server logs)

## Troubleshooting

### "No users found" in test script
- Check that users have `is_email_verified = 1`
- Check that `notification_preferences` JSON has the correct structure
- Run the migration if you haven't

### API returns 401 Unauthorized
- Make sure you're logged in
- Check that your JWT token is valid
- Verify cookie is being sent with request

### Emails not sending
- Check email configuration in `.env`
- Verify SMTP credentials are correct
- Check server logs for email errors
- Test with a simple email first (like OTP email)

### Scheduler not running
- Check server logs for scheduler initialization message
- Verify `ENABLE_NOTIFICATION_SCHEDULER` is not set to `false`
- Check that `NODE_ENV` is not set to `test`

## Next Steps

Once testing is complete:
1. Enable weekly digest for a test user via Settings page
2. Wait for Monday 8 AM UTC to see weekly digest email
3. Create a quiz and don't complete it for 2+ days to test quiz reminders
4. Monitor server logs for scheduler job execution

