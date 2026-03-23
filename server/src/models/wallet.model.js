const db = require('../config/db');

const WalletModel = {
  getByUserId(userId) {
    return db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  },

  credit(userId, amount, referenceType, referenceId, description) {
    const txn = db.transaction(() => {
      const wallet = this.getByUserId(userId);
      if (!wallet) throw new Error('Wallet not found');

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      db.prepare('UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(balanceAfter, userId);

      db.prepare(`
        INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
        VALUES (?, ?, 'credit', ?, ?, ?, ?, ?, ?)
      `).run(wallet.id, userId, amount, balanceBefore, balanceAfter, referenceType, referenceId, description);

      return { balance: balanceAfter };
    });

    return txn();
  },

  debit(userId, amount, referenceType, referenceId, description) {
    const txn = db.transaction(() => {
      const wallet = this.getByUserId(userId);
      if (!wallet) throw new Error('Wallet not found');
      if (wallet.balance < amount) throw new Error('Insufficient balance');

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      db.prepare('UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(balanceAfter, userId);

      db.prepare(`
        INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
        VALUES (?, ?, 'debit', ?, ?, ?, ?, ?, ?)
      `).run(wallet.id, userId, amount, balanceBefore, balanceAfter, referenceType, referenceId, description);

      return { balance: balanceAfter };
    });

    return txn();
  },

  getTransactions(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const transactions = db.prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(userId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = ?').get(userId).count;
    return { transactions, total, page, limit };
  },

  getTotalBalanceByRole(role) {
    return db.prepare(`
      SELECT COALESCE(SUM(w.balance), 0) as total
      FROM wallets w JOIN users u ON w.user_id = u.id
      WHERE u.role = ?
    `).get(role).total;
  },
};

module.exports = WalletModel;
