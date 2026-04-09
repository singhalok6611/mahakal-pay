/**
 * CommissionSplit — owns the per-transaction commission distribution.
 *
 * NEW RULE (revised after slice 3, per the user's clarification):
 *   The operator's commission_pct is the ENTIRE pool, and it is split in
 *   absolute percentage points of the recharge amount:
 *
 *     Admin       gets admin_share_pct % of the recharge amount
 *                 (default 0.5%)
 *     Distributor gets distributor_share_pct % of the recharge amount
 *                 (default 0.25%)
 *     Retailer    keeps  (operator_pct - admin_share_pct - distributor_share_pct) %
 *                 of the recharge amount — i.e. whatever is left of the pool.
 *
 *   Worked example: ₹500 Airtel mobile recharge, operator commission 3%.
 *     Pool        = 3.00% × 500 = ₹15.00
 *     Admin       = 0.50% × 500 = ₹2.50
 *     Distributor = 0.25% × 500 = ₹1.25
 *     Retailer    = 2.25% × 500 = ₹11.25     (sum: ₹15.00 ✓)
 *
 * Cascading cap for very thin operators:
 *   If operator_pct < admin_share_pct + distributor_share_pct, the admin
 *   is paid first (up to the available pool), then the distributor gets
 *   what's left, then the retailer. This guarantees the three credits
 *   always sum to exactly the pool, never go negative, and never exceed
 *   the operator commission.
 *
 * Slices that depend on this:
 *   - retailer.controller.recharge calls apply() once on success and uses
 *     the returned retailerAmount as transactions.commission.
 *   - admin platform earnings page (slice 3 UI) and the role-scoped
 *     detailed transactions pages (slice 6) read commission_splits rows
 *     directly — schema is unchanged so they keep working with the new
 *     numbers automatically.
 */

const db = require('../config/db');
const WalletModel = require('./wallet.model');

const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);
const DEFAULT_DISTRIBUTOR_PCT = parseFloat(process.env.DISTRIBUTOR_SHARE_PCT || '0.25');
const DEFAULT_ADMIN_PCT = parseFloat(process.env.ADMIN_SHARE_PCT || '0.5');

async function readSettingPct(key, fallback) {
  try {
    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (row && row.value !== undefined && row.value !== null && row.value !== '') {
      const n = parseFloat(row.value);
      if (!Number.isNaN(n)) return n;
    }
  } catch {}
  return fallback;
}

async function getSplitConfig() {
  return {
    distributor_share_pct: await readSettingPct('distributor_share_pct', DEFAULT_DISTRIBUTOR_PCT),
    admin_share_pct: await readSettingPct('admin_share_pct', DEFAULT_ADMIN_PCT),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Pure helper: given an operator commission % and the configured admin /
 * distributor cuts, return the effective percentage each party receives
 * (in absolute pp of the recharge amount). Applies the cascading cap
 * (admin → distributor → retailer priority) so the three pieces always
 * sum to exactly the operator pct.
 */
function computeSplitPcts({ operatorPct, adminPct, distributorPct }) {
  const op = Math.max(0, Number(operatorPct) || 0);
  const a = Math.max(0, Number(adminPct) || 0);
  const d = Math.max(0, Number(distributorPct) || 0);

  if (op >= a + d) {
    return { adminEffectivePct: a, distributorEffectivePct: d, retailerEffectivePct: round2(op - a - d) };
  }
  if (op >= a) {
    return { adminEffectivePct: a, distributorEffectivePct: round2(op - a), retailerEffectivePct: 0 };
  }
  return { adminEffectivePct: round2(op), distributorEffectivePct: 0, retailerEffectivePct: 0 };
}

const CommissionSplitModel = {
  ADMIN_USER_ID,
  getSplitConfig,
  computeSplitPcts,

  /**
   * Compute the full split off a recharge, credit all three wallets, and
   * record one commission_splits row. Single source of truth for the
   * commission rule.
   *
   * @param {object} params
   * @param {number} params.transactionId         internal transactions.id
   * @param {number} params.retailerUserId        retailer who did the recharge
   * @param {number} params.rechargeAmount        recharge amount (₹)
   * @param {number} params.operatorCommissionPct operator commission_pct from operators table
   * @returns {object} { retailerAmount, distributorAmount, adminAmount,
   *                     retailerEffectivePct, distributorEffectivePct,
   *                     adminEffectivePct, splitId }
   */
  async apply({ transactionId, retailerUserId, rechargeAmount, operatorCommissionPct }) {
    if (!transactionId || !retailerUserId) {
      throw new Error('CommissionSplit.apply requires transactionId + retailerUserId');
    }
    const amount = parseFloat(rechargeAmount) || 0;
    if (amount <= 0) {
      throw new Error('CommissionSplit.apply requires a positive rechargeAmount');
    }

    const { distributor_share_pct, admin_share_pct } = await getSplitConfig();
    const { adminEffectivePct, distributorEffectivePct, retailerEffectivePct } =
      computeSplitPcts({
        operatorPct: operatorCommissionPct,
        adminPct: admin_share_pct,
        distributorPct: distributor_share_pct,
      });

    const adminAmount = round2((amount * adminEffectivePct) / 100);
    const distributorAmount = round2((amount * distributorEffectivePct) / 100);
    const retailerAmount = round2((amount * retailerEffectivePct) / 100);

    const retailer = await db.prepare('SELECT id, parent_id, name FROM users WHERE id = ?').get(retailerUserId);
    if (!retailer) throw new Error('Retailer not found');
    const distributorUserId = retailer.parent_id; // may be null in odd test data

    // Wallet credits + audit row — wrapped in a single DB transaction so
    // either everything lands or nothing does.
    const txn = db.transaction(async () => {
      if (retailerAmount > 0) {
        await WalletModel.credit(
          retailerUserId,
          retailerAmount,
          'commission',
          transactionId,
          `Net commission ${retailerEffectivePct}% on txn #${transactionId} (operator ${operatorCommissionPct}% − admin ${adminEffectivePct}% − dist ${distributorEffectivePct}%)`
        );
      }

      if (distributorUserId && distributorAmount > 0) {
        const distWallet = await WalletModel.getByUserId(distributorUserId);
        if (distWallet) {
          await WalletModel.credit(
            distributorUserId,
            distributorAmount,
            'commission_override',
            transactionId,
            `Distributor override ${distributorEffectivePct}% of recharge for txn #${transactionId}`
          );
        }
      }

      if (adminAmount > 0 && ADMIN_USER_ID !== retailerUserId) {
        const adminWallet = await WalletModel.getByUserId(ADMIN_USER_ID);
        if (adminWallet) {
          await WalletModel.credit(
            ADMIN_USER_ID,
            adminAmount,
            'commission_override',
            transactionId,
            `Admin override ${adminEffectivePct}% of recharge for txn #${transactionId}`
          );
        }
      }

      const result = await db.prepare(`
        INSERT INTO commission_splits (
          transaction_id, retailer_user_id, retailer_commission_amount,
          distributor_user_id, distributor_share_pct, distributor_share_amount,
          admin_user_id, admin_share_pct, admin_share_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId, retailerUserId, retailerAmount,
        distributorUserId, distributorEffectivePct, distributorAmount,
        ADMIN_USER_ID, adminEffectivePct, adminAmount
      );
      return result.lastInsertRowid;
    });

    const splitId = await txn();
    return {
      retailerAmount, distributorAmount, adminAmount,
      retailerEffectivePct, distributorEffectivePct, adminEffectivePct,
      splitId,
    };
  },

  /**
   * Look up the split row for a given transaction (slice 6 will use this).
   */
  async findByTransactionId(transactionId) {
    return db.prepare('SELECT * FROM commission_splits WHERE transaction_id = ?').get(transactionId);
  },

  /**
   * Admin earnings list — page through commission_splits joined with users.
   */
  async list({ page = 1, limit = 50, from, to } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (from) { where += ' AND DATE(cs.created_at) >= ?'; params.push(from); }
    if (to)   { where += ' AND DATE(cs.created_at) <= ?'; params.push(to); }

    const rows = await db.prepare(`
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

    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM commission_splits cs ${where}`).get(...params);
    const sum = await db.prepare(`
      SELECT
        COALESCE(SUM(distributor_share_amount), 0) as distributor_total,
        COALESCE(SUM(admin_share_amount), 0) as admin_total,
        COALESCE(SUM(retailer_commission_amount), 0) as retailer_commission_total
      FROM commission_splits cs ${where}
    `).get(...params);

    return { rows, total: totalRow.c, sum, page, limit };
  },

  /**
   * Admin dashboard rollups — admin's own earnings over time windows.
   */
  async totals() {
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
