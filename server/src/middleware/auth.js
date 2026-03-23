const { verifyToken } = require('../config/jwt');
const db = require('../config/db');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    const user = db.prepare('SELECT id, role, parent_id, name, email, phone, status FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is ' + user.status });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
