const express     = require('express');
const router      = express.Router();
const db          = require('../db/db');
const verifyToken = require('../middleware/auth');
const bcrypt      = require('bcryptjs');

// GET /api/profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Snippet summary
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total,
         SUM(is_public) AS public_count,
         COALESCE(SUM(views), 0) AS total_views
       FROM snippets WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, user, stats });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/profile — update bio & avatar
router.put('/', verifyToken, async (req, res) => {
  const { bio, avatar } = req.body;
  const allowedAvatars = ['👤','😎','🧑‍💻','👩‍💻','🦊','🐱','🐼','🦁','🚀','⚡','🔥','💡'];

  if (avatar && !allowedAvatars.includes(avatar)) {
    return res.status(400).json({ success: false, message: 'Invalid avatar.' });
  }
  try {
    await db.query(
      'UPDATE users SET bio = ?, avatar = ? WHERE id = ?',
      [(bio || '').substring(0, 200), avatar || '👤', req.user.id]
    );
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/profile/password — change password
router.put('/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both fields are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: 'New password must be different from current.' });
  }

  try {
    const [[user]] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/profile/public/:username — public profile view
router.get('/public/:username', async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, username, avatar, bio, created_at FROM users WHERE username = ?',
      [req.params.username]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const [snippets] = await db.query(
      `SELECT id, title, language, description, views, created_at
       FROM snippets WHERE user_id = ? AND is_public = 1
       ORDER BY created_at DESC LIMIT 20`,
      [user.id]
    );
    res.json({ success: true, user, snippets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
