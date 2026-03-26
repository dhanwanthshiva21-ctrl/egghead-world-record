// routes/comments.js — Add, delete comments

const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/comments ─────────────────────────────────────
// Logged in: add a comment to a post
router.post('/', requireAuth, (req, res) => {
  const { post_id, content } = req.body;
  if (!post_id || !content?.trim())
    return res.status(400).json({ error: 'post_id and content are required' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND published = 1').get(post_id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(post_id, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

// ── DELETE /api/comments/:id ───────────────────────────────
// Owner or admin can delete a comment
router.delete('/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isOwner = comment.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin)
    return res.status(403).json({ error: 'Not allowed to delete this comment' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Comment deleted' });
});

// ── GET /api/comments?post_id=X ───────────────────────────
// Public: get all comments for a post
router.get('/', (req, res) => {
  const { post_id } = req.query;
  if (!post_id) return res.status(400).json({ error: 'post_id query param required' });

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(post_id);

  res.json(comments);
});

module.exports = router;
