// routes/auth.js — Register, login, profile

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ────────────────────────────────
// Body: { username, email, password, adminSecret? }
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, adminSecret } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'username, email and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const role = adminSecret && adminSecret === process.env.ADMIN_SECRET ? 'admin' : 'user';
    const hash = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
    );

    const result = stmt.run(username.trim(), email.trim().toLowerCase(), hash, role);
    const user = db.prepare('SELECT id, username, email, role, avatar FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────
// Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { password: _, ...safeUser } = user;
    res.json({ token: makeToken(safeUser), user: safeUser });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────
// Returns the logged-in user's profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, role, avatar, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── PATCH /api/auth/me ─────────────────────────────────────
// Update avatar emoji
router.patch('/me', requireAuth, (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'avatar is required' });
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
  res.json({ message: 'Profile updated' });
});

module.exports = router;
