const { verifyAccessToken } = require('../config/jwt');
const db = require('../config/db');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = db.prepare('SELECT id, role, parent_id, name, email, phone, status, approval_status FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is ' + user.status });
    }
    // A retailer can be marked active by status but still be waiting on admin
    // approval — block them from doing anything until approval_status='approved'.
    if (user.approval_status && user.approval_status !== 'approved') {
      return res.status(403).json({
        error: user.approval_status === 'pending_approval'
          ? 'Account is pending admin approval'
          : 'Account approval was rejected',
        approval_status: user.approval_status,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
