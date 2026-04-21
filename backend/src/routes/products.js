const express = require('express');
const router = express.Router();
const { logAction } = require('../middleware/audit');
// GET /api/products?search=&barcode=&category=&page=&limit=
router.get('/', (req, res) => {
  const { search, barcode, category, quick_add, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE COALESCE(p.is_active, 1) = 1
  `;
  const params = [];

  if (barcode) {
    // GS1 markirovka kodlari va har xil skanerlar uchun moslashuvchan qidiruv.
    // Skaner boshiga ]d2, ]C1 kabi AIM prefiksini qo'shishi mumkin — tozalaymiz.
    const cleaned = barcode.replace(/^\][A-Za-z]\d/, '').trim();
    // GTIN ni ajratib olish (01 + 14 raqam) — GS1 DataMatrix uchun
    const gtinMatch = cleaned.match(/01(\d{14})/);
    // GTIN dan bosh nolle olib tashlash (DB da ham shunday saqlanadi)
    const gtin = gtinMatch ? gtinMatch[1] : null;
    const gtinStripped = gtin ? gtin.replace(/^0+/, '') : null;

    const conds = [
      'p.barcode = ?',                              // aynan mos
      'p.barcode = ?',                              // tozalangan versiyasi
      "? LIKE '%' || p.barcode || '%'",            // DB barcode skanerlangan ichida
      "? LIKE '%' || p.barcode || '%'",            // DB barcode tozalangan ichida
    ];
    params.push(barcode, cleaned, barcode, cleaned);

    if (gtin) {
      conds.push('p.barcode = ?');                  // GTIN (with leading zeros)
      conds.push('p.barcode LIKE ?');               // GTIN ichida
      params.push(gtin, `%${gtin}%`);
    }
    if (gtinStripped && gtinStripped !== gtin) {
      conds.push('p.barcode = ?');                  // GTIN (leading zeros olib tashlangan)
      conds.push('p.barcode LIKE ?');               // GTIN stripped ichida
      params.push(gtinStripped, `%${gtinStripped}%`);
    }

    sql += ' AND (' + conds.join(' OR ') + ')';
  } else if (search) {
    // Search: nom yoki barcode bo'yicha, GS1 GTIN ham tekshiriladi
    const searchGtinMatch = search.replace(/^\][A-Za-z]\d/, '').match(/01(\d{14})/);
    const searchGtin = searchGtinMatch ? searchGtinMatch[1].replace(/^0+/, '') : null;
    if (searchGtin) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.barcode = ?)';
      params.push(`%${search}%`, `%${search}%`, searchGtin);
    } else {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
  }

  if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }

  if (quick_add === 'true' || quick_add === '1') {
    sql += ' AND p.is_quick_add = 1';
  }

  sql += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const total = req.db.prepare(sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as cnt FROM').replace(/ORDER BY.*/, '')).get(...params.slice(0, -2));
  const products = req.db.prepare(sql).all(...params);

  res.json({ products, total: total?.cnt || products.length });
});

// GET /api/products/low-stock
router.get('/low-stock', (req, res) => {
  const products = req.db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock <= p.low_stock_threshold
    ORDER BY p.stock ASC
    LIMIT 50
  `).all();
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = req.db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  res.json(product);
});

// POST /api/products
router.post('/', (req, res) => {
  const { barcode, name, category_id, price, cost, stock, low_stock_threshold, unit, image_data, is_quick_add } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'Nomi va narxi majburiy' });

  try {
    const result = req.db.prepare(`
      INSERT INTO products (barcode, name, category_id, price, cost, stock, low_stock_threshold, unit, image_data, is_quick_add)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(barcode || null, name, category_id || null, price, cost || 0, stock || 0, low_stock_threshold || 10, unit || 'dona', image_data || null, is_quick_add ? 1 : 0);

    if ((stock || 0) > 0) {
      req.db.prepare(`INSERT INTO inventory_log (product_id, change, reason, note) VALUES (?, ?, 'initial', 'Boshlang''ich qoldiq')`).run(result.lastInsertRowid, stock);
    }

    const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'product_created', entity: 'product', entityId: result.lastInsertRowid, details: { name } });
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Bu barcode allaqachon mavjud' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const { barcode, name, category_id, price, cost, stock, low_stock_threshold, unit, image_data, is_quick_add } = req.body;
  const existing = req.db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  try {
    req.db.prepare(`
      UPDATE products SET
        barcode=?, name=?, category_id=?, price=?, cost=?, stock=?,
        low_stock_threshold=?, unit=?, image_data=?, is_quick_add=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(
      barcode ?? existing.barcode,
      name ?? existing.name,
      category_id ?? existing.category_id,
      price ?? existing.price,
      cost ?? existing.cost,
      stock ?? existing.stock,
      low_stock_threshold ?? existing.low_stock_threshold,
      unit ?? existing.unit,
      image_data !== undefined ? image_data : existing.image_data,
      is_quick_add !== undefined ? (is_quick_add ? 1 : 0) : existing.is_quick_add,
      req.params.id
    );

    if (stock != null && stock !== existing.stock) {
      req.db.prepare(`INSERT INTO inventory_log (product_id, change, reason, note) VALUES (?, ?, 'manual_adjust', 'Qo''lda tahrirlash')`).run(req.params.id, stock - existing.stock);
    }

    const updated = req.db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'product_updated', entity: 'product', entityId: parseInt(req.params.id), details: { name: updated.name } });
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Bu barcode allaqachon mavjud' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  // Check if product is referenced in any sale
  const used = req.db.prepare('SELECT COUNT(*) as cnt FROM sale_items WHERE product_id = ?').get(req.params.id);

  if (used.cnt > 0) {
    // Soft delete — preserve sale history
    req.db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'product_deleted', entity: 'product', entityId: parseInt(req.params.id), details: { name: product.name, soft: true } });
    return res.json({ success: true, soft: true, message: 'Mahsulot arxivga ko\'chirildi (sotuv tarixi saqlanadi)' });
  }

  // No sales — safe to hard delete. Clean inventory_log too.
  try {
    req.db.exec('BEGIN');
    req.db.prepare('DELETE FROM inventory_log WHERE product_id = ?').run(req.params.id);
    req.db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    req.db.exec('COMMIT');
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'product_deleted', entity: 'product', entityId: parseInt(req.params.id), details: { name: product.name } });
    res.json({ success: true });
  } catch (err) {
    req.db.exec('ROLLBACK');
    // Fallback to soft delete
    req.db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(req.params.id);
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'product_deleted', entity: 'product', entityId: parseInt(req.params.id), details: { name: product.name, soft: true } });
    res.json({ success: true, soft: true, message: "O'chirish imkonsiz, arxivga ko'chirildi" });
  }
});

module.exports = router;
