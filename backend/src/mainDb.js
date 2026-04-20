/**
 * Platform (Main) Database
 * Super admin, do'konlar, foydalanuvchilar (direktor/kassirlar)
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const storesDir = path.join(dataDir, 'stores');
if (!fs.existsSync(storesDir)) fs.mkdirSync(storesDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'platform.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS stores (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_name    TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL,
    store_name    TEXT NOT NULL,
    status        TEXT DEFAULT 'pending',
    notes         TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    approved_at   TEXT,
    rejected_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id      INTEGER NOT NULL REFERENCES stores(id),
    name          TEXT NOT NULL,
    login         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT DEFAULT 'cashier',
    allowed_pages TEXT DEFAULT '[]',
    is_active     INTEGER DEFAULT 1,
    photo_data    TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
  CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
  CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
`);

// Migratsiya: agar users jadvalida allowed_pages yo'q bo'lsa
try {
  db.prepare("SELECT allowed_pages FROM users LIMIT 0").all();
} catch {
  try { db.exec("ALTER TABLE users ADD COLUMN allowed_pages TEXT DEFAULT '[]'"); } catch {}
}
try {
  db.prepare("SELECT photo_data FROM users LIMIT 0").all();
} catch {
  try { db.exec("ALTER TABLE users ADD COLUMN photo_data TEXT"); } catch {}
}

// Default super admin (login: admin, parol: admin123)
const adminExists = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash, name) VALUES (?, ?, ?)').run('admin', hash, 'Super Admin');
}

module.exports = db;
