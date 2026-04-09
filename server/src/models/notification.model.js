/**
 * NotificationModel — slice 5 in-app notifications.
 *
 * Backed by the notifications table from slice 1. Per the user spec the
 * admin gets a notification on every retailer/distributor transaction
 * (recharge success/fail, transfer, withdrawal request, suspension, etc).
 * The same table is generic enough to write notifications to other roles
 * later (e.g. notify a distributor when one of their retailers is approved).
 */

const db = require('../config/db');

const NotificationModel = {
  create({ user_id, type, title, message, reference_type, reference_id }) {
    const result = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, type, title, message, reference_type || null, reference_id || null);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  },

  listByUser(user_id, { page = 1, limit = 50, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE user_id = ?';
    const params = [user_id];
    if (unreadOnly) where += ' AND is_read = 0';

    const rows = db.prepare(`
      SELECT * FROM notifications
      ${where}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as c FROM notifications ${where}`).get(...params).c;
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(user_id).c;
    return { rows, total, unread, page, limit };
  },

  countUnread(user_id) {
    return db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(user_id).c;
  },

  markRead(id, user_id) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, user_id);
    return this.findById(id);
  },

  markAllRead(user_id) {
    const r = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(user_id);
    return { changed: r.changes };
  },
};

module.exports = NotificationModel;
