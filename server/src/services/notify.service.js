/**
 * notify.service — owns the "fan out a notification on every business
 * event" rule. Centralising it means controllers don't need to know
 * which channels exist (in-app bell, email, push) — they just call
 * notify.recharge(...), notify.welcomeUser(...), etc., and this module
 * decides where to send.
 *
 * Channels today:
 *   - in-app  (NotificationModel — admin notifications inbox + bell icon)
 *   - email   (Brevo SMTP via email.service — mock-fallback when creds blank)
 *
 * All fires are wrapped in try/catch + best-effort: a failed
 * notification or email must NEVER break the underlying business
 * operation. The controller just calls notify.x() and moves on.
 */

const NotificationModel = require('../models/notification.model');
const emailService = require('./email.service');
const db = require('../config/db');

const ADMIN_USER_ID = parseInt(process.env.PLATFORM_ADMIN_ID || '1', 10);
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

// Fire-and-forget: dispatches fn as a microtask, supports async fns,
// catches any thrown error or rejected Promise so a notification failure
// can never break the underlying business operation.
function safeFire(fn) {
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      console.error('[notify] fire failed:', err && err.message);
    });
}

// Best-effort: get the admin's email so we can send them mail too.
// Cached for the life of the process — admin email rarely changes.
let _cachedAdminEmail = null;
async function getAdminEmail() {
  if (_cachedAdminEmail) return _cachedAdminEmail;
  try {
    const row = await db.prepare('SELECT email FROM users WHERE id = ?').get(ADMIN_USER_ID);
    if (row && row.email) _cachedAdminEmail = row.email;
  } catch {}
  return _cachedAdminEmail;
}

function sendMailAsync(opts) {
  // Fire-and-forget — never await, never block
  emailService.send(opts).catch((e) => {
    console.error('[notify.email] send failed:', e.message);
  });
}

// ----- Tiny HTML helpers so each notification has consistent styling -----
function emailShell(title, bodyHtml, ctaUrl, ctaLabel) {
  return `
  <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333;">
    <div style="background:linear-gradient(135deg,#0d1b4a 0%,#1a237e 50%,#4a148c 100%);padding:18px 22px;border-radius:12px 12px 0 0;color:#fff;">
      <h2 style="margin:0;font-size:1.25rem;">${escapeHtml(title)}</h2>
    </div>
    <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:24px 22px;">
      ${bodyHtml}
      ${ctaUrl ? `<p style="margin:24px 0 0;"><a href="${ctaUrl}" style="background:#ffc107;color:#1a237e;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">${escapeHtml(ctaLabel || 'Open Mahakal Pay')}</a></p>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:22px 0 12px;">
      <p style="color:#888;font-size:12px;margin:0;">Mahakal Pay · noreply@mahakalpay.in</p>
    </div>
  </div>`;
}
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

const notify = {
  // ─────────────────────────────────────────────────────────────
  // Welcome new user (called from admin createDistributor /
  // createRetailer + distributor createRetailer). Includes the
  // login URL so they can click straight in.
  // ─────────────────────────────────────────────────────────────
  welcomeUser({ user, plainPassword, createdByName }) {
    if (!user || !user.email) return;
    safeFire(() => {
      const subject = `Welcome to Mahakal Pay — your ${user.role} account is ready`;
      const text = [
        `Hi ${user.name || ''},`, '',
        `Your Mahakal Pay ${user.role} account has been created${createdByName ? ` by ${createdByName}` : ''}.`,
        '',
        `Login email:    ${user.email}`,
        plainPassword ? `Login password: ${plainPassword}` : '',
        '',
        `Sign in here:   ${APP_URL}/login`,
        '',
        'Please change your password after the first login.',
        '',
        '— Mahakal Pay',
      ].filter(Boolean).join('\n');
      const html = emailShell(
        `Welcome, ${escapeHtml(user.name)}`,
        `<p>Your Mahakal Pay <strong>${escapeHtml(user.role)}</strong> account has been created${createdByName ? ` by <strong>${escapeHtml(createdByName)}</strong>` : ''}.</p>
         <table style="margin:14px 0;border-collapse:collapse;font-size:14px;">
           <tr><td style="padding:6px 12px 6px 0;color:#888;">Login email</td><td style="padding:6px 0;"><strong>${escapeHtml(user.email)}</strong></td></tr>
           ${plainPassword ? `<tr><td style="padding:6px 12px 6px 0;color:#888;">Login password</td><td style="padding:6px 0;"><code style="background:#f4f4f7;padding:3px 8px;border-radius:6px;">${escapeHtml(plainPassword)}</code></td></tr>` : ''}
           ${user.role === 'retailer' && user.approval_status === 'pending_approval'
             ? '<tr><td colspan="2" style="padding:10px 0 0;color:#d97706;font-size:13px;">⚠ Your account is currently <strong>pending admin approval</strong>. You will be notified once it is approved.</td></tr>'
             : ''}
         </table>
         <p style="font-size:13px;color:#666;">Please change your password after the first login.</p>`,
        `${APP_URL}/login`,
        'Sign In'
      );
      sendMailAsync({ to: user.email, subject, text, html });
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Retailer created by distributor — notify admin to approve
  // ─────────────────────────────────────────────────────────────
  retailerPendingApproval({ retailer, distributor }) {
    safeFire(async () => {
      await NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'retailer_pending',
        title: `New retailer pending approval: ${retailer.name}`,
        message: `${distributor?.name || 'A distributor'} added retailer ${retailer.name} (${retailer.email}). PAN ${retailer.pan}. Approve or reject from the Retailer Approvals page.`,
        reference_type: 'user',
        reference_id: retailer.id,
      });
      const adminEmail = await getAdminEmail();
      if (adminEmail) {
        const subject = `New retailer pending approval: ${retailer.name}`;
        const html = emailShell(
          'New retailer pending approval',
          `<p><strong>${escapeHtml(distributor?.name || 'A distributor')}</strong> just added a new retailer:</p>
           <table style="margin:14px 0;border-collapse:collapse;font-size:14px;">
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Name</td><td style="padding:6px 0;"><strong>${escapeHtml(retailer.name)}</strong></td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Email</td><td style="padding:6px 0;">${escapeHtml(retailer.email)}</td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Phone</td><td style="padding:6px 0;">${escapeHtml(retailer.phone)}</td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">PAN</td><td style="padding:6px 0;"><code>${escapeHtml(retailer.pan)}</code></td></tr>
           </table>
           <p>The retailer cannot log in until you approve them.</p>`,
          `${APP_URL}/admin/users/retailer-approvals`,
          'Review Approvals'
        );
        sendMailAsync({ to: adminEmail, subject, html, text: subject });
      }
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Admin approved a retailer — let them know they can log in
  // ─────────────────────────────────────────────────────────────
  retailerApproved({ retailer }) {
    if (!retailer || !retailer.email) return;
    safeFire(() => {
      const subject = 'Your Mahakal Pay account has been approved';
      const html = emailShell(
        'You\'re approved 🎉',
        `<p>Hi <strong>${escapeHtml(retailer.name)}</strong>,</p>
         <p>Your Mahakal Pay retailer account has been approved by the admin. You can sign in now and start serving customers.</p>`,
        `${APP_URL}/login`,
        'Sign In'
      );
      sendMailAsync({ to: retailer.email, subject, html, text: subject });
    });
  },

  // Admin rejected a retailer — give them a clear message
  retailerRejected({ retailer }) {
    if (!retailer || !retailer.email) return;
    safeFire(() => {
      const subject = 'Your Mahakal Pay account application was not approved';
      const html = emailShell(
        'Application not approved',
        `<p>Hi <strong>${escapeHtml(retailer.name)}</strong>,</p>
         <p>Unfortunately your Mahakal Pay retailer application was not approved at this time.</p>
         <p>Please contact your distributor or write to <a href="mailto:info@mahakalpay.in">info@mahakalpay.in</a> for more information.</p>`,
        null, null
      );
      sendMailAsync({ to: retailer.email, subject, html, text: subject });
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Recharge attempt by a retailer — admin in-app notification
  // (no email by default to avoid inbox flood; failures could be
  // emailed if we want, but routine successes shouldn't be)
  // ─────────────────────────────────────────────────────────────
  recharge({ retailerName, retailerId, txnId, amount, status, service, operator, subscriberId }) {
    safeFire(async () => {
      const ok = status === 'success';
      await NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: ok ? 'recharge_success' : 'recharge_failed',
        title: ok ? `Recharge ₹${amount} ${service}` : `Failed recharge ₹${amount} ${service}`,
        message: `${retailerName} (#${retailerId}) ${ok ? 'completed' : 'failed'} a ${operator} recharge to ${subscriberId} for ₹${amount}.`,
        reference_type: 'transaction',
        reference_id: txnId,
      });
    });
  },

  // Wallet → wallet transfer — admin in-app notification
  walletTransfer({ fromName, fromId, toName, toId, amount, direction }) {
    safeFire(async () => {
      await NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'wallet_transfer',
        title: `Wallet transfer ₹${amount}`,
        message: `${fromName} (#${fromId}) ${direction || 'transferred'} ₹${amount} to ${toName} (#${toId}).`,
        reference_type: 'wallet_transfer',
        reference_id: toId,
      });
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Withdrawal request created — admin gets in-app + email
  // ─────────────────────────────────────────────────────────────
  withdrawalCreated({ userName, userId, userEmail, withdrawalId, amount, method }) {
    safeFire(async () => {
      await NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'withdrawal_request',
        title: `Withdrawal request ₹${amount}`,
        message: `${userName} (#${userId}) requested a ${method} withdrawal of ₹${amount}. Awaiting your approval.`,
        reference_type: 'withdrawal',
        reference_id: withdrawalId,
      });
      const adminEmail = await getAdminEmail();
      if (adminEmail) {
        const subject = `Withdrawal request ₹${amount} from ${userName}`;
        const html = emailShell(
          `Withdrawal request — ${fmt(amount)}`,
          `<p><strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail || `#${userId}`)}) submitted a <strong>${escapeHtml(method)}</strong> withdrawal request of <strong>${fmt(amount)}</strong>.</p>
           <p>Approve or reject from the admin withdrawals page.</p>`,
          `${APP_URL}/admin/withdrawals`,
          'Open Withdrawals'
        );
        sendMailAsync({ to: adminEmail, subject, html, text: subject });
      }
    });
  },

  // Withdrawal approved → email the user
  withdrawalApproved({ user, withdrawal }) {
    if (!user || !user.email) return;
    safeFire(() => {
      const subject = `Your withdrawal of ₹${withdrawal.amount} has been processed`;
      const html = emailShell(
        `Withdrawal processed — ${fmt(withdrawal.amount)}`,
        `<p>Hi <strong>${escapeHtml(user.name)}</strong>,</p>
         <p>Your withdrawal request of <strong>${fmt(withdrawal.amount)}</strong> has been approved and processed.
         The funds should reach your ${withdrawal.method === 'bank' ? 'bank account' : 'UPI ID'} shortly.</p>
         <table style="margin:14px 0;border-collapse:collapse;font-size:14px;">
           <tr><td style="padding:6px 12px 6px 0;color:#888;">Method</td><td style="padding:6px 0;">${escapeHtml(withdrawal.method)}</td></tr>
           ${withdrawal.method === 'bank'
             ? `<tr><td style="padding:6px 12px 6px 0;color:#888;">Account</td><td style="padding:6px 0;"><code>${escapeHtml(withdrawal.bank_account_number || '')}</code></td></tr>
                <tr><td style="padding:6px 12px 6px 0;color:#888;">IFSC</td><td style="padding:6px 0;"><code>${escapeHtml(withdrawal.bank_ifsc || '')}</code></td></tr>`
             : `<tr><td style="padding:6px 12px 6px 0;color:#888;">UPI ID</td><td style="padding:6px 0;"><code>${escapeHtml(withdrawal.upi_id || '')}</code></td></tr>`}
         </table>`,
        `${APP_URL}/${user.role}`,
        'Open Mahakal Pay'
      );
      sendMailAsync({ to: user.email, subject, html, text: subject });
    });
  },

  // Withdrawal rejected → email the user
  withdrawalRejected({ user, withdrawal, remarks }) {
    if (!user || !user.email) return;
    safeFire(() => {
      const subject = `Your withdrawal of ₹${withdrawal.amount} was not approved`;
      const html = emailShell(
        `Withdrawal rejected — ${fmt(withdrawal.amount)}`,
        `<p>Hi <strong>${escapeHtml(user.name)}</strong>,</p>
         <p>Your withdrawal request of <strong>${fmt(withdrawal.amount)}</strong> was rejected by the admin.</p>
         ${remarks ? `<p><strong>Reason:</strong> ${escapeHtml(remarks)}</p>` : ''}
         <p>Your wallet balance has not been touched. You can submit a new request anytime.</p>`,
        `${APP_URL}/${user.role}/withdrawals`,
        'Open Withdrawals'
      );
      sendMailAsync({ to: user.email, subject, html, text: subject });
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Float-coverage drop — Pay2All can't back internal credits.
  // Both an in-app notification AND an admin email so the admin
  // sees it even if they're not logged in.
  // Debounced via settings (one per 6 hours).
  // ─────────────────────────────────────────────────────────────
  lowFloat({ pay2allBalance, internalTotal, coveragePct, deltaInr }) {
    safeFire(async () => {
      const last = await db.prepare("SELECT value FROM settings WHERE key = 'last_low_float_alert_at'").get();
      const now = Date.now();
      if (last && last.value && (now - parseInt(last.value, 10)) < 6 * 60 * 60 * 1000) {
        return; // debounced
      }
      await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_low_float_alert_at', ?, CURRENT_TIMESTAMP)")
        .run(String(now));

      await NotificationModel.create({
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

      const adminEmail = await getAdminEmail();
      if (adminEmail) {
        const subject = `🔴 LOW FLOAT — Pay2All master only ${fmt(pay2allBalance)}`;
        const html = emailShell(
          'Pay2All master is below internal wallet credits',
          `<p style="color:#b91c1c;font-weight:700;">⚠ Recharges will start failing very soon.</p>
           <table style="margin:14px 0;border-collapse:collapse;font-size:14px;">
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Pay2All master</td><td style="padding:6px 0;"><strong>${fmt(pay2allBalance)}</strong></td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Internal wallets total</td><td style="padding:6px 0;"><strong>${fmt(internalTotal)}</strong></td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Coverage</td><td style="padding:6px 0;color:#b91c1c;"><strong>${coveragePct.toFixed(1)}%</strong></td></tr>
             <tr><td style="padding:6px 12px 6px 0;color:#888;">Shortfall</td><td style="padding:6px 0;color:#b91c1c;"><strong>${fmt(Math.abs(deltaInr))}</strong></td></tr>
           </table>
           <p>Top up the Pay2All master from the admin dashboard — there is a UPI deep link / QR code there for instant top-up.</p>`,
          `${APP_URL}/admin`,
          'Open Float Health'
        );
        sendMailAsync({ to: adminEmail, subject, html, text: subject });
      }
    });
  },

  // ─────────────────────────────────────────────────────────────
  // Admin suspended a user — admin notification + suspended user
  // gets an email so they know what happened
  // ─────────────────────────────────────────────────────────────
  suspension({ user, sweptAmount }) {
    safeFire(async () => {
      await NotificationModel.create({
        user_id: ADMIN_USER_ID,
        type: 'user_suspended',
        title: `Suspended ${user.role} ${user.name}`,
        message: sweptAmount > 0
          ? `${user.name} (#${user.id}) suspended. ₹${sweptAmount} swept to admin wallet.`
          : `${user.name} (#${user.id}) suspended. No wallet balance to sweep.`,
        reference_type: 'user',
        reference_id: user.id,
      });
      if (user.email) {
        const subject = 'Your Mahakal Pay account has been suspended';
        const html = emailShell(
          'Account suspended',
          `<p>Hi <strong>${escapeHtml(user.name)}</strong>,</p>
           <p>Your Mahakal Pay account has been suspended by the admin and is no longer able to log in or transact.</p>
           ${sweptAmount > 0 ? `<p>Your wallet balance of <strong>${fmt(sweptAmount)}</strong> has been transferred to the admin wallet as part of the suspension.</p>` : ''}
           <p>If you believe this was a mistake, please contact <a href="mailto:info@mahakalpay.in">info@mahakalpay.in</a>.</p>`,
          null, null
        );
        sendMailAsync({ to: user.email, subject, html, text: subject });
      }
    });
  },
};

module.exports = notify;
