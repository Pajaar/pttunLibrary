# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the session-based admin login system this backend currently stubs out (`AuthController.login` returns `501`) — a real `pengguna` table, password hashing, login/logout/session-check endpoints, and a `requireAuth` middleware that later plans (admin routes, frontend) will depend on.

**Architecture:** `express-session` (httpOnly cookie, server-side session, no JWT) backed by the default in-memory store — acceptable for this single-instance internal tool; sessions are simply lost on server restart, which is fine for a small staff team re-logging in occasionally. `bcryptjs` (pure JS, no native compilation) hashes passwords. `PenggunaModel.js` gets real DB-backed functions replacing its current `{ tableName: 'pengguna' }` stub. A `requireAuth` middleware checks `req.session.userId` and is applied per-route by later plans; this plan proves it works via `GET /api/auth/me`.

**Tech Stack:** Node.js/Express, `express-session`, `bcryptjs`, mysql2 (existing `db.promise()` pool from `backend/config/database.js`).

## Global Constraints

- Field names and all user-facing messages in Indonesian (CLAUDE.md convention).
- SQL must use parameterized queries (`?`) — never string interpolation.
- 500 responses: `console.error('<Indonesian description>:', error)` server-side, then `res.status(500).json({ message: '<Indonesian message>' })` — **no `error` key in the client response** (this is the current codebase pattern after the error-leak fix; do not reintroduce `error: error.message`).
- 400/404/401 responses: `res.status(xxx).json({ message })` only.
- Login failure (wrong username OR wrong password) always returns the same generic `401` message — never reveal which of the two was wrong (avoids username enumeration).
- Use `bcryptjs`, not `bcrypt` — avoids a native/node-gyp build dependency on this Windows dev machine (same reasoning as deferring `canvas`'s prebuilt binary in the cover-scanner migration).
- No self-registration endpoint anywhere. The only way to create an account is `backend/scripts/seedAdmin.js`, run manually.
- **Any step that writes to, or connects to, the real database requires the user's explicit go-ahead first.** This includes creating the `pengguna` table, running the seed script, and starting the backend dev server for verification. Do not skip this and do not batch it with unrelated confirmations — ask right before the specific action. (Standing instruction from this session, after a prior incident where a smoke test wrote data to the live DB without asking.)
- Do not modify `backend/config/database.js`.
- Do not touch `/frontend` — wiring the login form and route guard is a later plan.
- Do not add a "Co-Authored-By" trailer of any kind to any commit in this plan — hard requirement for this repo.

---

### Task 1: `pengguna` table + auth dependencies

**Files:**
- Modify: `backend/package.json` — add `express-session`, `bcryptjs` (via `npm install`, not hand-edited).
- Modify: `backend/middleware/schema.sql` — currently empty; add the `pengguna` table definition as canonical schema documentation (this file is documentation only, not auto-applied).
- Create: `backend/scripts/migrate_pengguna.js` — one-off script that actually creates the table (`CREATE TABLE IF NOT EXISTS`, safe to re-run).

**Interfaces:**
- Produces: a `pengguna` table with columns `id_pengguna` (int, PK, auto_increment), `username` (varchar(50), unique), `password_hash` (varchar(255)), `created_at` (timestamp, default now).
- Consumes: nothing from earlier tasks (first task).

- [ ] **Step 1: Install dependencies**

```bash
cd backend && npm install express-session bcryptjs
```

This updates `backend/package.json` and `backend/package-lock.json` automatically — no manual edit needed.

- [ ] **Step 2: Add the table definition to `backend/middleware/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS pengguna (
  id_pengguna INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 3: Create `backend/scripts/migrate_pengguna.js`**

```js
const db = require('../config/database')

const SQL = `
  CREATE TABLE IF NOT EXISTS pengguna (
    id_pengguna INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`

db.promise()
  .query(SQL)
  .then(() => {
    console.log('Tabel pengguna siap (dibuat jika belum ada)')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Gagal membuat tabel pengguna:', err)
    process.exit(1)
  })
```

- [ ] **Step 4: STOP — ask the user before running this**

This script connects to the real database and creates a table in it. Ask the
user explicitly: "This will create the `pengguna` table in the real
database — OK to run `node scripts/migrate_pengguna.js` now?" Do not proceed
past this point without an explicit yes.

- [ ] **Step 5: Run the migration (only after the user said yes)**

```bash
cd backend && node scripts/migrate_pengguna.js
```

Expected output: `Tabel pengguna siap (dibuat jika belum ada)`.

- [ ] **Step 6: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add backend/package.json backend/package-lock.json backend/middleware/schema.sql backend/scripts/migrate_pengguna.js
git commit -m "$(cat <<'EOF'
Add pengguna table schema and auth dependencies

express-session and bcryptjs for the upcoming session-based admin login.
migrate_pengguna.js creates the table (idempotent, safe to re-run) since
this repo has no migration framework yet.
EOF
)"
```

---

### Task 2: `PenggunaModel` + admin account seed script

**Files:**
- Modify: `backend/models/PenggunaModel.js` — replace the `{ tableName: 'pengguna' }` stub.
- Create: `backend/scripts/seedAdmin.js`.

**Interfaces:**
- Produces: `PenggunaModel.findByUsername(username: string) => Promise<{ id_pengguna, username, password_hash, created_at } | undefined>`
- Produces: `PenggunaModel.findById(id_pengguna: number) => Promise<{ id_pengguna, username, password_hash, created_at } | undefined>`
- Produces: `PenggunaModel.createPengguna({ username: string, password_hash: string }) => Promise<number>` (returns the new `id_pengguna`)
- Consumes: the `pengguna` table from Task 1.

- [ ] **Step 1: Replace `backend/models/PenggunaModel.js`**

```js
const db = require('../config/database')

exports.findByUsername = async (username) => {
  const [rows] = await db.promise().query(
    'SELECT * FROM pengguna WHERE username = ?',
    [username],
  )
  return rows[0]
}

exports.findById = async (id_pengguna) => {
  const [rows] = await db.promise().query(
    'SELECT * FROM pengguna WHERE id_pengguna = ?',
    [id_pengguna],
  )
  return rows[0]
}

exports.createPengguna = async ({ username, password_hash }) => {
  const [result] = await db.promise().query(
    'INSERT INTO pengguna (username, password_hash) VALUES (?, ?)',
    [username, password_hash],
  )
  return result.insertId
}
```

- [ ] **Step 2: Create `backend/scripts/seedAdmin.js`**

```js
const bcrypt = require('bcryptjs')
const PenggunaModel = require('../models/PenggunaModel')

async function main() {
  const [, , username, password] = process.argv

  if (!username || !password) {
    console.error('Pemakaian: node scripts/seedAdmin.js <username> <password>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password minimal 8 karakter')
    process.exit(1)
  }

  const existing = await PenggunaModel.findByUsername(username)
  if (existing) {
    console.error(`Username "${username}" sudah terdaftar`)
    process.exit(1)
  }

  const password_hash = await bcrypt.hash(password, 10)
  const id = await PenggunaModel.createPengguna({ username, password_hash })
  console.log(`Akun admin "${username}" berhasil dibuat (id_pengguna=${id})`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal membuat akun admin:', err)
  process.exit(1)
})
```

- [ ] **Step 3: STOP — this creates a real login credential, hand it to the user**

Do not choose a username/password yourself and do not run this script
yourself. Ask the user to open their own terminal in `backend/` and run:

```bash
node scripts/seedAdmin.js <username> <password>
```

with a username/password of their choosing (min 8 characters). This keeps
the plaintext password out of any agent-visible chat log or transcript.
Wait for the user to confirm it succeeded before moving to Task 3's
verification steps, which need a real seeded account to log in with.

- [ ] **Step 4: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add backend/models/PenggunaModel.js backend/scripts/seedAdmin.js
git commit -m "$(cat <<'EOF'
Implement PenggunaModel and add one-off admin account seed script

No self-registration endpoint exists or will exist — seedAdmin.js is the
only way to create a login, run manually by whoever operates the server.
EOF
)"
```

---

### Task 3: Session middleware, `requireAuth`, and login/logout/me endpoints

**Files:**
- Modify: `backend/index.js` — wire up `express-session` and update `cors()` to allow credentials.
- Create: `backend/middleware/requireAuth.js`.
- Modify: `backend/controllers/AuthController.js` — replace the `501` stub with `login`, `logout`, `me`.
- Modify: `backend/routes/authRoutes.js` — add `POST /logout`, `GET /me`.

**Interfaces:**
- Consumes: `PenggunaModel.findByUsername`, `PenggunaModel.findById` (Task 2).
- Produces: `requireAuth` middleware — importable as `require('../middleware/requireAuth')`, used by later plans to gate `/api/admin/*` routers. Responds `401 { message }` if `req.session.userId` is missing; otherwise calls `next()`.
- Produces: `POST /api/auth/login` — body `{ username, password }`, sets `req.session.userId` on success.
- Produces: `POST /api/auth/logout` — destroys the session.
- Produces: `GET /api/auth/me` — `requireAuth`-gated, returns `{ username }` for the current session.

- [ ] **Step 1: Add `SESSION_SECRET` to `backend/.env`**

Ask the user to add a line to their existing `backend/.env` (do not read or
print the file's current contents — just tell them the line to add).
Generate a random value for them to use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Tell the user to add `SESSION_SECRET=<the output above>` to `backend/.env`.

- [ ] **Step 2: Create `backend/middleware/requireAuth.js`**

```js
module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Anda harus login untuk mengakses ini' })
  }
  next()
}
```

- [ ] **Step 3: Replace `backend/controllers/AuthController.js`**

```js
const bcrypt = require('bcryptjs')
const PenggunaModel = require('../models/PenggunaModel')

exports.login = async (req, res) => {
  const { username, password } = req.body

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ message: 'Username wajib diisi' })
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Password wajib diisi' })
  }

  try {
    const pengguna = await PenggunaModel.findByUsername(username.trim())
    if (!pengguna) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    const cocok = await bcrypt.compare(password, pengguna.password_hash)
    if (!cocok) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    req.session.userId = pengguna.id_pengguna

    res.json({
      message: 'Login berhasil',
      data: { username: pengguna.username },
    })
  } catch (error) {
    console.error('Gagal memproses login:', error)
    res.status(500).json({ message: 'Gagal memproses login' })
  }
}

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal logout:', err)
      return res.status(500).json({ message: 'Gagal logout' })
    }
    res.clearCookie('connect.sid')
    res.json({ message: 'Logout berhasil' })
  })
}

exports.me = async (req, res) => {
  try {
    const pengguna = await PenggunaModel.findById(req.session.userId)
    if (!pengguna) {
      return res.status(401).json({ message: 'Sesi tidak valid' })
    }
    res.json({
      message: 'Sesi aktif',
      data: { username: pengguna.username },
    })
  } catch (error) {
    console.error('Gagal mengambil data sesi:', error)
    res.status(500).json({ message: 'Gagal mengambil data sesi' })
  }
}
```

- [ ] **Step 4: Replace `backend/routes/authRoutes.js`**

```js
const express = require('express');
const authController = require('../controllers/AuthController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
```

- [ ] **Step 5: Modify `backend/index.js`** — add session middleware and credentialed CORS

Replace the full file with:

```js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('./config/database');

const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET belum diisi di backend/.env');
  process.exit(1);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 jam
  },
}));

app.get('/', (req, res) => {
  res.json({
    message: 'API Perpustakaan PTTUN berjalan',
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Rute tidak ditemukan',
  });
});

app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});
```

- [ ] **Step 6: STOP — ask the user before starting the backend for verification**

The steps below start the backend dev server against the real database and
will create a real session by logging in with the real account seeded in
Task 2. Ask the user explicitly: "OK to start the backend dev server now to
verify login/logout/me end-to-end?" Do not proceed without a yes.

- [ ] **Step 7: Start the backend dev server (only after the user said yes)**

Use the preview tool (`preview_start` with `{"name": "backend"}` — the
`.claude/launch.json` entry for this already exists). Confirm the startup
log: `Server backend berjalan di http://localhost:5000`. If it fails with a
DB connection error, STOP and report BLOCKED — do not modify
`backend/config/database.js`. If it fails with the `SESSION_SECRET` error
from Step 5, confirm the user actually added the line from Step 1.

- [ ] **Step 8: Login rejects a made-up username/password with 401**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "definitely-not-a-real-user", "password": "wrongpassword"}'
```

Expected: `401`.

- [ ] **Step 9: Login validation — missing fields rejected with 400**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d '{"password": "irrelevant"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d '{"username": "irrelevant"}'
```

Expected: `400`, `400`.

- [ ] **Step 10: `GET /api/auth/me` without a session returns 401**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5000/api/auth/me"
```

Expected: `401`.

- [ ] **Step 11: Real login succeeds and sets a session cookie**

Ask the user for the username/password they seeded in Task 2 (or ask them
to run this step themselves if they'd rather not share the password with
you). Using a cookie jar so the session persists across the next calls:

```bash
curl -s -c /tmp/pttun-session.txt -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "THE_SEEDED_USERNAME", "password": "THE_SEEDED_PASSWORD"}'
```

Expected: `200`, `{ "message": "Login berhasil", "data": { "username": "THE_SEEDED_USERNAME" } }`.

- [ ] **Step 12: `GET /api/auth/me` with the session cookie returns the user**

```bash
curl -s -b /tmp/pttun-session.txt "http://localhost:5000/api/auth/me"
```

Expected: `200`, `{ "message": "Sesi aktif", "data": { "username": "THE_SEEDED_USERNAME" } }`.

- [ ] **Step 13: Logout destroys the session**

```bash
curl -s -b /tmp/pttun-session.txt -c /tmp/pttun-session.txt -X POST "http://localhost:5000/api/auth/logout"
curl -s -b /tmp/pttun-session.txt "http://localhost:5000/api/auth/me"
```

Expected: first call `200 { "message": "Logout berhasil" }`; second call
`401` (session no longer valid).

- [ ] **Step 14: Clean up the cookie jar file**

```bash
rm /tmp/pttun-session.txt
```

- [ ] **Step 15: Self-review**

Confirm: no plaintext password was echoed into any command you ran
yourself (Step 11 should have come from the user, not invented by you); no
`error: error.message` leaking anywhere in `AuthController.js`; SQL in
`PenggunaModel.js` uses `?` placeholders only; `backend/config/database.js`
untouched; no `/frontend` files touched; `requireAuth.js` exports a plain
function usable as Express middleware.

- [ ] **Step 16: Commit**

**Before running any git command:** run `pwd` and `git branch --show-current`. Confirm you are inside the correct working directory and branch. If either doesn't match what you were told, STOP and report back — do not commit.

```bash
git add backend/index.js backend/middleware/requireAuth.js backend/controllers/AuthController.js backend/routes/authRoutes.js
git commit -m "$(cat <<'EOF'
Implement session-based login, logout, and session-check endpoints

express-session with an httpOnly cookie backs admin auth. requireAuth
middleware (backend/middleware/requireAuth.js) is what later admin routes
will gate behind. CORS now allows credentials from the configured frontend
origin so the session cookie round-trips correctly.
EOF
)"
```

## Out of scope (deferred to later plans)

- `/api/admin/*` routes and applying `requireAuth` to them — next plan.
- Frontend login form, auth store, and router guard — later plan.
- Multi-role/permission granularity — not decided for this version.
- Password reset — no flow exists or is planned yet.
