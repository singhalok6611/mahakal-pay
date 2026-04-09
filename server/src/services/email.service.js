/**
 * email.service — slice 7 transactional email sender.
 *
 * Wraps nodemailer with two modes:
 *
 *   MOCK (default — no SMTP creds set): does not connect anywhere, prints
 *   the email + reset link to the server log. This lets the forgot-password
 *   flow be developed and tested end-to-end before any real provider is
 *   wired up.
 *
 *   LIVE: when SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS are all set,
 *   connects via nodemailer SMTP transport. Designed to drop straight into
 *   Brevo (formerly Sendinblue) — their SMTP server is smtp-relay.brevo.com
 *   on port 587 — but works with any SMTP provider.
 *
 * The from-address is ALWAYS noreply@mahakalpay.in by default (overridable
 * via EMAIL_FROM env). When you set up Brevo, verify mahakalpay.in there
 * (SPF / DKIM DNS records) and inbox deliverability will be solid.
 *
 * Brevo free tier: 300 emails/day, no monthly cap, no expiry.
 * Sign up: https://www.brevo.com   ->  SMTP & API -> SMTP keys.
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

const EMAIL_FROM = process.env.EMAIL_FROM || 'Mahakal Pay <noreply@mahakalpay.in>';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true for 465, false for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function isLive() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/**
 * Send an email. Returns { mode: 'mock' | 'live', messageId? }.
 * Never throws — failures are logged and the caller can decide whether
 * to surface them. (For password reset we deliberately do NOT surface
 * "email failed" to the requester to avoid leaking which addresses exist.)
 */
async function send({ to, subject, text, html }) {
  if (!isLive()) {
    // ── MOCK MODE ──
    console.log('\n──────── [email.service MOCK] ────────');
    console.log('To:     ', to);
    console.log('From:   ', EMAIL_FROM);
    console.log('Subject:', subject);
    console.log('---');
    console.log(text || (html || '').replace(/<[^>]+>/g, ''));
    console.log('───────────────────────────────────────\n');
    return { mode: 'mock' };
  }

  try {
    const info = await getTransporter().sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    return { mode: 'live', messageId: info.messageId };
  } catch (err) {
    console.error('[email.service] sendMail failed:', err.message);
    return { mode: 'live', error: err.message };
  }
}

/**
 * High-level helper specific to password reset emails.
 */
async function sendPasswordResetEmail({ to, name, resetLink }) {
  const subject = 'Reset your Mahakal Pay password';
  const text = [
    `Hi ${name || ''},`,
    '',
    'We received a request to reset your Mahakal Pay password.',
    'Click the link below to set a new password. This link is valid for 1 hour and can only be used once.',
    '',
    resetLink,
    '',
    'If you did not request a password reset, you can safely ignore this email — your password will stay the same.',
    '',
    '— Mahakal Pay',
  ].join('\n');
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
      <h2 style="color: #2c3e50; margin-top: 0;">Reset your Mahakal Pay password</h2>
      <p>Hi ${name ? `<strong>${escapeHtml(name)}</strong>` : ''},</p>
      <p>We received a request to reset your Mahakal Pay password. Click the button below to set a new one. This link is valid for <strong>1 hour</strong> and can only be used once.</p>
      <p style="margin: 28px 0;">
        <a href="${resetLink}"
           style="background:#3498db;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#666;font-size:13px;">If the button doesn't work, paste this link into your browser:</p>
      <p style="word-break: break-all; color:#3498db; font-size:13px;">${resetLink}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#888;font-size:12px;">
        If you did not request a password reset, you can safely ignore this email — your password will stay the same.
      </p>
      <p style="color:#888;font-size:12px;">— Mahakal Pay</p>
    </div>
  `;
  return send({ to, subject, text, html });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  isLive,
  send,
  sendPasswordResetEmail,
  EMAIL_FROM,
};
