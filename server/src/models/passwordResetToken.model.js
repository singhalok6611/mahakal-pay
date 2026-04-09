/**
 * PasswordResetToken — slice 7 forgot-password flow.
 *
 * Token strategy mirrors refreshToken.model: caller generates a long random
 * string, we store its bcrypt hash, the raw token only ever lives in the
 * email link. A DB leak alone cannot be replayed against /reset-password.
 *
 * Tokens are single-use (used_at set on consumption) and time-boxed
 * (default 1 hour from issue).
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

const TOKEN_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TTL_MIN || '60', 10);

function newRawToken() {
  // 48 bytes -> 64 url-safe base64 chars, plenty of entropy
  return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token) {
  return bcrypt.hashSync(token, 10);
}

const PasswordResetTokenModel = {
  TOKEN_TTL_MINUTES,

  /**
   * Issue a new reset token for a user. Returns { rawToken, expiresAt } —
   * the raw token must be included in the email link, never logged or
   * persisted in plain text.
   */
  create({ userId, ipAddress, userAgent }) {
    const rawToken = newRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);
    db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tokenHash, expiresAt.toISOString(), ipAddress || null, userAgent || null);
    return { rawToken, expiresAt };
  },

  /**
   * Look up a still-valid token row by raw token. Walks the user's recent
   * unused tokens and bcrypt-compares each — same trick refreshToken.model
   * uses since we can't index on a hash.
   */
  findValidByRawToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const candidates = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC
      LIMIT 200
    `).all();
    for (const row of candidates) {
      try {
        if (bcrypt.compareSync(rawToken, row.token_hash)) return row;
      } catch {}
    }
    return null;
  },

  markUsed(id) {
    db.prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },

  // Invalidate every outstanding reset token for a user (used after a
  // successful password change so an old link can never be replayed).
  invalidateAllForUser(userId) {
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND used_at IS NULL
    `).run(userId);
  },
};

module.exports = PasswordResetTokenModel;
