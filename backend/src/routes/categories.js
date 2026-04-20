const express = require('express');
const router = express.Router();

function directorOnly(req, res, next) {
  if (req.userRole !== 'director') return res.status(403).json({ error: 'Faqat direktor uchun' })
  next()
}

router.get('/', (req, res) => {
  res.json(req.db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/', directorOnly, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nomi majburiy' });
  try {
    const result = req.db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.status(201).json(req.db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
  } catch {
    res.status(409).json({ error: 'Bu kategoriya allaqachon mavjud' });
  }
});

router.delete('/:id', directorOnly, (req, res) => {
  req.db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
