const express = require('express')
const router = express.Router()

// Jadval yo'q bo'lsa — avtomatik yaratish (eski DB lar uchun migration)
function ensureTable(db) {
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
}

// GET /api/audit?limit=50&offset=0&user=&action=
router.get('/', (req, res) => {
  try {
    ensureTable(req.db)

    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const offset = parseInt(req.query.offset) || 0

    let whereParts = []
    let params = []
    if (req.query.user)   { whereParts.push("user_name LIKE ?"); params.push(`%${req.query.user}%`) }
    if (req.query.action) { whereParts.push("action = ?");       params.push(req.query.action) }

    const whereStr = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : ''

    const rows = req.db.prepare(
      `SELECT * FROM audit_log ${whereStr} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset)

    const total = req.db.prepare(
      `SELECT COUNT(*) as cnt FROM audit_log ${whereStr}`
    ).get(...params)

    res.json({ logs: rows, total: total ? total.cnt : 0 })
  } catch (err) {
    console.error('Audit log xatosi:', err.message)
    res.status(500).json({ error: 'Audit log yuklanmadi: ' + err.message })
  }
})

module.exports = router
