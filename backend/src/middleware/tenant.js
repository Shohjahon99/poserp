/**
 * Tenant Middleware
 * JWT token'dan do'kon va foydalanuvchi ma'lumotlarini aniqlaydi
 */
const jwt = require('jsonwebtoken');
const { getStoreDb } = require('../storeDb');

const JWT_SECRET = process.env.JWT_SECRET || 'pos-erp-saas-secret-key-2024';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET muhit o\'zgaruvchisi o\'rnatilmagan! .env faylga qo\'shing.');
}

function storeAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token topilmadi' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.store_id) {
      return res.status(401).json({ error: 'Noto\'g\'ri token' });
    }

    req.storeId = decoded.store_id;
    req.storeName = decoded.store_name;
    req.userId = decoded.user_id;
    req.userName = decoded.name;
    req.userRole = decoded.role;
    req.db = getStoreDb(decoded.store_id);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token muddati o\'tgan yoki noto\'g\'ri' });
  }
}

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin token topilmadi' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin huquqi yo\'q' });
    }

    req.adminId = decoded.admin_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Admin token noto\'g\'ri' });
  }
}

module.exports = { storeAuth, adminAuth, JWT_SECRET };
