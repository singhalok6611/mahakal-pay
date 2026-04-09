/**
 * Cyrus Recharge API service
 * https://cyrusrecharge.in (or whichever Cyrus reseller portal you registered with)
 *
 * Cyrus exposes simple HTTP GET endpoints. The exact URL/parameter names vary
 * between resellers, so we keep them configurable via env vars and provide a
 * MOCK mode that returns success for development until you have real credentials.
 *
 * Required env vars when going live:
 *   CYRUS_API_BASE       e.g. https://cyrusrecharge.in/api/recharge
 *   CYRUS_API_MEMBER_ID  your Cyrus member id / username
 *   CYRUS_API_PASSWORD   your Cyrus API password (or API key)
 *   CYRUS_MODE           "live" | "mock" (default "mock")
 */

const db = require('../config/db');

const MODE = (process.env.CYRUS_MODE || 'mock').toLowerCase();
const API_BASE = process.env.CYRUS_API_BASE || '';
const MEMBER_ID = process.env.CYRUS_API_MEMBER_ID || '';
const PASSWORD = process.env.CYRUS_API_PASSWORD || '';

function logApiCall({ transactionId, request, response, httpStatus, errorMessage }) {
  try {
    db.prepare(`
      INSERT INTO recharge_api_logs (transaction_id, provider, request_payload, response_payload, http_status, error_message)
      VALUES (?, 'cyrus', ?, ?, ?, ?)
    `).run(
      transactionId || null,
      JSON.stringify(request || {}),
      typeof response === 'string' ? response : JSON.stringify(response || {}),
      httpStatus || null,
      errorMessage || null
    );
  } catch (e) {
    console.error('[cyrus.logApiCall] failed:', e.message);
  }
}

async function httpGet(url) {
  // Use global fetch (Node 18+). Fall back to https module if unavailable.
  if (typeof fetch === 'function') {
    const res = await fetch(url);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body };
  }
  // Fallback (should not be needed on Node 18+)
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let body;
        try { body = JSON.parse(data); } catch { body = data; }
        resolve({ status: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

const CyrusService = {
  isLive() {
    return MODE === 'live' && API_BASE && MEMBER_ID && PASSWORD;
  },

  /**
   * Trigger a recharge.
   * @param {object} params
   * @param {number} params.transactionId  internal transaction id (for logs/correlation)
   * @param {string} params.operatorCode   Cyrus operator code (e.g. "AT" for Airtel)
   * @param {string} params.number         mobile / DTH / FASTag number
   * @param {number} params.amount         in INR rupees
   * @returns {Promise<{status: 'success'|'processing'|'failed', apiTxnId: string, message: string, raw: any}>}
   */
  async recharge({ transactionId, operatorCode, number, amount }) {
    const requestPayload = { operatorCode, number, amount, transactionId };

    // ── MOCK MODE: pretend it succeeded so dev/testing works without real keys ──
    if (!this.isLive()) {
      const apiTxnId = `MOCK${Date.now()}`;
      logApiCall({
        transactionId,
        request: requestPayload,
        response: { mock: true, status: 'success', apiTxnId },
        httpStatus: 200,
      });
      return {
        status: 'success',
        apiTxnId,
        message: 'MOCK: recharge accepted',
        raw: { mock: true },
      };
    }

    // ── LIVE MODE ──
    // The exact query parameters depend on your Cyrus reseller — adjust here.
    const url =
      `${API_BASE}` +
      `?memberid=${encodeURIComponent(MEMBER_ID)}` +
      `&pin=${encodeURIComponent(PASSWORD)}` +
      `&operator=${encodeURIComponent(operatorCode)}` +
      `&number=${encodeURIComponent(number)}` +
      `&amount=${encodeURIComponent(amount)}` +
      `&apimember_id=${encodeURIComponent(transactionId || '')}`;

    try {
      const { status, body } = await httpGet(url);
      logApiCall({ transactionId, request: requestPayload, response: body, httpStatus: status });

      // Cyrus typically returns: { status: "SUCCESS"|"PENDING"|"FAILURE", txnid, message }
      const raw = body || {};
      const cyrusStatus = String(raw.status || raw.STATUS || '').toUpperCase();
      let mappedStatus = 'processing';
      if (cyrusStatus === 'SUCCESS' || cyrusStatus === 'SUCCESSFUL') mappedStatus = 'success';
      else if (cyrusStatus === 'FAILURE' || cyrusStatus === 'FAILED') mappedStatus = 'failed';
      else if (cyrusStatus === 'PENDING' || cyrusStatus === 'PROCESSING') mappedStatus = 'processing';

      return {
        status: mappedStatus,
        apiTxnId: raw.txnid || raw.TXNID || raw.opid || `CYR${Date.now()}`,
        message: raw.message || raw.MESSAGE || 'Sent to Cyrus',
        raw,
      };
    } catch (err) {
      logApiCall({
        transactionId,
        request: requestPayload,
        response: null,
        errorMessage: err.message,
      });
      return {
        status: 'failed',
        apiTxnId: null,
        message: 'Cyrus API error: ' + err.message,
        raw: null,
      };
    }
  },

  /**
   * Check recharge status. Cyrus exposes a status endpoint;
   * adjust the URL based on your reseller docs.
   */
  async checkStatus({ apiTxnId }) {
    if (!this.isLive()) {
      return { status: 'success', message: 'MOCK status', raw: { mock: true } };
    }
    const statusUrl = `${API_BASE.replace(/\/recharge.*/, '')}/status?memberid=${MEMBER_ID}&pin=${PASSWORD}&txnid=${apiTxnId}`;
    try {
      const { body } = await httpGet(statusUrl);
      const raw = body || {};
      const cyrusStatus = String(raw.status || '').toUpperCase();
      let mappedStatus = 'processing';
      if (cyrusStatus === 'SUCCESS') mappedStatus = 'success';
      else if (cyrusStatus === 'FAILURE') mappedStatus = 'failed';
      return { status: mappedStatus, message: raw.message || '', raw };
    } catch (err) {
      return { status: 'processing', message: err.message, raw: null };
    }
  },

  /**
   * Check Cyrus wallet balance (your master wallet with the provider).
   */
  async checkBalance() {
    if (!this.isLive()) {
      return { balance: null, message: 'MOCK mode — set CYRUS_MODE=live with credentials' };
    }
    const url = `${API_BASE.replace(/\/recharge.*/, '')}/balance?memberid=${MEMBER_ID}&pin=${PASSWORD}`;
    try {
      const { body } = await httpGet(url);
      return { balance: body?.balance || null, raw: body };
    } catch (err) {
      return { balance: null, error: err.message };
    }
  },
};

module.exports = CyrusService;
