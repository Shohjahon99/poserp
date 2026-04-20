/**
 * Auth Routes — foydalanuvchi login va do'kon arizasi
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const mainDb = require('../mainDb');
const { JWT_SECRET } = require('../middleware/tenant');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring." });
  },
});

// POST /api/auth/register — yangi do'kon arizasi
router.post('/register', (req, res) => {
  const { owner_name, phone, address, store_name } = req.body;

  if (!owner_name || !phone || !address || !store_name) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }

  const existing = mainDb.prepare('SELECT id FROM stores WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan" });
  }

  try {
    mainDb.prepare(
      'INSERT INTO stores (owner_name, phone, address, store_name) VALUES (?, ?, ?, ?)'
    ).run(owner_name, phone, address, store_name);

    res.status(201).json({
      success: true,
      message: "Arizangiz qabul qilindi! Ko'rib chiqilgandan so'ng telefon raqamingizga login va parol yuboriladi."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — foydalanuvchi login (direktor yoki kassir)
router.post('/login', loginLimiter, (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: "Login va parol majburiy" });

  const user = mainDb.prepare(
    "SELECT u.*, s.store_name, s.status as store_status FROM users u JOIN stores s ON u.store_id = s.id WHERE u.login = ?"
  ).get(login);

  if (!user) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

  if (user.store_status !== 'approved') {
    return res.status(403).json({ error: "Do'kon faol emas yoki bloklangan" });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: "Hisobingiz bloklangan. Direktorga murojaat qiling" });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  let allowedPages = [];
  try { allowedPages = JSON.parse(user.allowed_pages || '[]'); } catch {}

  const token = jwt.sign(
    {
      user_id: user.id,
      store_id: user.store_id,
      store_name: user.store_name,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      photo_data: user.photo_data,
      allowed_pages: allowedPages,
      store_id: user.store_id,
      store_name: user.store_name,
    }
  });
});

// GET /api/auth/me — joriy foydalanuvchi ma'lumotlari
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token yo\'q' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = mainDb.prepare(
      "SELECT u.id, u.name, u.login, u.role, u.photo_data, u.allowed_pages, u.store_id, s.store_name, s.status as store_status FROM users u JOIN stores s ON u.store_id = s.id WHERE u.id = ?"
    ).get(decoded.user_id);

    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    let allowedPages = [];
    try { allowedPages = JSON.parse(user.allowed_pages || '[]'); } catch {}

    res.json({ ...user, allowed_pages: allowedPages });
  } catch {
    res.status(401).json({ error: 'Token noto\'g\'ri' });
  }
});

module.exports = router;
