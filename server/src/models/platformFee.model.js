const db = require('../config/db');
const WalletModel = require('./wallet.model');

const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);
const DEFAULT_FEE_PCT = parseFloat(process.env.PLATFORM_FEE_PCT || '1.0');

async function getFeePct() {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'platform_fee_pct'").get();
    if (row && row.value) return parseFloat(row.value);
  } catch {}
  return DEFAULT_FEE_PCT;
}

const PlatformFeeModel = {
  ADMIN_USER_ID,

  getFeePct,

  /**
   * Apply 1% platform fee on a base amount and credit it to admin wallet.
   * Returns { feeAmount, feePct }. The fee is recorded in platform_fees + wallet_transactions.
   */
  async apply({ userId, sourceType, sourceId, baseAmount }) {
    const feePct = await getFeePct();
    const feeAmount = Math.round(((baseAmount * feePct) / 100) * 100) / 100; // 2 decimals
    if (feeAmount <= 0) return { feeAmount: 0, feePct };

    // Don't charge admin themselves
    if (userId === ADMIN_USER_ID) return { feeAmount: 0, feePct };

    // Credit admin wallet (if exists)
    const adminWallet = await WalletModel.getByUserId(ADMIN_USER_ID);
    if (adminWallet) {
      await WalletModel.credit(
        ADMIN_USER_ID,
        feeAmount,
        'platform_fee',
        sourceId,
        `Platform fee ${feePct}% from ${sourceType} #${sourceId} (user ${userId})`
      );
    }

    await db.prepare(`
      INSERT INTO platform_fees (user_id, source_type, source_id, base_amount, fee_pct, fee_amount, admin_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, sourceType, sourceId, baseAmount, feePct, feeAmount, ADMIN_USER_ID);

    return { feeAmount, feePct };
  },

  async list({ page = 1, limit = 50, from, to } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (from) { where += ' AND DATE(pf.created_at) >= ?'; params.push(from); }
    if (to)   { where += ' AND DATE(pf.created_at) <= ?'; params.push(to); }

    const rows = await db.prepare(`
      SELECT pf.*, u.name as user_name, u.role as user_role
      FROM platform_fees pf JOIN users u ON pf.user_id = u.id
      ${where} ORDER BY pf.id DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM platform_fees pf ${where}`).get(...params);
    const sumRow = await db.prepare(`SELECT COALESCE(SUM(fee_amount), 0) as s FROM platform_fees pf ${where}`).get(...params);
    return { rows, total: totalRow.c, sum: sumRow.s, page, limit };
  },

  async totals() {
    return db.prepare(`
      SELECT
        COALESCE(SUM(fee_amount), 0) as total_lifetime,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN fee_amount ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN fee_amount ELSE 0 END), 0) as last_7_days,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN fee_amount ELSE 0 END), 0) as this_month,
        COUNT(*) as count
      FROM platform_fees
    `).get();
  },
};

module.exports = PlatformFeeModel;
