const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_key_for_house_renter';

// Canonical admin email whitelist — single source of truth
const ADMIN_EMAILS = ['crimesamachar1@gmail.com', 'rohitcreation12345@gmail.com', 'manoj@houserenter.in'];

function parseCookies(req) {
  const cookies = {};
  const raw = req.headers.cookie;
  if (raw) {
    raw.split('; ').forEach(part => {
      const idx = part.indexOf('=');
      if (idx > -1) {
        cookies[decodeURIComponent(part.slice(0, idx))] = decodeURIComponent(part.slice(idx + 1));
      }
    });
  }
  return cookies;
}

async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.session && req.session.token) {
    token = req.session.token;
  } else {
    const cookies = parseCookies(req);
    if (cookies.token) token = cookies.token;
  }

  if (!token && req.query._token) {
    token = req.query._token;
  }

  if (!token) { req.user = null; return next(); }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    const localUser = rows[0];

    if (localUser) {
      const emailLower = (localUser.email || '').toLowerCase();
      // Always enforce admin role for whitelisted emails
      if (ADMIN_EMAILS.includes(emailLower)) {
        localUser.role = 'admin';
        localUser.subscription_status = 'active';
      }
      req.user = {
        id: localUser.id,
        name: localUser.name,
        email: emailLower,
        phone: localUser.phone,
        role: localUser.role,
        profile_picture: localUser.profile_picture,
        profile_photo: localUser.profile_photo || localUser.profile_picture,
        provider: localUser.provider || 'email',
        subscription_status: localUser.subscription_status
      };
      if (req.session) {
        req.session.userId = localUser.id;
        req.session.user = req.user;
        req.session.isAdmin = localUser.role === 'admin' ? 1 : 0;
      }
    } else {
      console.warn(`⚠️ JWT valid but user ID ${decoded.id} not found in DB — rebuilding from token payload.`);
      const emailLower = (decoded.email || '').toLowerCase();
      const roleFromEmail = ADMIN_EMAILS.includes(emailLower) ? 'admin' : (decoded.role || 'user');
      req.user = {
        id: decoded.id,
        name: decoded.name || 'User',
        email: emailLower,
        phone: null,
        role: roleFromEmail,
        profile_picture: decoded.profile_picture || null,
        profile_photo: decoded.profile_photo || null,
        provider: decoded.provider || 'email',
        subscription_status: ADMIN_EMAILS.includes(emailLower) ? 'active' : 'inactive'
      };
      try {
        const db2 = require('../config/db');
        if (db2.isMock()) {
          db2.mockDb.users.push({ ...req.user, google_id: decoded.google_id || null, password_hash: null, created_at: new Date() });
          console.log(`✅ Re-inserted user ID ${decoded.id} into mock DB from JWT payload.`);
        }
      } catch (e) { console.warn('⚠️ Could not re-insert user into mock DB:', e.message); }
      if (req.session) {
        req.session.userId = req.user.id;
        req.session.user = req.user;
        req.session.isAdmin = req.user.role === 'admin' ? 1 : 0;
      }
    }
    next();
  } catch (error) {
    console.warn('⚠️ Invalid/expired JWT:', error.message);
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Unauthorized access. Insufficient permissions.' });
    next();
  };
}

// Dual-verification admin guard: role === 'admin' AND email in whitelist
function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  const emailLower = (req.user.email || '').toLowerCase();
  if (req.user.role !== 'admin' || !ADMIN_EMAILS.includes(emailLower)) {
    return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
  }
  next();
}

module.exports = { authenticateJWT, requireAuth, requireRole, isAdmin, ADMIN_EMAILS };
