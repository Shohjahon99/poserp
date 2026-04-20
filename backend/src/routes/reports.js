const express = require('express');
const router = express.Router();
// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const summary = req.db.prepare(`
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(discount), 0) as total_discount,
      COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END), 0) as cash_revenue,
      COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END), 0) as card_revenue
    FROM sales
    WHERE date(created_at) = ?
  `).get(date);

  const topProducts = req.db.prepare(`
    SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE date(s.created_at) = ?
    GROUP BY si.product_name
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(date);

  const hourly = req.db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as sales, SUM(total) as revenue
    FROM sales
    WHERE date(created_at) = ?
    GROUP BY hour
    ORDER BY hour
  `).all(date);

  res.json({ date, summary, top_products: topProducts, hourly });
});

// GET /api/reports/monthly?year=&month=
router.get('/monthly', (req, res) => {
  const now = new Date();
  const year = req.query.year || now.getFullYear();
  const month = String(req.query.month || (now.getMonth() + 1)).padStart(2, '0');
  const prefix = `${year}-${month}`;

  const daily = req.db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as revenue
    FROM sales
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY date(created_at)
    ORDER BY date
  `).all(prefix);

  const summary = req.db.prepare(`
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_sale
    FROM sales
    WHERE strftime('%Y-%m', created_at) = ?
  `).get(prefix);

  res.json({ year, month, summary, daily });
});

// GET /api/reports/yearly?year=
router.get('/yearly', (req, res) => {
  const year = req.query.year || new Date().getFullYear();

  const monthly = req.db.prepare(`
    SELECT
      strftime('%m', created_at) as month,
      COUNT(*) as total_sales,
      COALESCE(SUM(total), 0) as revenue
    FROM sales
    WHERE strftime('%Y', created_at) = ?
    GROUP BY month
    ORDER BY month
  `).all(String(year));

  res.json({ year, monthly });
});

// GET /api/reports/top-products?from=&to=&limit=
router.get('/top-products', (req, res) => {
  const { from, to, limit = 10 } = req.query;
  const params = [];
  let where = 'WHERE 1=1';

  if (from) { where += ' AND date(s.created_at) >= ?'; params.push(from); }
  if (to)   { where += ' AND date(s.created_at) <= ?'; params.push(to); }

  const products = req.db.prepare(`
    SELECT si.product_name, si.product_id,
      SUM(si.quantity) as total_qty,
      SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    ${where}
    GROUP BY si.product_name
    ORDER BY total_revenue DESC
    LIMIT ?
  `).all(...params, parseInt(limit));

  res.json(products);
});

// GET /api/reports/stats (dashboard summary)
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todayStats = req.db.prepare(`
    SELECT COUNT(*) as sales, COALESCE(SUM(total),0) as revenue
    FROM sales WHERE date(created_at) = ?
  `).get(today);

  const monthStats = req.db.prepare(`
    SELECT COUNT(*) as sales, COALESCE(SUM(total),0) as revenue
    FROM sales WHERE strftime('%Y-%m', created_at) = ?
  `).get(thisMonth);

  const lowStock = req.db.prepare('SELECT COUNT(*) as cnt FROM products WHERE stock <= low_stock_threshold').get();
  const totalProducts = req.db.prepare('SELECT COUNT(*) as cnt FROM products').get();

  res.json({
    today: todayStats,
    this_month: monthStats,
    low_stock_count: lowStock.cnt,
    total_products: totalProducts.cnt,
  });
});

// GET /api/reports/profit?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/profit', (req, res) => {
  const { from, to } = req.query
  let where = 'WHERE s.is_refunded = 0'
  const params = []
  if (from) { where += ' AND date(s.created_at) >= ?'; params.push(from) }
  if (to)   { where += ' AND date(s.created_at) <= ?'; params.push(to) }

  // Daily profit breakdown
  const daily = req.db.prepare(`
    SELECT
      date(s.created_at) as date,
      SUM(si.subtotal) as revenue,
      SUM(si.cost * si.quantity) as total_cost,
      SUM(si.subtotal - si.cost * si.quantity) as profit
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    ${where}
    GROUP BY date(s.created_at)
    ORDER BY date ASC
  `).all(...params)

  // Summary totals
  const summary = req.db.prepare(`
    SELECT
      SUM(si.subtotal) as total_revenue,
      SUM(si.cost * si.quantity) as total_cost,
      SUM(si.subtotal - si.cost * si.quantity) as total_profit
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    ${where}
  `).get(...params)

  // Top profitable products
  const topProducts = req.db.prepare(`
    SELECT
      si.product_name,
      SUM(si.quantity) as total_qty,
      SUM(si.subtotal) as revenue,
      SUM(si.cost * si.quantity) as cost,
      SUM(si.subtotal - si.cost * si.quantity) as profit
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    ${where}
    GROUP BY si.product_name
    ORDER BY profit DESC
    LIMIT 10
  `).all(...params)

  res.json({
    daily: daily || [],
    summary: summary || { total_revenue: 0, total_cost: 0, total_profit: 0 },
    top_products: topProducts || []
  })
})

module.exports = router;
