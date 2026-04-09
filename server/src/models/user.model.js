const db = require('../config/db');

// Columns we want to expose by default. Includes the slice-1 fields
// (pan, approval_status). Password hash is intentionally excluded.
const PUBLIC_COLUMNS = `
  id, parent_id, role, name, email, phone, pan,
  shop_name, address, city, state, pincode,
  status, kyc_status, approval_status,
  created_at, updated_at
`;

const UserModel = {
  async findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  async findById(id) {
    return db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
  },

  async findByPhone(phone) {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  },

  async findByPan(pan) {
    if (!pan) return undefined;
    return db.prepare('SELECT id, role, name, email, phone, pan FROM users WHERE pan = ?').get(pan);
  },

  async create({ parent_id, role, name, email, phone, pan, password_hash, shop_name, address, city, state, pincode, approval_status }) {
    const result = await db.prepare(`
      INSERT INTO users (parent_id, role, name, email, phone, pan, password_hash, shop_name, address, city, state, pincode, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parent_id, role, name, email, phone, pan, password_hash,
      shop_name, address, city, state, pincode,
      approval_status || 'approved'
    );

    // Create wallet for the new user
    await db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, 0)').run(result.lastInsertRowid);

    return this.findById(result.lastInsertRowid);
  },

  async updateStatus(id, status) {
    await db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    return this.findById(id);
  },

  async setApprovalStatus(id, approval_status) {
    await db.prepare('UPDATE users SET approval_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(approval_status, id);
    return this.findById(id);
  },

  async update(id, fields) {
    const allowed = ['name', 'phone', 'pan', 'shop_name', 'address', 'city', 'state', 'pincode', 'status'];
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
    await db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  async listByRole(role, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE role = ? ORDER BY id DESC LIMIT ? OFFSET ?`).all(role, limit, offset);
    const totalRow = await db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role);
    return { users, total: totalRow.count, page, limit };
  },

  async listByParent(parentId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE parent_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`).all(parentId, limit, offset);
    const totalRow = await db.prepare('SELECT COUNT(*) as count FROM users WHERE parent_id = ?').get(parentId);
    return { users, total: totalRow.count, page, limit };
  },

  // Retailers created by distributors that are still waiting on admin approval.
  // Joins distributor (parent) name so the admin queue can show "from <distributor>".
  async listPendingRetailers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = await db.prepare(`
      SELECT u.id, u.parent_id, u.role, u.name, u.email, u.phone, u.pan,
             u.shop_name, u.city, u.status, u.kyc_status, u.approval_status,
             u.created_at,
             d.name AS distributor_name, d.phone AS distributor_phone
      FROM users u
      LEFT JOIN users d ON d.id = u.parent_id
      WHERE u.role = 'retailer' AND u.approval_status = 'pending_approval'
      ORDER BY u.id DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    const totalRow = await db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'retailer' AND approval_status = 'pending_approval'"
    ).get();
    return { users, total: totalRow.count, page, limit };
  },

  async countByRole() {
    return db.prepare("SELECT role, COUNT(*) as count FROM users WHERE role != 'admin' GROUP BY role").all();
  },
};

module.exports = UserModel;
