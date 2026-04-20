/**
 * Staff (Xodimlar) Routes — direktor xodimlarni boshqaradi
 * Platform DB'dagi users jadvalidan foydalanadi
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const mainDb = require('../mainDb');
const { logAction } = require('../middleware/audit');

const router = express.Router();

// Faqat direktorga ruxsat
function directorOnly(req, res, next) {
  if (req.userRole !== 'director') {
    return res.status(403).json({ error: "Faqat direktor bu amalni bajara oladi" });
  }
  next();
}

// GET /api/staff — do'konning barcha xodimlari
router.get('/', (req, res) => {
  const users = mainDb.prepare(
    'SELECT id, name, login, role, allowed_pages, is_active, photo_data, created_at FROM users WHERE store_id = ? ORDER BY role DESC, name'
  ).all(req.storeId);

  const result = users.map(u => {
    let allowed_pages = [];
    try { allowed_pages = JSON.parse(u.allowed_pages || '[]'); } catch {}
    return { ...u, allowed_pages };
  });

  res.json(result);
});

// POST /api/staff — yangi xodim (faqat direktor)
router.post('/', directorOnly, (req, res) => {
  const { name, login, password, role, allowed_pages, photo_data } = req.body;

  if (!name || !login || !password) {
    return res.status(400).json({ error: "Ism, login va parol majburiy" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Parol kamida 4 ta belgi" });
  }

  // Login takrorlanmasligi
  const existing = mainDb.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) {
    return res.status(409).json({ error: "Bu login allaqachon band" });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const assignRole = role || 'cashier';
    const pages = JSON.stringify(allowed_pages || []);

    const result = mainDb.prepare(
      'INSERT INTO users (store_id, name, login, password_hash, role, allowed_pages, photo_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.storeId, name, login, passwordHash, assignRole, pages, photo_data || null);

    const user = mainDb.prepare(
      'SELECT id, name, login, role, allowed_pages, is_active, photo_data, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    let parsedPages = [];
    try { parsedPages = JSON.parse(user.allowed_pages || '[]'); } catch {}

    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'staff_created', entity: 'user', entityId: result.lastInsertRowid, details: { name, role: assignRole } });
    res.status(201).json({ ...user, allowed_pages: parsedPages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/:id — xodimni tahrirlash (faqat direktor)
router.put('/:id', directorOnly, (req, res) => {
  const { name, login, password, role, allowed_pages, is_active, photo_data } = req.body;

  const existing = mainDb.prepare('SELECT * FROM users WHERE id = ? AND store_id = ?').get(req.params.id, req.storeId);
  if (!existing) return res.status(404).json({ error: "Xodim topilmadi" });

  // O'zini o'zi direktor rolidan tushirmasin
  if (existing.id === req.userId && role && role !== 'director') {
    return res.status(400).json({ error: "O'zingizni direktor rolidan tushira olmaysiz" });
  }

  // Login uniqueness
  if (login && login !== existing.login) {
    const dup = mainDb.prepare('SELECT id FROM users WHERE login = ? AND id != ?').get(login, req.params.id);
    if (dup) return res.status(409).json({ error: "Bu login allaqachon band" });
  }

  const newName = name ?? existing.name;
  const newLogin = login ?? existing.login;
  const newRole = role ?? existing.role;
  const newActive = is_active !== undefined ? is_active : existing.is_active;
  const newPages = allowed_pages !== undefined ? JSON.stringify(allowed_pages) : existing.allowed_pages;
  const newPhoto = photo_data !== undefined ? photo_data : existing.photo_data;

  let sql = 'UPDATE users SET name=?, login=?, role=?, allowed_pages=?, is_active=?, photo_data=?';
  const params = [newName, newLogin, newRole, newPages, newActive, newPhoto];

  if (password) {
    sql += ', password_hash=?';
    params.push(bcrypt.hashSync(password, 10));
  }

  sql += ' WHERE id=? AND store_id=?';
  params.push(req.params.id, req.storeId);

  mainDb.prepare(sql).run(...params);

  const updated = mainDb.prepare(
    'SELECT id, name, login, role, allowed_pages, is_active, photo_data, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  let parsedPages = [];
  try { parsedPages = JSON.parse(updated.allowed_pages || '[]'); } catch {}

  res.json({ ...updated, allowed_pages: parsedPages });
});

// DELETE /api/staff/:id — xodimni o'chirish (faqat direktor)
router.delete('/:id', directorOnly, (req, res) => {
  const user = mainDb.prepare('SELECT * FROM users WHERE id = ? AND store_id = ?').get(req.params.id, req.storeId);
  if (!user) return res.status(404).json({ error: "Xodim topilmadi" });

  // O'zini o'zi o'chirmasin
  if (user.id === req.userId) {
    return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
  }

  // Oxirgi direktorni o'chirmasin
  if (user.role === 'director') {
    const dirCount = mainDb.prepare("SELECT COUNT(*) as cnt FROM users WHERE store_id = ? AND role = 'director'").get(req.storeId).cnt;
    if (dirCount <= 1) {
      return res.status(400).json({ error: "Oxirgi direktorni o'chirib bo'lmaydi" });
    }
  }

  mainDb.prepare('DELETE FROM users WHERE id = ? AND store_id = ?').run(req.params.id, req.storeId);
  logAction(req.db, { userId: req.userId, userName: req.userName, action: 'staff_deleted', entity: 'user', entityId: parseInt(req.params.id), details: { name: user.name } });
  res.json({ success: true });
});

module.exports = router;
