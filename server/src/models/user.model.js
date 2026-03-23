const db = require('../config/db');

const UserModel = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare('SELECT id, parent_id, role, name, email, phone, shop_name, address, city, state, pincode, status, kyc_status, created_at FROM users WHERE id = ?').get(id);
  },

  findByPhone(phone) {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  },

  create({ parent_id, role, name, email, phone, password_hash, shop_name, address, city, state, pincode }) {
    const stmt = db.prepare(`
      INSERT INTO users (parent_id, role, name, email, phone, password_hash, shop_name, address, city, state, pincode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(parent_id, role, name, email, phone, password_hash, shop_name, address, city, state, pincode);

    // Create wallet for the new user
    db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, 0)').run(result.lastInsertRowid);

    return this.findById(result.lastInsertRowid);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    return this.findById(id);
  },

  update(id, fields) {
    const allowed = ['name', 'phone', 'shop_name', 'address', 'city', 'state', 'pincode', 'status'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return this.findById(id);
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  listByRole(role, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = db.prepare('SELECT id, parent_id, role, name, email, phone, shop_name, city, status, kyc_status, created_at FROM users WHERE role = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(role, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role).count;
    return { users, total, page, limit };
  },

  listByParent(parentId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = db.prepare('SELECT id, parent_id, role, name, email, phone, shop_name, city, status, kyc_status, created_at FROM users WHERE parent_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(parentId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM users WHERE parent_id = ?').get(parentId).count;
    return { users, total, page, limit };
  },

  countByRole() {
    return db.prepare("SELECT role, COUNT(*) as count FROM users WHERE role != 'admin' GROUP BY role").all();
  },
};

module.exports = UserModel;
