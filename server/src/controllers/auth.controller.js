const bcrypt = require('bcryptjs');
const { signToken } = require('../config/jwt');
const UserModel = require('../models/user.model');
const WalletModel = require('../models/wallet.model');

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

    const token = signToken({ id: user.id, role: user.role });
    const wallet = WalletModel.getByUserId(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        kyc_status: user.kyc_status,
      },
      balance: wallet ? wallet.balance : 0,
    });
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

    res.json({ message: 'Password changed successfully' });
  },
};

module.exports = AuthController;
