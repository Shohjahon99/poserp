const express = require('express');
const router = express.Router();
const { logAction } = require('../middleware/audit');
function generateReceiptNumber(db) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = db.prepare(
    "SELECT receipt_number FROM sales WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${today}-%`);
  const seq = last ? parseInt(last.receipt_number.split('-')[1]) + 1 : 1;
  return `${today}-${String(seq).padStart(4, '0')}`;
}

// GET /api/sales?from=&to=&page=&limit=
router.get('/', (req, res) => {
  const { from, to, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = 'WHERE 1=1';

  if (from) { where += ' AND date(s.created_at) >= ?'; params.push(from); }
  if (to)   { where += ' AND date(s.created_at) <= ?'; params.push(to); }

  const total = req.db.prepare(`SELECT COUNT(*) as cnt FROM sales s ${where}`).get(...params)?.cnt || 0;
  const sales = req.db.prepare(`
    SELECT s.*, COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    ${where}
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ sales, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/sales/:id
router.get('/:id', (req, res) => {
  const sale = req.db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sotuv topilmadi' });

  const items = req.db.prepare(`
    SELECT si.*, p.barcode
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items });
});

// POST /api/sales
router.post('/', (req, res) => {
  const { items, discount = 0, payment_method = 'cash', amount_tendered = 0 } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "Savat bo'sh" });

  // Kassir ma'lumotlari — token'dan yoki body'dan
  const sellerName = req.userName || req.body.cashier_name || 'Noma\'lum';

  let saleRow;
  try {
    req.db.exec('BEGIN');

    // Stock check + update all happen inside the same transaction to avoid race conditions
    let total = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Mahsulot topilmadi: ${item.product_id}`);
      if (product.stock < item.quantity) throw new Error(`"${product.name}" uchun yetarli zaxira yo'q (mavjud: ${product.stock})`);
      total += item.unit_price * item.quantity;
      resolvedItems.push({ item, product });
    }

    const finalTotal = total - discount;
    const change = payment_method === 'cash' ? Math.max(0, amount_tendered - finalTotal) : 0;
    const receipt = generateReceiptNumber(req.db);

    const saleResult = req.db.prepare(`
      INSERT INTO sales (receipt_number, total, discount, payment_method, amount_tendered, change_given, cashier_id, cashier_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(receipt, finalTotal, discount, payment_method, amount_tendered, change, req.userId || null, sellerName);

    const saleId = saleResult.lastInsertRowid;

    for (const { item, product } of resolvedItems) {
      req.db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, cost, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, product.name, item.quantity, item.unit_price, product.cost || 0, item.unit_price * item.quantity);

      req.db.prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now','localtime') WHERE id = ?").run(item.quantity, item.product_id);

      req.db.prepare(`INSERT INTO inventory_log (product_id, change, reason, note) VALUES (?, ?, 'sale', ?)`).run(item.product_id, -item.quantity, `Chek: ${receipt}`);
    }

    saleRow = req.db.prepare(`
      SELECT s.*, json_group_array(json_object(
        'id', si.id, 'product_id', si.product_id, 'product_name', si.product_name,
        'quantity', si.quantity, 'unit_price', si.unit_price, 'subtotal', si.subtotal
      )) as items_json
      FROM sales s JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(saleId);

    req.db.exec('COMMIT');
  } catch (err) {
    req.db.exec('ROLLBACK');
    return res.status(400).json({ error: err.message });
  }

  const result = { ...saleRow, items: JSON.parse(saleRow.items_json) };
  delete result.items_json;
  logAction(req.db, { userId: req.userId, userName: req.userName, action: 'sale_created', entity: 'sale', entityId: saleRow.id, details: { total: saleRow.total, payment_method: saleRow.payment_method } });
  res.status(201).json(result);
});

// POST /api/sales/:id/refund (qaytarish)
router.post('/:id/refund', (req, res) => {
  const sale = req.db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sotuv topilmadi' });
  if (sale.is_refunded) return res.status(400).json({ error: 'Bu chek allaqachon qaytarilgan' });

  const items = req.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);

  try {
    req.db.exec('BEGIN');
    for (const item of items) {
      if (item.product_id) {
        req.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
        req.db.prepare(`INSERT INTO inventory_log (product_id, change, reason, note) VALUES (?, ?, 'return', ?)`).run(item.product_id, item.quantity, `Qaytarish: ${sale.receipt_number}`);
      }
    }
    req.db.prepare("UPDATE sales SET is_refunded = 1, refunded_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    req.db.exec('COMMIT');
    logAction(req.db, { userId: req.userId, userName: req.userName, action: 'sale_refunded', entity: 'sale', entityId: parseInt(req.params.id) });
    res.json({ success: true, message: 'Tovarlar qaytarildi va zaxira tiklandi' });
  } catch (err) {
    req.db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
