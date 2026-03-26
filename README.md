# 🥚 Eggland Backend

A Node.js + Express + SQLite backend for the Eggland website.
Features: user accounts, JWT login, blog posts, comments, reactions, and an admin panel.

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd eggland-backend
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and change the secrets:
```
PORT=3001
JWT_SECRET=some_long_random_string_here
ADMIN_SECRET=secret_to_create_admin_accounts
```

### 3. Start the server
```bash
npm start          # production
npm run dev        # development (auto-restarts on changes)
```

The server starts at **http://localhost:3001**

On first run it automatically creates the SQLite database (`eggland.db`) and seeds it with sample posts and a default admin account:
- **Email:** egg@eggland.com
- **Password:** eggadmin123
- *(Change this password after first login!)*

---

## 📡 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get token |
| GET | `/api/auth/me` | ✅ User | Get my profile |
| PATCH | `/api/auth/me` | ✅ User | Update my avatar |

#### Register
```json
POST /api/auth/register
{
  "username": "shelley",
  "email": "shelley@example.com",
  "password": "mypassword",
  "adminSecret": "optional_if_you_want_admin_role"
}
```
Returns: `{ token, user }`

#### Login
```json
POST /api/auth/login
{ "email": "shelley@example.com", "password": "mypassword" }
```
Returns: `{ token, user }`

**Include the token in all authenticated requests:**
```
Authorization: Bearer <token>
```

---

### Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts` | — | List all posts |
| GET | `/api/posts/:slug` | — | Get single post |
| POST | `/api/posts` | 🔑 Admin | Create post |
| PATCH | `/api/posts/:id` | 🔑 Admin | Update post |
| DELETE | `/api/posts/:id` | 🔑 Admin | Delete post |
| POST | `/api/posts/:id/react` | ✅ User | Like / react |

#### Create Post (admin)
```json
POST /api/posts
{
  "title": "My New Egg Update",
  "tag": "News",
  "content": "Today I sat there. Again.",
  "emoji": "🥚",
  "published": true
}
```

#### React to a Post
```json
POST /api/posts/1/react
{ "type": "❤️" }
```
Calling again with the same type **removes** the reaction (toggle). Calling with a different type **updates** it.

---

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/comments?post_id=1` | — | Get comments for a post |
| POST | `/api/comments` | ✅ User | Add a comment |
| DELETE | `/api/comments/:id` | ✅ Owner/Admin | Delete a comment |

#### Add Comment
```json
POST /api/comments
{ "post_id": 1, "content": "This egg changed my life." }
```

---

### Admin Panel

All `/api/admin/*` routes require admin role.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Change user role |
| DELETE | `/api/admin/users/:id` | Delete a user |
| GET | `/api/admin/comments` | All comments |
| DELETE | `/api/admin/comments/:id` | Delete any comment |

---

## 🌐 Connecting to Your Frontend

In your `index.html`, make API calls like this:

```javascript
// Example: load all posts
const res = await fetch('http://localhost:3001/api/posts');
const posts = await res.json();

// Example: login
const res = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'egg@eggland.com', password: 'eggadmin123' })
});
const { token, user } = await res.json();
localStorage.setItem('token', token);

// Example: post a comment (with auth)
const token = localStorage.getItem('token');
await fetch('http://localhost:3001/api/comments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ post_id: 1, content: 'Amazing egg!' })
});
```

---

## 🚀 Deploying to Vercel / Railway / Render

For production, deploy to **Railway** or **Render** (both free tiers available):

1. Push the `eggland-backend` folder to a GitHub repo
2. Go to [railway.app](https://railway.app) or [render.com](https://render.com)
3. Create a new project → connect your GitHub repo
4. Add your environment variables in the dashboard
5. Deploy!

Then update your frontend's fetch URLs from `localhost:3001` to your live backend URL.

---

## 📁 Project Structure

```
eggland-backend/
├── server.js          # Entry point
├── db.js              # Database setup & seeding
├── package.json
├── .env               # Your secrets (never commit this!)
├── .env.example       # Template
├── middleware/
│   └── auth.js        # JWT middleware
└── routes/
    ├── auth.js        # Register, login, profile
    ├── posts.js       # Blog posts + reactions
    ├── comments.js    # Comments
    └── admin.js       # Admin panel
```
