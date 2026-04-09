const db = require('../config/db');
const { hashToken, REFRESH_EXPIRES_MS } = require('../config/jwt');

const RefreshTokenModel = {
  async create({ userId, token, userAgent, ipAddress }) {
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
    const result = await db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tokenHash, userAgent || null, ipAddress || null, expiresAt);
    return { id: result.lastInsertRowid, tokenHash, expiresAt };
  },

  async findValidByToken(token) {
    const tokenHash = hashToken(token);
    return db.prepare(`
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND revoked = 0 AND expires_at > CURRENT_TIMESTAMP
    `).get(tokenHash);
  },

  async revokeById(id, replacedBy = null) {
    await db.prepare('UPDATE refresh_tokens SET revoked = 1, replaced_by = ? WHERE id = ?')
      .run(replacedBy, id);
  },

  async revokeByToken(token) {
    const tokenHash = hashToken(token);
    await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
  },

  async revokeAllForUser(userId) {
    await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0').run(userId);
  },

  async cleanupExpired() {
    await db.prepare('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked = 1').run();
  },
};

module.exports = RefreshTokenModel;
