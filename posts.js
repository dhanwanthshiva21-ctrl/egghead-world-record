// routes/posts.js — CRUD for blog posts + reactions

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── GET /api/posts ─────────────────────────────────────────
// Public: list all published posts (admin sees drafts too)
router.get('/', optionalAuth, (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const posts = db.prepare(`
    SELECT p.*, u.username as author, u.avatar as author_avatar,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as like_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    ${isAdmin ? '' : 'WHERE p.published = 1'}
    ORDER BY p.created_at DESC
  `).all();
  res.json(posts);
});

// ── GET /api/posts/:slug ───────────────────────────────────
// Public: get single post by slug
router.get('/:slug', optionalAuth, (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const post = db.prepare(`
    SELECT p.*, u.username as author, u.avatar as author_avatar,
      (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as like_count
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.slug = ? ${isAdmin ? '' : 'AND p.published = 1'}
  `).get(req.params.slug);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Attach comments
  post.comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(post.id);

  // Attach user's own reaction if logged in
  if (req.user) {
    post.my_reaction = db.prepare(
      'SELECT type FROM reactions WHERE post_id = ? AND user_id = ?'
    ).get(post.id, req.user.id)?.type || null;
  }

  res.json(post);
});

// ── POST /api/posts ────────────────────────────────────────
// Admin only: create a post
router.post('/', requireAdmin, (req, res) => {
  const { title, tag, content, emoji, published } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });

  const slug = slugify(title);
  try {
    const result = db.prepare(`
      INSERT INTO posts (title, slug, tag, content, emoji, published, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, tag || 'Egg Update', content, emoji || '🥚', published !== false ? 1 : 0, req.user.id);

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(post);
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'A post with this title already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/posts/:id ───────────────────────────────────
// Admin only: update a post
router.patch('/:id', requireAdmin, (req, res) => {
  const { title, tag, content, emoji, published } = req.body;
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const updatedTitle = title ?? post.title;
  const updatedSlug = title ? slugify(title) : post.slug;

  db.prepare(`
    UPDATE posts SET title=?, slug=?, tag=?, content=?, emoji=?, published=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    updatedTitle, updatedSlug,
    tag ?? post.tag, content ?? post.content,
    emoji ?? post.emoji, published !== undefined ? (published ? 1 : 0) : post.published,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id));
});

// ── DELETE /api/posts/:id ──────────────────────────────────
// Admin only: delete a post
router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Post not found' });
  res.json({ message: 'Post deleted' });
});

// ── POST /api/posts/:id/react ──────────────────────────────
// Logged in: toggle a reaction (like/emoji) on a post
router.post('/:id/react', requireAuth, (req, res) => {
  const { type = '❤️' } = req.body;
  const postId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM reactions WHERE post_id = ? AND user_id = ?'
  ).get(postId, req.user.id);

  if (existing) {
    if (existing.type === type) {
      // Same reaction → remove it (toggle off)
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
      return res.json({ message: 'Reaction removed', reacted: false });
    } else {
      // Different reaction → update it
      db.prepare('UPDATE reactions SET type = ? WHERE id = ?').run(type, existing.id);
      return res.json({ message: 'Reaction updated', reacted: true, type });
    }
  }

  db.prepare(
    'INSERT INTO reactions (post_id, user_id, type) VALUES (?, ?, ?)'
  ).run(postId, req.user.id, type);

  const count = db.prepare('SELECT COUNT(*) as c FROM reactions WHERE post_id = ?').get(postId).c;
  res.json({ message: 'Reaction added', reacted: true, type, total: count });
});

module.exports = router;
