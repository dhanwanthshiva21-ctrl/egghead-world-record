// routes/admin.js — Admin dashboard data

const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// ── GET /api/admin/stats ───────────────────────────────────
// Dashboard summary stats
router.get('/stats', (req, res) => {
  const stats = {
    total_posts:     db.prepare('SELECT COUNT(*) as c FROM posts').get().c,
    published_posts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE published = 1').get().c,
    draft_posts:     db.prepare('SELECT COUNT(*) as c FROM posts WHERE published = 0').get().c,
    total_users:     db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    total_comments:  db.prepare('SELECT COUNT(*) as c FROM comments').get().c,
    total_reactions: db.prepare('SELECT COUNT(*) as c FROM reactions').get().c,
    recent_comments: db.prepare(`
      SELECT c.*, u.username, p.title as post_title
      FROM comments c
      JOIN users u ON u.id = c.user_id
      JOIN posts p ON p.id = c.post_id
      ORDER BY c.created_at DESC LIMIT 5
    `).all(),
    top_posts: db.prepare(`
      SELECT p.id, p.title, p.slug, p.published,
        COUNT(DISTINCT r.id) as reactions,
        COUNT(DISTINCT c.id) as comments
      FROM posts p
      LEFT JOIN reactions r ON r.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id
      ORDER BY reactions DESC
      LIMIT 5
    `).all()
  };
  res.json(stats);
});

// ── GET /api/admin/users ───────────────────────────────────
// List all users
router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, avatar, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// ── PATCH /api/admin/users/:id ─────────────────────────────
// Promote/demote user role
router.patch('/users/:id', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role))
    return res.status(400).json({ error: 'role must be "user" or "admin"' });

  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ message: `User role updated to ${role}` });
});

// ── DELETE /api/admin/users/:id ────────────────────────────
// Delete a user (and their comments/reactions via CASCADE)
router.delete('/users/:id', (req, res) => {
  if (String(req.params.id) === String(req.user.id))
    return res.status(400).json({ error: "You can't delete yourself" });

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

// ── GET /api/admin/comments ────────────────────────────────
// All comments with context
router.get('/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, p.title as post_title, p.slug as post_slug
    FROM comments c
    JOIN users u ON u.id = c.user_id
    JOIN posts p ON p.id = c.post_id
    ORDER BY c.created_at DESC
  `).all();
  res.json(comments);
});

// ── DELETE /api/admin/comments/:id ────────────────────────
// Admin delete any comment
router.delete('/comments/:id', (req, res) => {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
