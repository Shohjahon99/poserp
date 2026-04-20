const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'pos.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS cashiers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    pin             TEXT NOT NULL,
    face_descriptor TEXT,
    photo_data      TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode             TEXT UNIQUE,
    name                TEXT NOT NULL,
    category_id         INTEGER REFERENCES categories(id),
    price               REAL NOT NULL DEFAULT 0,
    cost                REAL DEFAULT 0,
    stock               INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    unit                TEXT DEFAULT 'dona',
    image_data          TEXT,
    is_quick_add        INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now','localtime')),
    updated_at          TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number  TEXT UNIQUE NOT NULL,
    total           REAL NOT NULL,
    discount        REAL DEFAULT 0,
    payment_method  TEXT DEFAULT 'cash',
    amount_tendered REAL DEFAULT 0,
    change_given    REAL DEFAULT 0,
    cashier_id      INTEGER REFERENCES cashiers(id),
    cashier_name    TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id      INTEGER NOT NULL REFERENCES sales(id),
    product_id   INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity     REAL NOT NULL,
    unit_price   REAL NOT NULL,
    subtotal     REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    change     REAL NOT NULL,
    reason     TEXT DEFAULT 'manual',
    note       TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  INSERT OR IGNORE INTO categories(name) VALUES
    ('Oziq-ovqat'), ('Ichimliklar'), ('Non mahsulotlari'),
    ('Sut mahsulotlari'), ('Meva-sabzavot'), ('Tozalik'), ('Boshqa');
`);

// Migrate existing DB: add new columns if not present
const migrations = [
  `ALTER TABLE products ADD COLUMN image_data TEXT`,
  `ALTER TABLE products ADD COLUMN is_quick_add INTEGER DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1`,
  `ALTER TABLE sales ADD COLUMN cashier_id INTEGER`,
  `ALTER TABLE sales ADD COLUMN cashier_name TEXT`,
  `ALTER TABLE sales ADD COLUMN is_refunded INTEGER DEFAULT 0`,
  `ALTER TABLE sales ADD COLUMN refunded_at TEXT`,
  `ALTER TABLE cashiers ADD COLUMN role TEXT DEFAULT 'cashier'`,
];
for (const sql of migrations) {
  try { db.exec(sql) } catch {}
}

// Agar hech qanday direktor bo'lmasa — birinchi kassirni direktor qilish
const directorExists = db.prepare("SELECT id FROM cashiers WHERE role = 'director' LIMIT 1").get();
if (!directorExists) {
  const first = db.prepare("SELECT id FROM cashiers ORDER BY id ASC LIMIT 1").get();
  if (first) {
    db.prepare("UPDATE cashiers SET role = 'director' WHERE id = ?").run(first.id);
  }
}

module.exports = db;
