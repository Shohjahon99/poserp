require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true, // true = same origin, set ALLOWED_ORIGIN in production
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ===== Platform routes (no tenant middleware) =====
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// ===== Store routes (tenant middleware — JWT token identifies store) =====
const { storeAuth } = require('./middleware/tenant');

app.use('/api/products',   storeAuth, require('./routes/products'));
app.use('/api/categories', storeAuth, require('./routes/categories'));
app.use('/api/sales',      storeAuth, require('./routes/sales'));
app.use('/api/inventory',  storeAuth, require('./routes/inventory'));
app.use('/api/reports',    storeAuth, require('./routes/reports'));
app.use('/api/cashiers',   storeAuth, require('./routes/cashiers'));
app.use('/api/staff',      storeAuth, require('./routes/staff'));
app.use('/api/settings',   storeAuth, require('./routes/settings'));
app.use('/api/audit',      storeAuth, require('./routes/audit'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.2.0', time: new Date().toISOString() });
});

// ===== Serve frontend =====
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n POS ERP SaaS Platform ishga tushdi: http://localhost:${PORT}`);
  console.log(`   Super Admin: http://localhost:${PORT}/super-admin\n`);
});
