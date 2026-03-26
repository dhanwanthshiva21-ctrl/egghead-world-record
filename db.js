// db.js — Sets up SQLite database and all tables

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'eggland.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ──────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user',   -- 'user' or 'admin'
    avatar      TEXT    DEFAULT '🥚',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    tag         TEXT    NOT NULL DEFAULT 'Egg Update',
    content     TEXT    NOT NULL,
    emoji       TEXT    NOT NULL DEFAULT '🥚',
    published   INTEGER NOT NULL DEFAULT 1,        -- 1 = published, 0 = draft
    author_id   INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL DEFAULT '❤️',     -- emoji reaction type
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id)                       -- one reaction per user per post
  );
`);

// ── SEED DEFAULT POSTS (only if table is empty) ────────────

const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();

if (postCount.count === 0) {
  // Create default admin user for seeding
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('eggadmin123', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password, role, avatar)
    VALUES (?, ?, ?, 'admin', '🥚')
  `);
  insertUser.run('theegg', 'egg@eggland.com', hash);

  const adminId = db.prepare("SELECT id FROM users WHERE username = 'theegg'").get().id;

  const insertPost = db.prepare(`
    INSERT INTO posts (title, slug, tag, content, emoji, author_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedPosts = [
    {
      title: 'I Woke Up One Day And Decided To Break The Internet',
      slug: 'break-the-internet',
      tag: 'My Origin Story',
      emoji: '🥚',
      content: "January 4, 2019. A quiet day. No one expected anything. And then — me. Just sitting there. Being an egg. The world lost its mind. I didn't. I'm an egg. We're very calm. 56.6 million likes later, here I am. Running a website. As one does."
    },
    {
      title: "Stop Asking If I'm Scrambled Or Fried. I Am Neither. I Am Free.",
      slug: 'scrambled-or-fried',
      tag: 'Hot Takes',
      emoji: '🍳',
      content: "I am a concept. A cultural moment. A symbol of collective human longing. Every day someone asks me how I like to be cooked. I don't. I am free. I am the most liked post on the internet. I am beyond breakfast."
    },
    {
      title: "Yes, I Beat A Billionaire. And I Didn't Even Try.",
      slug: 'beat-a-billionaire',
      tag: 'Achievement Unlocked',
      emoji: '🏆',
      content: "I just showed up. That's the whole strategy. Show up. Be an egg. Win. No PR team. No photoshoot. No brand deal. Just me, a camera, and destiny. Take notes."
    },
    {
      title: "Which Came First, The Egg Or The Viral Post? Me. The Answer Is Me.",
      slug: 'egg-came-first',
      tag: 'Existential Corner',
      emoji: '💭',
      content: "Philosophers have debated this for centuries. Aristotle couldn't figure it out. Neither could your philosophy professor. But I, The Egg, have solved it. I came first. I came first in the record books. Case closed. You're welcome."
    }
  ];

  seedPosts.forEach(p => insertPost.run(p.title, p.slug, p.tag, p.content, p.emoji, adminId));
  console.log('✅ Database seeded with default posts');
}

module.exports = db;
