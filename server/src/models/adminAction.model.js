/**
 * AdminActionModel — append-only audit log for every sensitive admin
 * write. Disputes can be traced back to "admin X did Y to Z at time T".
 *
 * Action constants are not enforced at the schema level — keeping this
 * loose lets us add new action types without a migration. Use the
 * ACTIONS map below as the canonical list and grep for any new ones
 * before they sneak in.
 */

const db = require('../config/db');

const ACTIONS = {
  USER_SUSPEND:           'user_suspend',
  USER_REACTIVATE:        'user_reactivate',
  USER_RESET_PASSWORD:    'user_reset_password',
  USER_UPDATE:            'user_update',
  RETAILER_APPROVE:       'retailer_approve',
  RETAILER_REJECT:        'retailer_reject',
  DISTRIBUTOR_CREATE:     'distributor_create',
  RETAILER_CREATE:        'retailer_create',
  WALLET_CREDIT:          'wallet_credit',
  WALLET_TRANSFER:        'wallet_transfer',
  WITHDRAWAL_APPROVE:     'withdrawal_approve',
  WITHDRAWAL_REJECT:      'withdrawal_reject',
  WITHDRAWAL_MARK_PAID:   'withdrawal_mark_paid',
  PAYMENT_REQUEST_UPDATE: 'payment_request_update',
  KYC_UPDATE:             'kyc_update',
  SETTINGS_UPDATE:        'settings_update',
  SUPPORT_TICKET_UPDATE:  'support_ticket_update',
};

const AdminActionModel = {
  ACTIONS,

  /**
   * Record one admin action. Best-effort: never throws to the caller — a
   * failed audit log MUST NOT block the underlying business operation.
   * The caller can fire-and-forget this and move on.
   *
   * @param {object} params
   * @param {object} params.req            Express request (for ip + UA)
   * @param {string} params.action         one of ACTIONS
   * @param {string} [params.targetType]   e.g. 'user', 'withdrawal', 'payment_request'
   * @param {number} [params.targetId]
   * @param {object} [params.payload]      anything you want preserved (small JSON)
   */
  async log({ req, action, targetType, targetId, payload }) {
    try {
      const adminUserId = req && req.user && req.user.id;
      if (!adminUserId) return;
      const ip = req.ip || (req.headers && req.headers['x-forwarded-for']) || null;
      const ua = req.headers && req.headers['user-agent'] || null;
      const payloadStr = payload !== undefined ? JSON.stringify(payload) : null;
      await db.prepare(`
        INSERT INTO admin_actions
          (admin_user_id, action, target_type, target_id, payload, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminUserId,
        action,
        targetType || null,
        targetId || null,
        payloadStr,
        ip,
        ua,
      );
    } catch (err) {
      // Best-effort. Log and swallow — the business operation already
      // succeeded by the time we get here.
      console.error('[adminAction.log] failed:', err.message);
    }
  },

  /**
   * Paginated list of audit actions for the admin audit-log page. Joins
   * the admin user name so the UI doesn't need a second fetch per row.
   */
  async list({ page = 1, limit = 50, action, targetType, adminUserId } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (action)       { where += ' AND a.action = ?';        params.push(action); }
    if (targetType)   { where += ' AND a.target_type = ?';   params.push(targetType); }
    if (adminUserId)  { where += ' AND a.admin_user_id = ?'; params.push(adminUserId); }

    const rows = await db.prepare(`
      SELECT a.*, u.name AS admin_name, u.email AS admin_email
      FROM admin_actions a
      LEFT JOIN users u ON u.id = a.admin_user_id
      ${where}
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM admin_actions a ${where}`).get(...params);
    return { rows, total: totalRow.c, page, limit };
  },
};

module.exports = AdminActionModel;
