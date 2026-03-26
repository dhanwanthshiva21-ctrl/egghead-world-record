// server.js — Eggland Backend 🥚

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialise DB (creates tables + seeds data on first run)
require('./db');

const authRoutes    = require('./routes/auth');
const postsRoutes   = require('./routes/posts');
const commentsRoutes= require('./routes/comments');
const adminRoutes   = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ─────────────────────────────────────────────
app.use(cors({
  origin: '*',            // Change to your frontend URL in production
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// ── ROUTES ─────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/posts',    postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/admin',    adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '🥚 Eggland backend is alive' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🥚  Eggland backend running at http://localhost:${PORT}`);
  console.log(`📖  API docs: see README.md\n`);
});
