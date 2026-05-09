const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db/db');
const validate = require('../middleware/validate');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET || 'snippethub_secret_2026';
const JWT_EXPIRES = '7d';

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', validate('register'), async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check duplicates
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase(), username.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), email.toLowerCase().trim(), hashed]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        avatar:   user.avatar || '👤',
        bio:      user.bio || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
