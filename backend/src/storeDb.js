/**
 * Store Database Factory
 * Har bir do'kon uchun alohida SQLite baza
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const storesDir = path.join(__dirname, '..', 'data', 'stores');

// Cache — ochiq bazalar
const dbCache = new Map();

function initStoreDb(db) {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

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
      role            TEXT DEFAULT 'cashier',
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
      is_active           INTEGER DEFAULT 1,
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
      cashier_id      INTEGER,
      cashier_name    TEXT,
      is_refunded     INTEGER DEFAULT 0,
      refunded_at     TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id      INTEGER NOT NULL REFERENCES sales(id),
      product_id   INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity     REAL NOT NULL,
      unit_price   REAL NOT NULL,
      cost         REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS store_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO categories(name) VALUES
      ('Oziq-ovqat'), ('Ichimliklar'), ('Non mahsulotlari'),
      ('Sut mahsulotlari'), ('Meva-sabzavot'), ('Tozalik'), ('Boshqa');

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);

  // Migration: add cost column to sale_items if not exists
  try { db.exec('ALTER TABLE sale_items ADD COLUMN cost REAL DEFAULT 0') } catch {}

  return db;
}

/**
 * Do'kon bazasini olish yoki yaratish
 * @param {number} storeId
 * @returns {DatabaseSync}
 */
function getStoreDb(storeId) {
  if (dbCache.has(storeId)) return dbCache.get(storeId);

  const dir = path.join(storesDir, `store_${storeId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const dbPath = path.join(dir, 'pos.db');
  const db = new DatabaseSync(dbPath);
  initStoreDb(db);

  dbCache.set(storeId, db);
  return db;
}

module.exports = { getStoreDb };
