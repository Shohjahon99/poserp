const express = require('express');
const router = express.Router();

function directorOnly(req, res, next) {
  if (req.userRole !== 'director') return res.status(403).json({ error: 'Faqat direktor sozlamalarni o\'zgartira oladi' })
  next()
}

// GET /api/settings — do'kon sozlamalari
router.get('/', (req, res) => {
  const rows = req.db.prepare('SELECT key, value FROM store_settings').all();
  const config = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  res.json(config);
});

// PUT /api/settings — sozlamalarni saqlash
router.put('/', directorOnly, (req, res) => {
  const { name, address, phone, logo_data } = req.body;

  const upsert = req.db.prepare(
    'INSERT INTO store_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );

  if (name !== undefined) upsert.run('name', name);
  if (address !== undefined) upsert.run('address', address);
  if (phone !== undefined) upsert.run('phone', phone);
  if (logo_data !== undefined) upsert.run('logo_data', logo_data || '');

  res.json({ success: true });
});

module.exports = router;
