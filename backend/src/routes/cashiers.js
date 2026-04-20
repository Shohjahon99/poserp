const express = require('express');
const router = express.Router();

function directorOnly(req, res, next) {
  if (req.userRole !== 'director') return res.status(403).json({ error: 'Faqat direktor uchun' })
  next()
}

// GET /api/cashiers
router.get('/', (req, res) => {
  const cashiers = req.db.prepare(
    `SELECT id, name, pin, role, is_active, photo_data, created_at,
     CASE WHEN face_descriptor IS NOT NULL THEN 1 ELSE 0 END as has_face
     FROM cashiers ORDER BY role DESC, name`
  ).all();
  res.json(cashiers);
});

// GET /api/cashiers/:id (with face descriptor for auth)
router.get('/:id', (req, res) => {
  const c = req.db.prepare('SELECT * FROM cashiers WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Kassir topilmadi' });
  res.json(c);
});

// POST /api/cashiers
router.post('/', directorOnly, (req, res) => {
  const { name, pin, photo_data, face_descriptor, role } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'Ism va PIN majburiy' });
  if (pin.length < 4) return res.status(400).json({ error: 'PIN kamida 4 ta raqam' });

  // PIN takrorlanmasligi kerak
  const existing = req.db.prepare('SELECT id FROM cashiers WHERE pin = ?').get(pin);
  if (existing) return res.status(409).json({ error: 'Bu PIN allaqachon ishlatilmoqda' });

  try {
    const assignRole = role || 'cashier';
    const result = req.db.prepare(
      'INSERT INTO cashiers (name, pin, photo_data, face_descriptor, role) VALUES (?, ?, ?, ?, ?)'
    ).run(name, pin, photo_data || null, face_descriptor || null, assignRole);

    res.status(201).json(req.db.prepare(
      'SELECT id, name, pin, role, is_active, photo_data, created_at FROM cashiers WHERE id = ?'
    ).get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cashiers/:id
router.put('/:id', directorOnly, (req, res) => {
  const { name, pin, photo_data, face_descriptor, is_active, role } = req.body;
  const existing = req.db.prepare('SELECT * FROM cashiers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Kassir topilmadi' });

  // PIN uniqueness check
  if (pin && pin !== existing.pin) {
    const dup = req.db.prepare('SELECT id FROM cashiers WHERE pin = ? AND id != ?').get(pin, req.params.id);
    if (dup) return res.status(409).json({ error: 'Bu PIN allaqachon ishlatilmoqda' });
  }

  req.db.prepare(`
    UPDATE cashiers SET
      name=?, pin=?, photo_data=?, face_descriptor=?, is_active=?, role=?
    WHERE id=?
  `).run(
    name ?? existing.name,
    pin ?? existing.pin,
    photo_data !== undefined ? photo_data : existing.photo_data,
    face_descriptor !== undefined ? face_descriptor : existing.face_descriptor,
    is_active ?? existing.is_active,
    role ?? existing.role ?? 'cashier',
    req.params.id
  );

  res.json(req.db.prepare('SELECT id, name, pin, role, is_active, photo_data, created_at FROM cashiers WHERE id = ?').get(req.params.id));
});

// DELETE /api/cashiers/:id
router.delete('/:id', directorOnly, (req, res) => {
  // Son direktor o'chirilmasin
  const c = req.db.prepare('SELECT role FROM cashiers WHERE id = ?').get(req.params.id);
  if (c?.role === 'director') {
    const dirCount = req.db.prepare("SELECT COUNT(*) as cnt FROM cashiers WHERE role = 'director'").get();
    if (dirCount.cnt <= 1) {
      return res.status(400).json({ error: "Oxirgi direktorni o'chirib bo'lmaydi" });
    }
  }
  req.db.prepare('DELETE FROM cashiers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/cashiers/verify-pin — login
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN majburiy' });

  const cashier = req.db.prepare(
    'SELECT id, name, role, photo_data, face_descriptor, is_active FROM cashiers WHERE pin = ? AND is_active = 1'
  ).get(pin);

  if (!cashier) return res.status(401).json({ error: 'PIN noto\'g\'ri yoki kassir faol emas' });
  res.json(cashier);
});

module.exports = router;
