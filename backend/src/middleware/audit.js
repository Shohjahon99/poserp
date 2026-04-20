function ensureTable(db) {
  try {
    db.exec(`
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
    `)
  } catch {}
}

function logAction(db, { userId, userName, action, entity, entityId, details }) {
  try {
    ensureTable(db)
    db.prepare(
      'INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId || null, userName || null, action, entity || null, entityId || null, details ? JSON.stringify(details) : null)
  } catch {}
}

module.exports = { logAction }
