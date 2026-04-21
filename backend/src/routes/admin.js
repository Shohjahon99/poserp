/**
 * Super Admin Routes — platform boshqaruvi
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mainDb = require('../mainDb');
const { adminAuth, JWT_SECRET } = require('../middleware/tenant');
const { getStoreDb } = require('../storeDb');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Login va parol majburiy' });

  const admin = mainDb.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ error: "Login noto'g'ri" });

  if (!bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }

  const token = jwt.sign(
    { admin_id: admin.id, role: 'super_admin', name: admin.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, admin: { id: admin.id, name: admin.name, username: admin.username } });
});

// ===== Protected routes (adminAuth) =====

// GET /api/admin/stats
router.get('/stats', adminAuth, (req, res) => {
  const total = mainDb.prepare('SELECT COUNT(*) as cnt FROM stores').get().cnt;
  const pending = mainDb.prepare("SELECT COUNT(*) as cnt FROM stores WHERE status = 'pending'").get().cnt;
  const approved = mainDb.prepare("SELECT COUNT(*) as cnt FROM stores WHERE status = 'approved'").get().cnt;
  const rejected = mainDb.prepare("SELECT COUNT(*) as cnt FROM stores WHERE status = 'rejected'").get().cnt;

  res.json({ total, pending, approved, rejected });
});

// GET /api/admin/applications
router.get('/applications', adminAuth, (req, res) => {
  const apps = mainDb.prepare(
    "SELECT * FROM stores WHERE status = 'pending' ORDER BY created_at DESC"
  ).all();
  res.json(apps);
});

// GET /api/admin/stores
router.get('/stores', adminAuth, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT id, owner_name, phone, address, store_name, status, created_at, approved_at FROM stores';
  const params = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';

  const stores = mainDb.prepare(sql).all(...params);
  res.json(stores);
});

// GET /api/admin/stores/:id
router.get('/stores/:id', adminAuth, (req, res) => {
  const store = mainDb.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: "Do'kon topilmadi" });

  let stats = { products: 0, sales: 0, revenue: 0, users: 0 };
  if (store.status === 'approved') {
    try {
      const db = getStoreDb(store.id);
      stats.products = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE COALESCE(is_active, 1) = 1').get().cnt;
      stats.sales = db.prepare('SELECT COUNT(*) as cnt FROM sales').get().cnt;
      stats.revenue = db.prepare('SELECT COALESCE(SUM(total), 0) as s FROM sales WHERE is_refunded = 0').get().s;
    } catch {}
    stats.users = mainDb.prepare('SELECT COUNT(*) as cnt FROM users WHERE store_id = ?').get(store.id).cnt;
  }

  // Xodimlar ro'yxati
  const users = mainDb.prepare(
    'SELECT id, name, login, role, allowed_pages, is_active, created_at FROM users WHERE store_id = ?'
  ).all(store.id);

  res.json({ ...store, stats, users });
});

// POST /api/admin/stores/:id/approve — arizani tasdiqlash
router.post('/stores/:id/approve', adminAuth, (req, res) => {
  const store = mainDb.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: "Do'kon topilmadi" });
  if (store.status === 'approved') return res.status(400).json({ error: "Do'kon allaqachon tasdiqlangan" });

  // Direktor uchun login/parol yaratish
  const login = 'store' + store.id;
  const plainPassword = crypto.randomBytes(4).toString('hex');
  const passwordHash = bcrypt.hashSync(plainPassword, 10);

  mainDb.prepare(`
    UPDATE stores SET
      status = 'approved',
      approved_at = datetime('now','localtime')
    WHERE id = ?
  `).run(store.id);

  // Direktor foydalanuvchi yaratish
  const existingUser = mainDb.prepare('SELECT id FROM users WHERE store_id = ? AND role = ?').get(store.id, 'director');
  if (!existingUser) {
    mainDb.prepare(
      'INSERT INTO users (store_id, name, login, password_hash, role, allowed_pages) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(store.id, store.owner_name, login, passwordHash, 'director', '[]');
  }

  // Do'kon bazasini yaratish
  getStoreDb(store.id);

  // TODO (production): parolni konsolga chiqarish o'rniga SMS/email orqali yuboring
  res.json({
    success: true,
    store_name: store.store_name,
    login,
    password: plainPassword,
    message: `Do'kon tasdiqlandi! Login: ${login}, Parol: ${plainPassword}`
  });
});

// POST /api/admin/stores/:id/reject
router.post('/stores/:id/reject', adminAuth, (req, res) => {
  const { reason } = req.body;
  const store = mainDb.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: "Do'kon topilmadi" });

  mainDb.prepare(`
    UPDATE stores SET
      status = 'rejected',
      notes = ?,
      rejected_at = datetime('now','localtime')
    WHERE id = ?
  `).run(reason || 'Rad etildi', store.id);

  res.json({ success: true, message: 'Ariza rad etildi' });
});

// POST /api/admin/stores/:id/block
router.post('/stores/:id/block', adminAuth, (req, res) => {
  mainDb.prepare("UPDATE stores SET status = 'blocked' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST /api/admin/stores/:id/unblock
router.post('/stores/:id/unblock', adminAuth, (req, res) => {
  mainDb.prepare("UPDATE stores SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// POST /api/admin/stores — qo'lda do'kon qo'shish (arizasiz)
router.post('/stores', adminAuth, (req, res) => {
  const { owner_name, phone, address, store_name, director_name, director_login, director_password } = req.body;

  if (!owner_name || !store_name || !director_login || !director_password) {
    return res.status(400).json({ error: "Do'kon nomi, egasi, direktor login va parol majburiy" });
  }

  // Login takrorlanmasligi
  const existingUser = mainDb.prepare('SELECT id FROM users WHERE login = ?').get(director_login);
  if (existingUser) {
    return res.status(409).json({ error: "Bu login allaqachon band" });
  }

  try {
    const storeResult = mainDb.prepare(
      "INSERT INTO stores (owner_name, phone, address, store_name, status, approved_at) VALUES (?, ?, ?, ?, 'approved', datetime('now','localtime'))"
    ).run(owner_name, phone || '', address || '', store_name);

    const storeId = storeResult.lastInsertRowid;
    const passwordHash = bcrypt.hashSync(director_password, 10);

    mainDb.prepare(
      'INSERT INTO users (store_id, name, login, password_hash, role, allowed_pages) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(storeId, director_name || owner_name, director_login, passwordHash, 'director', '[]');

    // Do'kon bazasini yaratish
    getStoreDb(Number(storeId));

    res.status(201).json({
      success: true,
      store_id: storeId,
      message: `Do'kon yaratildi! Login: ${director_login}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/profile — super admin o'z login/parolini o'zgartirish
router.put('/profile', adminAuth, (req, res) => {
  const { name, username, current_password, new_password } = req.body;
  const admin = mainDb.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminId);
  if (!admin) return res.status(404).json({ error: 'Admin topilmadi' });

  if (current_password) {
    if (!bcrypt.compareSync(current_password, admin.password_hash)) {
      return res.status(400).json({ error: "Joriy parol noto'g'ri" });
    }
  }

  if (username && username !== admin.username) {
    const dup = mainDb.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(username, admin.id);
    if (dup) return res.status(409).json({ error: 'Bu login allaqachon band' });
  }

  let sql = 'UPDATE admin_users SET name=?, username=?';
  const params = [name ?? admin.name, username ?? admin.username];

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Yangi parol uchun joriy parol kerak' });
    sql += ', password_hash=?';
    params.push(bcrypt.hashSync(new_password, 10));
  }

  sql += ' WHERE id=?';
  params.push(admin.id);
  mainDb.prepare(sql).run(...params);

  const updated = mainDb.prepare('SELECT id, name, username FROM admin_users WHERE id = ?').get(admin.id);
  res.json({ success: true, admin: updated });
});

// PUT /api/admin/users/:id — xodim parolini/ma'lumotlarini o'zgartirish
router.put('/users/:id', adminAuth, (req, res) => {
  const { name, login, password, role, is_active } = req.body;
  const user = mainDb.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: "Xodim topilmadi" });

  if (login && login !== user.login) {
    const dup = mainDb.prepare('SELECT id FROM users WHERE login = ? AND id != ?').get(login, req.params.id);
    if (dup) return res.status(409).json({ error: "Bu login allaqachon band" });
  }

  let sql = 'UPDATE users SET name=?, login=?, role=?, is_active=?';
  const params = [name ?? user.name, login ?? user.login, role ?? user.role, is_active !== undefined ? is_active : user.is_active];

  if (password) {
    sql += ', password_hash=?';
    params.push(bcrypt.hashSync(password, 10));
  }

  sql += ' WHERE id=?';
  params.push(req.params.id);

  mainDb.prepare(sql).run(...params);

  const updated = mainDb.prepare('SELECT id, name, login, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/admin/stores/:id/users — do'konga yangi xodim qo'shish (admin tomonidan)
router.post('/stores/:id/users', adminAuth, (req, res) => {
  const { name, login, password, role } = req.body;
  if (!name || !login || !password) return res.status(400).json({ error: "Ism, login va parol majburiy" });

  const store = mainDb.prepare('SELECT id FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: "Do'kon topilmadi" });

  const existing = mainDb.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) return res.status(409).json({ error: "Bu login allaqachon band" });

  const passwordHash = bcrypt.hashSync(password, 10);
  mainDb.prepare(
    'INSERT INTO users (store_id, name, login, password_hash, role, allowed_pages) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, name, login, passwordHash, role || 'cashier', '[]');

  res.status(201).json({ success: true });
});

module.exports = router;
