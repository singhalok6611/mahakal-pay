/**
 * CommissionSplit — slice 3 replacement for the old "1% platform fee" model
 * on the retailer recharge path.
 *
 * Rule (per project_mahakal_commission memory):
 *   On every retailer-earned commission we credit the upline:
 *     - Distributor (the retailer's parent) gets distributor_share_pct % of
 *       the retailer's commission (default 0.25%).
 *     - Admin gets admin_share_pct % of the retailer's commission
 *       (default 0.5%).
 *   Both credits are real wallet movements (wallet_transactions rows) so the
 *   distributor and admin see them in their statements.
 *
 * The split is computed off the retailer's COMMISSION, not the recharge
 * amount, and never reduces the retailer's commission credit — it is paid
 * by the platform on top, the same way revenue overrides work in real
 * BBPS aggregator economics. (If the user's intent later changes to
 * "deduct from retailer commission", flip the retailer credit accordingly
 * at the call site — this model only handles the upline credits.)
 */

const db = require('../config/db');
const WalletModel = require('./wallet.model');

const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);
const DEFAULT_DISTRIBUTOR_PCT = parseFloat(process.env.DISTRIBUTOR_SHARE_PCT || '0.25');
const DEFAULT_ADMIN_PCT = parseFloat(process.env.ADMIN_SHARE_PCT || '0.5');

function readSettingPct(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (row && row.value !== undefined && row.value !== null && row.value !== '') {
      const n = parseFloat(row.value);
      if (!Number.isNaN(n)) return n;
    }
  } catch {}
  return fallback;
}

function getSplitConfig() {
  return {
    distributor_share_pct: readSettingPct('distributor_share_pct', DEFAULT_DISTRIBUTOR_PCT),
    admin_share_pct: readSettingPct('admin_share_pct', DEFAULT_ADMIN_PCT),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const CommissionSplitModel = {
  ADMIN_USER_ID,
  getSplitConfig,

  /**
   * Compute and credit the distributor + admin overrides for a retailer
   * commission, then record one commission_splits row.
   *
   * @param {object} params
   * @param {number} params.transactionId       internal transactions.id
   * @param {number} params.retailerUserId      retailer who earned the commission
   * @param {number} params.retailerCommission  the retailer commission amount (₹)
   * @returns {object}                          { distributorShare, adminShare, splitId }
   */
  apply({ transactionId, retailerUserId, retailerCommission }) {
    if (!transactionId || !retailerUserId) {
      throw new Error('CommissionSplit.apply requires transactionId + retailerUserId');
    }
    const base = parseFloat(retailerCommission) || 0;
    if (base <= 0) {
      // Nothing to split — still record a zero-row so the audit trail is complete.
      const { distributor_share_pct, admin_share_pct } = getSplitConfig();
      const retailer = db.prepare('SELECT parent_id FROM users WHERE id = ?').get(retailerUserId);
      const splitId = db.prepare(`
        INSERT INTO commission_splits (
          transaction_id, retailer_user_id, retailer_commission_amount,
          distributor_user_id, distributor_share_pct, distributor_share_amount,
          admin_user_id, admin_share_pct, admin_share_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId, retailerUserId, 0,
        retailer ? retailer.parent_id : null, distributor_share_pct, 0,
        ADMIN_USER_ID, admin_share_pct, 0
      ).lastInsertRowid;
      return { distributorShare: 0, adminShare: 0, splitId };
    }

    const { distributor_share_pct, admin_share_pct } = getSplitConfig();

    const retailer = db.prepare('SELECT id, parent_id, name FROM users WHERE id = ?').get(retailerUserId);
    if (!retailer) throw new Error('Retailer not found');

    const distributorUserId = retailer.parent_id; // may be null in odd test data
    const distributorShare = distributor_share_pct > 0 ? round2((base * distributor_share_pct) / 100) : 0;
    const adminShare = admin_share_pct > 0 ? round2((base * admin_share_pct) / 100) : 0;

    // Wallet credits — wrapped in a single transaction so the row + both
    // wallet movements all land or all roll back.
    const txn = db.transaction(() => {
      if (distributorUserId && distributorShare > 0) {
        const distWallet = WalletModel.getByUserId(distributorUserId);
        if (distWallet) {
          WalletModel.credit(
            distributorUserId,
            distributorShare,
            'commission_override',
            transactionId,
            `Override ${distributor_share_pct}% on retailer commission for txn #${transactionId}`
          );
        }
      }

      if (adminShare > 0 && ADMIN_USER_ID !== retailerUserId) {
        const adminWallet = WalletModel.getByUserId(ADMIN_USER_ID);
        if (adminWallet) {
          WalletModel.credit(
            ADMIN_USER_ID,
            adminShare,
            'commission_override',
            transactionId,
            `Admin override ${admin_share_pct}% on retailer commission for txn #${transactionId}`
          );
        }
      }

      const result = db.prepare(`
        INSERT INTO commission_splits (
          transaction_id, retailer_user_id, retailer_commission_amount,
          distributor_user_id, distributor_share_pct, distributor_share_amount,
          admin_user_id, admin_share_pct, admin_share_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId, retailerUserId, base,
        distributorUserId, distributor_share_pct, distributorShare,
        ADMIN_USER_ID, admin_share_pct, adminShare
      );
      return result.lastInsertRowid;
    });

    const splitId = txn();
    return { distributorShare, adminShare, splitId };
  },

  /**
   * Look up the split row for a given transaction (slice 6 will use this).
   */
  findByTransactionId(transactionId) {
    return db.prepare('SELECT * FROM commission_splits WHERE transaction_id = ?').get(transactionId);
  },

  /**
   * Admin earnings list — page through commission_splits joined with users.
   */
  list({ page = 1, limit = 50, from, to } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (from) { where += ' AND DATE(cs.created_at) >= ?'; params.push(from); }
    if (to)   { where += ' AND DATE(cs.created_at) <= ?'; params.push(to); }

    const rows = db.prepare(`
      SELECT cs.*,
             r.name AS retailer_name,
             d.name AS distributor_name,
             t.amount AS recharge_amount,
             t.service_type AS service_type,
             t.operator AS operator,
             t.subscriber_id AS subscriber_id,
             t.status AS transaction_status
      FROM commission_splits cs
      LEFT JOIN users r ON r.id = cs.retailer_user_id
      LEFT JOIN users d ON d.id = cs.distributor_user_id
      LEFT JOIN transactions t ON t.id = cs.transaction_id
      ${where}
      ORDER BY cs.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as c FROM commission_splits cs ${where}`).get(...params).c;
    const sum = db.prepare(`
      SELECT
        COALESCE(SUM(distributor_share_amount), 0) as distributor_total,
        COALESCE(SUM(admin_share_amount), 0) as admin_total,
        COALESCE(SUM(retailer_commission_amount), 0) as retailer_commission_total
      FROM commission_splits cs ${where}
    `).get(...params);

    return { rows, total, sum, page, limit };
  },

  /**
   * Admin dashboard rollups — admin's own earnings over time windows.
   */
  totals() {
    return db.prepare(`
      SELECT
        COALESCE(SUM(admin_share_amount), 0) as admin_total_lifetime,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN admin_share_amount ELSE 0 END), 0) as admin_today,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN admin_share_amount ELSE 0 END), 0) as admin_last_7_days,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN admin_share_amount ELSE 0 END), 0) as admin_this_month,
        COALESCE(SUM(distributor_share_amount), 0) as distributor_total_lifetime,
        COUNT(*) as count
      FROM commission_splits
    `).get();
  },
};

module.exports = CommissionSplitModel;
