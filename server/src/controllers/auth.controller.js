const bcrypt = require('bcryptjs');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../config/jwt');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');
const RefreshTokenModel = require('../models/refreshToken.model');

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
