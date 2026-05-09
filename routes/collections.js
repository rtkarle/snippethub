const express      = require('express');
const router       = express.Router();
const db           = require('../db/db');
const verifyToken  = require('../middleware/auth');

// GET /api/collections — list all with snippet count + last 3 preview titles
router.get('/', verifyToken, async (req, res) => {
  try {
    const [collections] = await db.query(
      `SELECT c.*,
         COUNT(DISTINCT ci.snippet_id) AS snippet_count,
         GROUP_CONCAT(DISTINCT s.title ORDER BY ci.snippet_id DESC SEPARATOR '||') AS preview_titles
       FROM collections c
       LEFT JOIN collection_items ci ON ci.collection_id = c.id
       LEFT JOIN snippets s ON s.id = ci.snippet_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    // Trim preview_titles to max 3
    collections.forEach(c => {
      if (c.preview_titles) {
        c.preview_titles = c.preview_titles.split('||').slice(0, 3);
      } else {
        c.preview_titles = [];
      }
    });
    res.json({ success: true, collections });
  } catch (err) {
    console.error('Get collections error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/collections/:id — get single collection with all snippets
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [[col]] = await db.query(
      'SELECT * FROM collections WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    const [snippets] = await db.query(
      `SELECT s.id, s.title, s.language, s.description, s.views, s.created_at
       FROM snippets s
       JOIN collection_items ci ON ci.snippet_id = s.id
       WHERE ci.collection_id = ?
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, collection: col, snippets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/collections — create new collection
router.post('/', verifyToken, async (req, res) => {
  const { name, color } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Collection name is required.' });
  }
  try {
    // Max 20 collections per user
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM collections WHERE user_id = ?', [req.user.id]
    );
    if (cnt >= 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 collections allowed.' });
    }
    const [result] = await db.query(
      'INSERT INTO collections (user_id, name, color) VALUES (?, ?, ?)',
      [req.user.id, name.trim().substring(0, 100), color || '#0d6efd']
    );
    res.status(201).json({ success: true, collectionId: result.insertId, message: 'Collection created!' });
  } catch (err) {
    console.error('Create collection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/collections/:id — rename / recolor
router.put('/:id', verifyToken, async (req, res) => {
  const { name, color } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }
  try {
    const [result] = await db.query(
      'UPDATE collections SET name = ?, color = ? WHERE id = ? AND user_id = ?',
      [name.trim().substring(0, 100), color || '#0d6efd', req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }
    res.json({ success: true, message: 'Collection updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/collections/:id/add — add snippet to collection
router.post('/:id/add', verifyToken, async (req, res) => {
  const { snippetId } = req.body;
  if (!snippetId) return res.status(400).json({ success: false, message: 'snippetId required.' });
  try {
    const [[col]] = await db.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
    );
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    await db.query(
      'INSERT IGNORE INTO collection_items (collection_id, snippet_id) VALUES (?, ?)',
      [req.params.id, snippetId]
    );
    res.json({ success: true, message: 'Added to collection.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/collections/:id/remove/:snippetId — remove snippet from collection
router.delete('/:id/remove/:snippetId', verifyToken, async (req, res) => {
  try {
    await db.query(
      `DELETE ci FROM collection_items ci
       JOIN collections c ON c.id = ci.collection_id
       WHERE ci.collection_id = ? AND ci.snippet_id = ? AND c.user_id = ?`,
      [req.params.id, req.params.snippetId, req.user.id]
    );
    res.json({ success: true, message: 'Removed from collection.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/collections/:id — delete entire collection
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM collections WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }
    res.json({ success: true, message: 'Collection deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
