const express = require('express');
const router = express.Router();

function directorOnly(req, res, next) {
  if (req.userRole !== 'director') return res.status(403).json({ error: 'Faqat direktor uchun' })
  next()
}

// GET /api/inventory/log?product_id=&page=&limit=
router.get('/log', (req, res) => {
  const { product_id, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = 'WHERE 1=1';

  if (product_id) { where += ' AND il.product_id = ?'; params.push(product_id); }

  const logs = req.db.prepare(`
    SELECT il.*, p.name as product_name
    FROM inventory_log il
    JOIN products p ON il.product_id = p.id
    ${where}
    ORDER BY il.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json(logs);
});

// GET /api/inventory/low-stock
router.get('/low-stock', (req, res) => {
  const products = req.db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock <= p.low_stock_threshold
    ORDER BY p.stock ASC
  `).all();
  res.json(products);
});

// POST /api/inventory/adjust
router.post('/adjust', directorOnly, (req, res) => {
  const { product_id, change, reason = 'manual_adjust', note } = req.body;
  if (!product_id || change == null) return res.status(400).json({ error: "product_id va change majburiy" });

  const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  const newStock = product.stock + parseInt(change);
  if (newStock < 0) return res.status(400).json({ error: "Zaxira salbiy bo'lishi mumkin emas" });

  req.db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newStock, product_id);
  req.db.prepare('INSERT INTO inventory_log (product_id, change, reason, note) VALUES (?, ?, ?, ?)').run(product_id, change, reason, note || null);

  res.json({ product_id, new_stock: newStock, change });
});

module.exports = router;
