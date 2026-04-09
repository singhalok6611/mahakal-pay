/**
 * WithdrawalModel — slice 4 wallet → bank/UPI payout flow.
 *
 * Lifecycle:
 *   pending  -> admin approves -> debits wallet, marks 'processed'
 *            -> admin rejects  -> 'rejected' (no wallet movement)
 *
 * In a real BBPS platform, approve would queue an upstream payout API call
 * and the row would only flip to 'processed' once the payout returns
 * success. For now we collapse approve+settle into one step — easy to
 * insert the upstream call between WalletModel.debit and the status flip.
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
   * Approve a withdrawal: debit the user's wallet, mark as processed,
   * stamp processed_by + processed_at. All in one DB transaction so
   * either everything happens or nothing does.
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
      // 1. Debit user wallet
      await WalletModel.debit(
        w.user_id,
        w.amount,
        'withdrawal',
        id,
        `Withdrawal #${id} ${w.method === 'bank' ? `to ${w.bank_name || ''} ${w.bank_account_number || ''}`.trim() : `to UPI ${w.upi_id || ''}`}`
      );
      // 2. Flip status to processed
      await db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'processed',
            admin_remarks = ?,
            processed_by = ?,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(remarks || null, adminUserId, id);
    });
    await txn();
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
