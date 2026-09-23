// Minimal auth + score API for the Treasure Hunt game, backed by Node's built-in SQLite (node:sqlite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(import.meta.dirname, '..', 'data', 'game.db');
const SESSION_DAYS = 7;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Hash a password with scrypt and a random salt; returns "salt:hash" (hex)
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// Check a password against a stored "salt:hash" string in constant time; returns boolean
function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// Create a session row for the user; returns the random bearer token
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`)
    .run(token, userId, `+${SESSION_DAYS} days`);
  return token;
}

// Resolve the Authorization: Bearer header to a user row, or null if missing/expired
function userFromRequest(req) {
  const match = /^Bearer (\w+)$/.exec(req.headers.authorization || '');
  if (!match) return null;
  return db.prepare(`
    SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(match[1]) || null;
}

// Return the user's best score, games played, and 5 most recent scores
function scoreSummary(userId) {
  const stats = db.prepare(`SELECT MAX(score) AS best, COUNT(*) AS games FROM scores WHERE user_id = ?`).get(userId);
  const recent = db.prepare(`SELECT score, played_at FROM scores WHERE user_id = ? ORDER BY id DESC LIMIT 5`).all(userId);
  return { best: stats.best, games: stats.games, recent };
}

// Read and parse a JSON request body (max 10 KB); resolves to an object
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10_000) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

// Write a JSON response with the given status code
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Validate sign-up/sign-in input; returns an error message or null
function validateCredentials({ username, password }) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 letters, numbers or underscores';
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return 'Password must be 6-100 characters';
  }
  return null;
}

const routes = {
  'POST /api/signup': async (req, res) => {
    const body = await readJson(req);
    const error = validateCredentials(body);
    if (error) return send(res, 400, { error });
    try {
      const { lastInsertRowid } = db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`)
        .run(body.username, hashPassword(body.password));
      const userId = Number(lastInsertRowid);
      send(res, 201, { token: createSession(userId), user: { id: userId, username: body.username } });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return send(res, 409, { error: 'Username is already taken' });
      throw e;
    }
  },

  'POST /api/signin': async (req, res) => {
    const body = await readJson(req);
    const user = typeof body.username === 'string'
      ? db.prepare(`SELECT id, username, password_hash FROM users WHERE username = ?`).get(body.username)
      : null;
    if (!user || typeof body.password !== 'string' || !verifyPassword(body.password, user.password_hash)) {
      return send(res, 401, { error: 'Invalid username or password' });
    }
    send(res, 200, { token: createSession(user.id), user: { id: user.id, username: user.username } });
  },

  'POST /api/signout': async (req, res) => {
    const match = /^Bearer (\w+)$/.exec(req.headers.authorization || '');
    if (match) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(match[1]);
    send(res, 200, { ok: true });
  },

  'GET /api/me': async (req, res) => {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { error: 'Not signed in' });
    send(res, 200, { user, scores: scoreSummary(user.id) });
  },

  'POST /api/scores': async (req, res) => {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { error: 'Not signed in' });
    const { score } = await readJson(req);
    if (!Number.isInteger(score) || score < -150 || score > 100) return send(res, 400, { error: 'Invalid score' });
    db.prepare(`INSERT INTO scores (user_id, score) VALUES (?, ?)`).run(user.id, score);
    send(res, 201, { scores: scoreSummary(user.id) });
  },
};

http.createServer(async (req, res) => {
  const handler = routes[`${req.method} ${req.url.split('?')[0]}`];
  if (!handler) return send(res, 404, { error: 'Not found' });
  try {
    await handler(req, res);
  } catch (e) {
    const clientError = ['Invalid JSON', 'Body too large'].includes(e.message);
    if (!clientError) console.error(e);
    send(res, clientError ? 400 : 500, { error: clientError ? e.message : 'Server error' });
  }
}).on('error', e => {
  // Another instance (e.g. `npm run server` plus `npm run dev`) already serves the API: nothing to do
  if (e.code === 'EADDRINUSE') {
    console.log(`API server: port ${PORT} already in use, assuming it is already running`);
    process.exit(0);
  }
  throw e;
}).listen(PORT, () => {
  console.log(`API server on http://localhost:${PORT} (db: ${DB_PATH})`);
});
