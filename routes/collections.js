const express = require('express');
const router = express.Router();
const db = require('../db/db');
const verifyToken = require('../middleware/auth');

// GET /api/collections
router.get('/', verifyToken, async (req, res) => {
  try {
    const [collections] = await db.query(
      `SELECT c.*, COUNT(ci.snippet_id) AS snippet_count
       FROM collections c
       LEFT JOIN collection_items ci ON ci.collection_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, collections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/collections
router.post('/', verifyToken, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required.' });

  try {
    const [result] = await db.query(
      'INSERT INTO collections (user_id, name, color) VALUES (?, ?, ?)',
      [req.user.id, name.trim().substring(0, 100), color || '#0d6efd']
    );
    res.status(201).json({ success: true, collectionId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/collections/:id/add
router.post('/:id/add', verifyToken, async (req, res) => {
  const { snippetId } = req.body;
  try {
    // Verify collection ownership
    const [[col]] = await db.query('SELECT id FROM collections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    await db.query('INSERT IGNORE INTO collection_items (collection_id, snippet_id) VALUES (?, ?)', [req.params.id, snippetId]);
    res.json({ success: true, message: 'Added to collection.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/collections/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM collections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Collection deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
