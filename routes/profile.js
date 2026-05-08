const express = require('express');
const router = express.Router();
const db = require('../db/db');
const verifyToken = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/profile
router.put('/', verifyToken, async (req, res) => {
  const { bio, avatar } = req.body;
  try {
    await db.query(
      'UPDATE users SET bio = ?, avatar = ? WHERE id = ?',
      [bio?.substring(0, 200) || '', avatar || '👤', req.user.id]
    );
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/profile/password
router.put('/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Invalid password data.' });
  }

  try {
    const [[user]] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
