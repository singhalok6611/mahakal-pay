const bcrypt = require('bcryptjs');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../config/jwt');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const PasswordResetTokenModel = require('../models/passwordResetToken.model');
const emailService = require('../services/email.service');
const db = require('../config/db');

const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
// Generic message used for both forgot-password success and "email not
// found" — we MUST NOT leak whether an account exists for a given email,
// since that turns the endpoint into an email enumeration oracle.
const FORGOT_GENERIC_MSG = 'If an account exists for that email, a password reset link has been sent. Check your inbox.';

function issueTokens(user, req) {
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const { token: refreshToken } = signRefreshToken({ id: user.id, role: user.role });
  RefreshTokenModel.create({
    userId: user.id,
    token: refreshToken,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return { accessToken, refreshToken };
}

const AuthController = {
  login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is ' + user.status });
    }
    // Block login until admin has approved the account (retailers created by
    // a distributor sit in pending_approval until the admin acts on them).
    if (user.approval_status && user.approval_status !== 'approved') {
      return res.status(403).json({
        error: user.approval_status === 'pending_approval'
          ? 'Your account is pending admin approval'
          : 'Your account approval was rejected. Contact your distributor.',
        approval_status: user.approval_status,
      });
    }

    const { accessToken, refreshToken } = issueTokens(user, req);
    const wallet = WalletModel.getByUserId(user.id);

    res.json({
      // `token` kept for backwards compatibility with old client builds
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        pan: user.pan,
        role: user.role,
        status: user.status,
        kyc_status: user.kyc_status,
        approval_status: user.approval_status,
      },
      balance: wallet ? wallet.balance : 0,
    });
  },

  refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const stored = RefreshTokenModel.findValidByToken(refreshToken);
    if (!stored) {
      // Token reuse / revoked / unknown — kill all sessions for this user as a safety measure
      if (payload && payload.id) {
        RefreshTokenModel.revokeAllForUser(payload.id);
      }
      return res.status(401).json({ error: 'Refresh token not recognized' });
    }

    const user = UserModel.findById(payload.id);
    if (!user || user.status !== 'active') {
      RefreshTokenModel.revokeById(stored.id);
      return res.status(401).json({ error: 'User no longer active' });
    }

    // Rotate: issue new pair, mark old as revoked + replaced
    const { accessToken, refreshToken: newRefreshToken } = issueTokens(user, req);
    const newStored = RefreshTokenModel.findValidByToken(newRefreshToken);
    RefreshTokenModel.revokeById(stored.id, newStored ? newStored.id : null);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      token: accessToken, // legacy alias
    });
  },

  logout(req, res) {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      RefreshTokenModel.revokeByToken(refreshToken);
    }
    res.json({ message: 'Logged out' });
  },

  logoutAll(req, res) {
    if (req.user && req.user.id) {
      RefreshTokenModel.revokeAllForUser(req.user.id);
    }
    res.json({ message: 'Logged out from all devices' });
  },

  me(req, res) {
    const user = UserModel.findById(req.user.id);
    const wallet = WalletModel.getByUserId(req.user.id);
    res.json({
      user,
      balance: wallet ? wallet.balance : 0,
    });
  },

  // ---------- Slice 7: forgot password / reset password ----------

  async forgotPassword(req, res) {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always respond with the same generic message regardless of whether
    // the email exists, to avoid email enumeration. The actual email send
    // only happens for real users.
    const user = UserModel.findByEmail(email);
    if (user && user.status === 'active' && (!user.approval_status || user.approval_status === 'approved')) {
      try {
        const { rawToken } = PasswordResetTokenModel.create({
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        const resetLink = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
        // Fire-and-forget: a failed email must NOT change the response
        // shape (otherwise it leaks). Errors are logged inside email.service.
        emailService.sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetLink,
        }).catch((err) => console.error('[forgotPassword] email send failed:', err.message));
      } catch (err) {
        console.error('[forgotPassword] token create failed:', err.message);
      }
    }

    return res.json({ message: FORGOT_GENERIC_MSG });
  },

  resetPassword(req, res) {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const row = PasswordResetTokenModel.findValidByRawToken(token);
    if (!row) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    const user = UserModel.findById(row.user_id);
    if (!user || user.status !== 'active') {
      // Burn the token regardless so it can't be retried later.
      PasswordResetTokenModel.markUsed(row.id);
      return res.status(400).json({ error: 'Account is not available for reset' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newHash, user.id);

    // Burn this token, every other outstanding reset token for the user,
    // and every active refresh token — anyone who already had a session
    // is forced to log in again with the new password.
    PasswordResetTokenModel.markUsed(row.id);
    PasswordResetTokenModel.invalidateAllForUser(user.id);
    try { RefreshTokenModel.revokeAllForUser(user.id); } catch {}

    res.json({ message: 'Password reset successful. Please log in with your new password.' });
  },

  changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const user = UserModel.findByEmail(req.user.email);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const fullUser = require('../config/db').prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = bcrypt.compareSync(currentPassword, fullUser.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    require('../config/db').prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);

    // Force re-login on all devices after password change
    RefreshTokenModel.revokeAllForUser(req.user.id);

    res.json({ message: 'Password changed successfully. Please log in again.' });
  },
};

module.exports = AuthController;
