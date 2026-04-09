/**
 * WithdrawalModel — wallet → bank/UPI payout flow.
 *
 * Two-step lifecycle (post-slice 6, with payout reference workflow):
 *   pending  -> admin approves   -> 'approved'  (wallet debited; money is now in platform escrow)
 *   approved -> admin marks paid -> 'processed' (admin enters bank_reference/UTR after the real bank/UPI transfer)
 *   pending  -> admin rejects    -> 'rejected'  (no wallet movement)
 *
 * Why two steps: today the admin pays out manually from their bank
 * account. Splitting "approve" from "mark paid" means:
 *   1. The wallet debit happens immediately on approve (so the user can't
 *      double-spend that money while the admin is doing the bank transfer)
 *   2. The row only reaches 'processed' once the admin records the actual
 *      bank UTR / transaction reference, giving us a tracable audit trail.
 *
 * When we eventually wire a real payout API (Razorpay X / Cashfree /
 * Pay2All payouts), the markPaid() step is where the upstream call goes,
 * and the bank_reference becomes whatever id that provider returns.
 */

const db = require('../config/db');
const WalletModel = require('./wallet.model');

const WithdrawalModel = {
  async create({ user_id, amount, method, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id }) {
    const result = await db.prepare(`
      INSERT INTO withdrawal_requests (
        user_id, amount, method,
        bank_account_name, bank_account_number, bank_ifsc, bank_name,
        upi_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      user_id, amount, method,
      bank_account_name || null, bank_account_number || null, bank_ifsc || null, bank_name || null,
      upi_id || null
    );
    return this.findById(result.lastInsertRowid);
  },

  async findById(id) {
    return db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id);
  },

  /**
   * List withdrawals — admin view (joined with user name for the queue).
   */
  async listAll({ status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND w.status = ?';
      params.push(status);
    }
    const rows = await db.prepare(`
      SELECT w.*, u.name as user_name, u.phone as user_phone, u.role as user_role
      FROM withdrawal_requests w
      JOIN users u ON u.id = w.user_id
      ${where}
      ORDER BY w.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM withdrawal_requests w ${where}`).get(...params);
    return { rows, total: totalRow.c, page, limit };
  },

  /**
   * List withdrawals owned by a single user (their own history).
   */
  async listByUser(user_id, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const rows = await db.prepare(`
      SELECT * FROM withdrawal_requests
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(user_id, limit, offset);
    const totalRow = await db.prepare('SELECT COUNT(*) as c FROM withdrawal_requests WHERE user_id = ?').get(user_id);
    return { rows, total: totalRow.c, page, limit };
  },

  /**
   * Approve a withdrawal: debit the user's wallet (money goes into
   * platform escrow), flip status to 'approved'. The actual outbound
   * bank/UPI payout happens later in markPaid().
   */
  async approve(id, adminUserId, remarks) {
    const w = await this.findById(id);
    if (!w) throw new Error('Withdrawal not found');
    if (w.status !== 'pending') throw new Error(`Cannot approve a ${w.status} withdrawal`);

    const wallet = await WalletModel.getByUserId(w.user_id);
    if (!wallet) throw new Error('User wallet not found');
    if (wallet.balance < w.amount) {
      throw new Error(`Insufficient wallet balance (₹${wallet.balance.toFixed(2)} < ₹${w.amount.toFixed(2)})`);
    }

    const txn = db.transaction(async () => {
      // 1. Debit user wallet — money is now in platform escrow.
      await WalletModel.debit(
        w.user_id,
        w.amount,
        'withdrawal',
        id,
        `Withdrawal #${id} ${w.method === 'bank' ? `to ${w.bank_name || ''} ${w.bank_account_number || ''}`.trim() : `to UPI ${w.upi_id || ''}`}`
      );
      // 2. Flip status to approved (NOT processed — that's the next step).
      await db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'approved',
            admin_remarks = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(remarks || null, id);
    });
    await txn();
    return this.findById(id);
  },

  /**
   * Mark an approved withdrawal as actually paid out. Admin records the
   * UTR / bank transaction reference of the real outbound transfer they
   * just made from their bank/UPI app. Required: bankReference.
   *
   * Wallet has already been debited at the approve step, so this is
   * purely a metadata + status flip.
   */
  async markPaid(id, adminUserId, bankReference, remarks) {
    if (!bankReference || typeof bankReference !== 'string' || !bankReference.trim()) {
      throw new Error('bank_reference (UTR / transaction id) is required');
    }
    const w = await this.findById(id);
    if (!w) throw new Error('Withdrawal not found');
    if (w.status !== 'approved') {
      throw new Error(`Cannot mark a ${w.status} withdrawal as paid (must be approved first)`);
    }

    await db.prepare(`
      UPDATE withdrawal_requests
      SET status = 'processed',
          bank_reference = ?,
          admin_remarks = COALESCE(?, admin_remarks),
          processed_by = ?,
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bankReference.trim(), remarks || null, adminUserId, id);
    return this.findById(id);
  },

  async reject(id, adminUserId, remarks) {
    const w = await this.findById(id);
    if (!w) throw new Error('Withdrawal not found');
    if (w.status !== 'pending') throw new Error(`Cannot reject a ${w.status} withdrawal`);

    await db.prepare(`
      UPDATE withdrawal_requests
      SET status = 'rejected',
          admin_remarks = ?,
          processed_by = ?,
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(remarks || null, adminUserId, id);
    return this.findById(id);
  },
};

module.exports = WithdrawalModel;
