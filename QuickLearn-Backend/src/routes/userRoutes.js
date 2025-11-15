const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../config/db');
const File = require('../models/File');
const { configureCloudinary } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const [users] = await pool.execute(
            `SELECT id, uuid, username, email, created_at, last_login_at, 
                    COALESCE(profile_picture_url, '') as profile_picture_url, 
                    COALESCE(bio, '') as bio, 
                    COALESCE(display_name, username) as display_name
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!users.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            displayName: user.display_name || user.username,
            bio: user.bio || '',
            profilePicture: user.profile_picture_url || '',
            createdAt: user.created_at,
            lastLogin: user.last_login_at
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { displayName, bio } = req.body;
        
        if (!displayName || displayName.trim().length === 0) {
            return res.status(400).json({ error: 'Display name is required' });
        }

        if (displayName.length > 50) {
            return res.status(400).json({ error: 'Display name must be 50 characters or less' });
        }

        if (bio && bio.length > 500) {
            return res.status(400).json({ error: 'Bio must be 500 characters or less' });
        }

        const pool = await getPool();
        await pool.execute(
            'UPDATE users SET display_name = ?, bio = ?, updated_at = NOW() WHERE id = ?',
            [displayName.trim(), bio?.trim() || null, req.user.id]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/profile/picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const cloudinary = configureCloudinary();
        const folder = `quicklearn/users/${req.user.id}/profile`;
        
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    transformation: [
                        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
                        { quality: 'auto:good' }
                    ],
                    use_filename: true,
                    unique_filename: true
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(req.file.buffer);
        });

        const pool = await getPool();
        await pool.execute(
            'UPDATE users SET profile_picture_url = ?, updated_at = NOW() WHERE id = ?',
            [result.secure_url, req.user.id]
        );

        res.json({ 
            message: 'Profile picture updated successfully',
            profilePictureUrl: result.secure_url
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

router.get('/profile/statistics', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;

        const [quizStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT q.id) as quizzesCreated,
                COUNT(DISTINCT qa.id) as quizzesTaken,
                COALESCE(AVG(qa.score), 0) as averageScore
            FROM users u
            LEFT JOIN quizzes q ON u.id = q.user_id
            LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
            WHERE u.id = ?
        `, [userId]);

        const [recentActivity] = await pool.execute(`
            SELECT 
                'quiz_created' as type,
                q.title,
                q.created_at as activity_date
            FROM quizzes q
            WHERE q.user_id = ?
            UNION ALL
            SELECT 
                'quiz_taken' as type,
                q.title,
                qa.taken_at as activity_date
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = ?
            ORDER BY activity_date DESC
            LIMIT 10
        `, [userId, userId]);

        const stats = quizStats[0];
        
        res.json({
            quizzesCreated: parseInt(stats.quizzesCreated) || 0,
            quizzesTaken: parseInt(stats.quizzesTaken) || 0,
            averageScore: Math.round(parseFloat(stats.averageScore) || 0),
            recentActivity: recentActivity
        });
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete profile picture
router.delete('/profile/picture', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        
        // Get current profile picture URL
        const [users] = await pool.execute(
            'SELECT profile_picture_url FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length && users[0].profile_picture_url) {
            // Extract public_id from Cloudinary URL for deletion
            const url = users[0].profile_picture_url;
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            
            // Delete from Cloudinary
            const cloudinary = configureCloudinary();
            await cloudinary.uploader.destroy(publicId);
        }

        // Remove from database
        await pool.execute(
            'UPDATE users SET profile_picture_url = NULL, updated_at = NOW() WHERE id = ?',
            [req.user.id]
        );

        res.json({ message: 'Profile picture deleted successfully' });
    } catch (error) {
        console.error('Error deleting profile picture:', error);
        res.status(500).json({ error: 'Failed to delete profile picture' });
    }
});

// Get notification preferences
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const [users] = await pool.execute(
            'SELECT notification_preferences FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!users.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const preferences = users[0].notification_preferences;
        
        // Return default preferences if null
        const defaultPreferences = {
            emailNotifications: true,
            quizReminders: true,
            weeklyDigest: false
        };

        if (!preferences) {
            return res.json(defaultPreferences);
        }

        // Parse JSON if it's a string, otherwise use as-is
        try {
            const parsed = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
            res.json(parsed);
        } catch (error) {
            // If parsing fails, return defaults
            console.warn('Failed to parse notification preferences, using defaults:', error);
            res.json(defaultPreferences);
        }
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update notification preferences
router.put('/notifications', authenticateToken, async (req, res) => {
    try {
        const { emailNotifications, quizReminders, weeklyDigest } = req.body;

        // Validate that all required fields are present and are booleans
        if (typeof emailNotifications !== 'boolean' ||
            typeof quizReminders !== 'boolean' ||
            typeof weeklyDigest !== 'boolean') {
            return res.status(400).json({ 
                error: 'All notification preferences must be boolean values' 
            });
        }

        const preferences = JSON.stringify({
            emailNotifications,
            quizReminders,
            weeklyDigest
        });

        const pool = await getPool();
        await pool.execute(
            'UPDATE users SET notification_preferences = ?, updated_at = NOW() WHERE id = ?',
            [preferences, req.user.id]
        );

        res.json({ 
            message: 'Notification preferences updated successfully',
            preferences: {
                emailNotifications,
                quizReminders,
                weeklyDigest
            }
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
