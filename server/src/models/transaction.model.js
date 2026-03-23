const db = require('../config/db');

const TransactionModel = {
  create({ user_id, service_type, operator, subscriber_id, amount, status, commission }) {
    const result = db.prepare(`
      INSERT INTO transactions (user_id, service_type, operator, subscriber_id, amount, status, commission)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, service_type, operator, subscriber_id, amount, status || 'pending', commission || 0);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  },

  updateStatus(id, status, apiTxnId) {
    db.prepare('UPDATE transactions SET status = ?, api_txn_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, apiTxnId, id);
    return this.findById(id);
  },

  listByUser(userId, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      where += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.service_type) {
      where += ' AND service_type = ?';
      params.push(filters.service_type);
    }

    const transactions = db.prepare(`SELECT * FROM transactions ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM transactions ${where}`).get(...params).count;
    return { transactions, total, page, limit };
  },

  listAll(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (filters.status) {
      where += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters.service_type) {
      where += ' AND t.service_type = ?';
      params.push(filters.service_type);
    }
    if (filters.user_id) {
      where += ' AND t.user_id = ?';
      params.push(filters.user_id);
    }

    const transactions = db.prepare(`
      SELECT t.*, u.name as user_name, u.phone as user_phone
      FROM transactions t JOIN users u ON t.user_id = u.id
      ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${where}`).get(...params).count;
    return { transactions, total, page, limit };
  },

  listByParentUser(parentId, page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE t.user_id IN (SELECT id FROM users WHERE parent_id = ?)';
    const params = [parentId];

    if (filters.status) {
      where += ' AND t.status = ?';
      params.push(filters.status);
    }

    const transactions = db.prepare(`
      SELECT t.*, u.name as user_name, u.phone as user_phone
      FROM transactions t JOIN users u ON t.user_id = u.id
      ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${where}`).get(...params).count;
    return { transactions, total, page, limit };
  },

  getTodayStats(userFilter = null) {
    let where = "WHERE DATE(t.created_at) = DATE('now')";
    const params = [];

    if (userFilter) {
      where += ` AND t.user_id IN (SELECT id FROM users WHERE ${userFilter.field} = ?)`;
      params.push(userFilter.value);
    }

    return db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END), 0) as success_amount,
        COALESCE(SUM(CASE WHEN t.status = 'success' THEN 1 ELSE 0 END), 0) as success_count,
        COALESCE(SUM(CASE WHEN t.status = 'processing' THEN t.amount ELSE 0 END), 0) as processing_amount,
        COALESCE(SUM(CASE WHEN t.status = 'processing' THEN 1 ELSE 0 END), 0) as processing_count,
        COALESCE(SUM(CASE WHEN t.status = 'failed' THEN t.amount ELSE 0 END), 0) as failed_amount,
        COALESCE(SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END), 0) as failed_count,
        COALESCE(SUM(CASE WHEN t.status = 'refunded' THEN t.amount ELSE 0 END), 0) as refund_amount,
        COALESCE(SUM(CASE WHEN t.status = 'refunded' THEN 1 ELSE 0 END), 0) as refund_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(*) as total_count
      FROM transactions t ${where}
    `).get(...params);
  },

  getTodayCommission(userFilter = null) {
    let where = "WHERE DATE(created_at) = DATE('now') AND status = 'success'";
    const params = [];

    if (userFilter) {
      where += ` AND user_id IN (SELECT id FROM users WHERE ${userFilter.field} = ?)`;
      params.push(userFilter.value);
    }

    return db.prepare(`SELECT COALESCE(SUM(commission), 0) as total FROM transactions ${where}`).get(...params).total;
  },
};

module.exports = TransactionModel;
