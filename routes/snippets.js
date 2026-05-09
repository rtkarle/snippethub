const express      = require('express');
const router       = express.Router();
const db           = require('../db/db');
const verifyToken  = require('../middleware/auth');
const validate     = require('../middleware/validate');
const crypto       = require('crypto');

// ─── Helper: log activity ───────────────────────────────────────────────────
async function logActivity(userId, action, snippetId = null, detail = '') {
  try {
    await db.query(
      'INSERT INTO activity_log (user_id, action, snippet_id, detail) VALUES (?, ?, ?, ?)',
      [userId, action, snippetId, detail]
    );
  } catch (_) {}
}

// ─── GET /api/snippets ───────────────────────────────────────────────────────
// Query params: language, search, tag, sort (newest|oldest|popular|liked), page, limit
router.get('/', verifyToken, async (req, res) => {
  try {
    const { language, search, tag, sort = 'newest', page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT s.*, u.username,
        (SELECT COUNT(*) FROM snippet_likes sl WHERE sl.snippet_id = s.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.snippet_id = s.id) AS comment_count,
        GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ',') AS tags
      FROM snippets s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN snippet_tags st ON st.snippet_id = s.id
      LEFT JOIN tags t ON t.id = st.tag_id
      WHERE s.user_id = ?`;

    const params = [req.user.id];

    if (language) { query += ' AND s.language = ?'; params.push(language); }
    if (search)   { query += ' AND (s.title LIKE ? OR s.description LIKE ? OR s.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (tag)      { query += ' AND t.name = ?'; params.push(tag); }

    query += ' GROUP BY s.id';

    const sortMap = {
      newest:  'ORDER BY s.created_at DESC',
      oldest:  'ORDER BY s.created_at ASC',
      popular: 'ORDER BY s.views DESC',
      liked:   'ORDER BY like_count DESC'
    };
    query += ` ${sortMap[sort] || sortMap.newest}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [snippets] = await db.query(query, params);

    // Total count for pagination
    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM snippets WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ success: true, snippets, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get snippets error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/snippets/explore ───────────────────────────────────────────────
// Public snippets from all users
router.get('/explore', async (req, res) => {
  try {
    const { language, search, sort = 'popular', page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT s.id, s.title, s.language, s.description, s.views, s.created_at,
        u.username, u.avatar,
        (SELECT COUNT(*) FROM snippet_likes sl WHERE sl.snippet_id = s.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.snippet_id = s.id) AS comment_count,
        LEFT(s.code, 200) AS code_preview,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') AS tags
      FROM snippets s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN snippet_tags st ON st.snippet_id = s.id
      LEFT JOIN tags t ON t.id = st.tag_id
      WHERE s.is_public = 1`;

    const params = [];
    if (language) { query += ' AND s.language = ?'; params.push(language); }
    if (search)   { query += ' AND (s.title LIKE ? OR s.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' GROUP BY s.id';
    const sortMap = { popular: 'ORDER BY s.views DESC', newest: 'ORDER BY s.created_at DESC', liked: 'ORDER BY like_count DESC' };
    query += ` ${sortMap[sort] || sortMap.popular} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [snippets] = await db.query(query, params);
    res.json({ success: true, snippets });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/snippets/stats ─────────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const uid = req.user.id;
    const [[{ total }]]   = await db.query('SELECT COUNT(*) AS total FROM snippets WHERE user_id = ?', [uid]);
    const [[{ pub }]]     = await db.query('SELECT COUNT(*) AS pub FROM snippets WHERE user_id = ? AND is_public = 1', [uid]);
    const [[{ views }]]   = await db.query('SELECT COALESCE(SUM(views),0) AS views FROM snippets WHERE user_id = ?', [uid]);
    const [[{ likes }]]   = await db.query('SELECT COUNT(*) AS likes FROM snippet_likes sl JOIN snippets s ON sl.snippet_id = s.id WHERE s.user_id = ?', [uid]);
    const [langs]         = await db.query('SELECT language, COUNT(*) AS cnt FROM snippets WHERE user_id = ? GROUP BY language ORDER BY cnt DESC LIMIT 5', [uid]);
    const [recent]        = await db.query('SELECT action, detail, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [uid]);

    res.json({ success: true, stats: { total, public: pub, views, likes, topLanguages: langs, recentActivity: recent } });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/snippets/:id ───────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.username, u.avatar,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') AS tags
       FROM snippets s JOIN users u ON s.user_id = u.id
       LEFT JOIN snippet_tags st ON st.snippet_id = s.id
       LEFT JOIN tags t ON t.id = st.tag_id
       WHERE s.id = ? AND (s.user_id = ? OR s.is_public = 1)
       GROUP BY s.id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });

    // Increment view count
    await db.query('UPDATE snippets SET views = views + 1 WHERE id = ?', [req.params.id]);

    // Get version history
    const [versions] = await db.query(
      'SELECT version, saved_at FROM snippet_versions WHERE snippet_id = ? ORDER BY version DESC',
      [req.params.id]
    );

    // Get comments
    const [comments] = await db.query(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.snippet_id = ? ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, snippet: rows[0], versions, comments });
  } catch (err) {
    console.error('Get snippet error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/snippets ──────────────────────────────────────────────────────
router.post('/', verifyToken, validate('snippet'), async (req, res) => {
  const { title, language, code, description, is_public, tags } = req.body;

  if (!title || !language || !code) {
    return res.status(400).json({ success: false, message: 'Title, language, and code are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const shareToken = is_public ? crypto.randomBytes(16).toString('hex') : null;

    const [result] = await conn.query(
      'INSERT INTO snippets (user_id, title, language, code, description, is_public, share_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, language, code, description || '', is_public ? 1 : 0, shareToken]
    );

    const snippetId = result.insertId;

    // Save initial version
    await conn.query(
      'INSERT INTO snippet_versions (snippet_id, code, version) VALUES (?, ?, 1)',
      [snippetId, code]
    );

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags.slice(0, 5)) {
        const clean = tagName.trim().toLowerCase().substring(0, 30);
        if (!clean) continue;
        await conn.query('INSERT IGNORE INTO tags (name) VALUES (?)', [clean]);
        const [[tag]] = await conn.query('SELECT id FROM tags WHERE name = ?', [clean]);
        await conn.query('INSERT IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)', [snippetId, tag.id]);
      }
    }

    await conn.commit();
    await logActivity(req.user.id, 'created', snippetId, title);

    res.status(201).json({ success: true, message: 'Snippet saved!', snippetId, shareToken });
  } catch (err) {
    await conn.rollback();
    console.error('Create snippet error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/snippets/:id ───────────────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  const { title, language, code, description, is_public, tags } = req.body;
  const snippetId = req.params.id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      'SELECT * FROM snippets WHERE id = ? AND user_id = ?',
      [snippetId, req.user.id]
    );
    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Snippet not found or access denied.' });
    }

    // Save version if code changed
    if (existing.code !== code) {
      const newVersion = existing.version + 1;
      await conn.query(
        'INSERT INTO snippet_versions (snippet_id, code, version) VALUES (?, ?, ?)',
        [snippetId, existing.code, existing.version]
      );
      await conn.query(
        'UPDATE snippets SET title=?, language=?, code=?, description=?, is_public=?, version=? WHERE id=?',
        [title, language, code, description || '', is_public ? 1 : 0, newVersion, snippetId]
      );
    } else {
      await conn.query(
        'UPDATE snippets SET title=?, language=?, code=?, description=?, is_public=? WHERE id=?',
        [title, language, code, description || '', is_public ? 1 : 0, snippetId]
      );
    }

    // Update tags
    await conn.query('DELETE FROM snippet_tags WHERE snippet_id = ?', [snippetId]);
    if (tags && tags.length > 0) {
      for (const tagName of tags.slice(0, 5)) {
        const clean = tagName.trim().toLowerCase().substring(0, 30);
        if (!clean) continue;
        await conn.query('INSERT IGNORE INTO tags (name) VALUES (?)', [clean]);
        const [[tag]] = await conn.query('SELECT id FROM tags WHERE name = ?', [clean]);
        await conn.query('INSERT IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)', [snippetId, tag.id]);
      }
    }

    await conn.commit();
    await logActivity(req.user.id, 'updated', snippetId, title);

    res.json({ success: true, message: 'Snippet updated!' });
  } catch (err) {
    await conn.rollback();
    console.error('Update snippet error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// ─── DELETE /api/snippets/:id ────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, title FROM snippets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });

    await db.query('DELETE FROM snippets WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'deleted', null, rows[0].title);

    res.json({ success: true, message: 'Snippet deleted.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/snippets/:id/like ─────────────────────────────────────────────
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const [existing] = await db.query(
      'SELECT 1 FROM snippet_likes WHERE user_id = ? AND snippet_id = ?',
      [req.user.id, req.params.id]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM snippet_likes WHERE user_id = ? AND snippet_id = ?', [req.user.id, req.params.id]);
      res.json({ success: true, liked: false, message: 'Unliked.' });
    } else {
      await db.query('INSERT INTO snippet_likes (user_id, snippet_id) VALUES (?, ?)', [req.user.id, req.params.id]);
      res.json({ success: true, liked: true, message: 'Liked!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/snippets/:id/comment ──────────────────────────────────────────
router.post('/:id/comment', verifyToken, async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO comments (snippet_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, content.trim().substring(0, 500)]
    );
    res.status(201).json({ success: true, commentId: result.insertId, message: 'Comment added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/snippets/share/:token ──────────────────────────────────────────
router.get('/share/:token', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.username, u.avatar,
        GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') AS tags
       FROM snippets s JOIN users u ON s.user_id = u.id
       LEFT JOIN snippet_tags st ON st.snippet_id = s.id
       LEFT JOIN tags t ON t.id = st.tag_id
       WHERE s.share_token = ? AND s.is_public = 1
       GROUP BY s.id`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });

    await db.query('UPDATE snippets SET views = views + 1 WHERE share_token = ?', [req.params.token]);
    res.json({ success: true, snippet: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
