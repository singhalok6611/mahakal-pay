/**
 * notify.service — slice 5 thin wrapper that owns the "fire a notification
 * to the admin on every retailer/distributor event" rule. Centralising it
 * here means controllers don't need to know which channels exist (in-app,
 * email, push) — they just call notify.recharge(...), notify.withdrawal(...),
 * etc., and this module fans out.
 *
 * Today: in-app only. Tomorrow: email/push can be added in one place.
 *
 * All calls are wrapped in try/catch — a failed notification must NEVER
 * break the underlying business operation (e.g. a recharge that succeeded
 * but where the notification insert failed should still return success).
 */

const NotificationModel = require('../models/notification.model');

const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);

function safeFire(fn) {
  try { fn(); } catch (err) {
    console.error('[notify] fire failed:', err.message);
  }
}

const notify = {
  // Recharge attempt by a retailer (success or failed). Admin always gets
  // notified — failed txns surface in the failed transactions page anyway,
  // but the notification gives a quick at-a-glance alert.
  recharge({ retailerName, retailerId, txnId, amount, status, service, operator, subscriberId }) {
    safeFire(() => {
      const ok = status === 'success';
      NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: ok ? 'recharge_success' : 'recharge_failed',
        title: ok ? `Recharge ₹${amount} ${service}` : `Failed recharge ₹${amount} ${service}`,
        message: `${retailerName} (#${retailerId}) ${ok ? 'completed' : 'failed'} a ${operator} recharge to ${subscriberId} for ₹${amount}.`,
        reference_type: 'transaction',
        reference_id: txnId,
      });
    });
  },

  // Wallet → wallet transfer initiated by retailer / distributor / admin.
  walletTransfer({ fromName, fromId, toName, toId, amount, direction }) {
    safeFire(() => {
      NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'wallet_transfer',
        title: `Wallet transfer ₹${amount}`,
        message: `${fromName} (#${fromId}) ${direction || 'transferred'} ₹${amount} to ${toName} (#${toId}).`,
        reference_type: 'wallet_transfer',
        reference_id: toId,
      });
    });
  },

  // New withdrawal request created by a retailer or distributor.
  withdrawalCreated({ userName, userId, withdrawalId, amount, method }) {
    safeFire(() => {
      NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'withdrawal_request',
        title: `Withdrawal request ₹${amount}`,
        message: `${userName} (#${userId}) requested a ${method} withdrawal of ₹${amount}. Awaiting your approval.`,
        reference_type: 'withdrawal',
        reference_id: withdrawalId,
      });
    });
  },

  // Float-coverage drop — Pay2All master can no longer back the
  // outstanding internal wallets. Fired by the recharge path.
  // Debounced via the settings table so we don't spam the admin
  // (one notification per critical event per 6 hours).
  lowFloat({ pay2allBalance, internalTotal, coveragePct, deltaInr }) {
    safeFire(() => {
      const db = require('../config/db');
      const last = db.prepare("SELECT value FROM settings WHERE key = 'last_low_float_alert_at'").get();
      const now = Date.now();
      if (last && last.value && (now - parseInt(last.value, 10)) < 6 * 60 * 60 * 1000) {
        return; // debounced
      }
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_low_float_alert_at', ?, CURRENT_TIMESTAMP)")
        .run(String(now));

      NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'low_float',
        title: `LOW FLOAT — Pay2All ₹${pay2allBalance}`,
        message:
          `Pay2All master is ₹${pay2allBalance.toFixed(2)} but internal wallets total ₹${internalTotal.toFixed(2)} ` +
          `(coverage ${coveragePct.toFixed(1)}%, delta ₹${deltaInr.toFixed(2)}). ` +
          'Top up the Pay2All master immediately or recharges will start failing.',
        reference_type: 'float_health',
        reference_id: null,
      });
    });
  },

  // Admin suspended a user — log it as a notification too so the activity
  // shows up in the bell history.
  suspension({ userName, userId, role, sweptAmount }) {
    safeFire(() => {
      NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'user_suspended',
        title: `Suspended ${role} ${userName}`,
        message: sweptAmount > 0
          ? `${userName} (#${userId}) suspended. ₹${sweptAmount} swept to admin wallet.`
          : `${userName} (#${userId}) suspended. No wallet balance to sweep.`,
        reference_type: 'user',
        reference_id: userId,
      });
    });
  },
};

module.exports = notify;
