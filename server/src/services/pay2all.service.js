/**
 * Pay2All recharge / payments API service.
 * Docs: https://documenter.getpostman.com/view/5618532/2sA2xnyVt5
 *
 * Auth model: form-data POST /api/token with email + password returns
 * a fresh bearer token on EVERY call. We deliberately do NOT cache the
 * token across requests — Pay2All issues a new one per login and the
 * docs hint that long-lived caching is unsafe. The cost is one extra
 * round-trip per recharge, which is fine at our volumes.
 *
 * Modes:
 *   LIVE  — set PAY2ALL_EMAIL + PAY2ALL_PASSWORD in .env. The service
 *           hits the real Pay2All endpoints. Failed recharges return
 *           { status: 'failed' } so the controller can refund the
 *           retailer wallet using its existing refund path.
 *   MOCK  — if either env var is missing, returns a synthetic success
 *           so dev/CI keep working without real credentials.
 *
 * Required env vars (live mode):
 *   PAY2ALL_EMAIL          - your Pay2All login email
 *   PAY2ALL_PASSWORD       - your Pay2All password
 *   PAY2ALL_ACCOUNT_MOBILE - the mobile number registered on the
 *                            Pay2All account (used as `mobile_number`
 *                            in the recharge payload — Pay2All wants
 *                            both the customer number and the API
 *                            partner mobile, they are different fields)
 *
 * The slug→provider_id table below was discovered via /api/providers
 * on 2026-04-09 and is hard-coded for the operators Mahakal seeds.
 * If you add new operators to the seed, add them here too. The
 * cleaner long-term fix is a `pay2all_provider_id` column on the
 * operators table — left as a TODO.
 */

const db = require('../config/db');

const MODE_ENV = (process.env.PAY2ALL_MODE || '').toLowerCase();
const EMAIL = process.env.PAY2ALL_EMAIL || '';
const PASSWORD = process.env.PAY2ALL_PASSWORD || '';
const ACCOUNT_MOBILE = process.env.PAY2ALL_ACCOUNT_MOBILE || '';
const BASE = (process.env.PAY2ALL_BASE_URL || 'https://erp.pay2all.in').replace(/\/$/, '');

// Slug → Pay2All provider id. Discovered via GET /api/providers.
// `null` means Pay2All does not list this operator — the recharge will
// fall back to mock mode for that specific transaction.
const PROVIDER_MAP = {
  // Mobile (Pay2All service_id 1)
  airtel:        1,
  vi:            2,
  jio:           88,
  bsnl:          8,
  mtnl:          null,           // not in Pay2All
  // DTH (service_id 2)
  airtel_dth:    17,
  dish_tv:       12,
  tata_play:     13,
  sun_direct:    14,
  videocon_d2h:  15,
  // FASTag (service_id 19)
  paytm_fastag:  339,
  icici_fastag:  170,
  sbi_fastag:    null,           // not in Pay2All
  hdfc_fastag:   224,
  axis_fastag:   220,
  kotak_fastag:  222,
};

function isLive() {
  if (MODE_ENV === 'mock') return false;
  return Boolean(EMAIL && PASSWORD && ACCOUNT_MOBILE);
}

function logApiCall({ transactionId, request, response, httpStatus, errorMessage }) {
  try {
    db.prepare(`
      INSERT INTO recharge_api_logs (transaction_id, provider, request_payload, response_payload, http_status, error_message)
      VALUES (?, 'pay2all', ?, ?, ?, ?)
    `).run(
      transactionId || null,
      JSON.stringify(redactSecrets(request || {})),
      typeof response === 'string' ? response : JSON.stringify(response || {}),
      httpStatus || null,
      errorMessage || null
    );
  } catch (e) {
    console.error('[pay2all.logApiCall] failed:', e.message);
  }
}

// Strip credentials from a logged payload — never persist plaintext
// password or bearer token in recharge_api_logs.
function redactSecrets(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (/password|token|pin|secret/i.test(k)) out[k] = '***';
  }
  return out;
}

/**
 * POST a multipart/form-data body using Node 18+ global fetch + FormData.
 * Returns { status, body } where body is the parsed JSON (or text).
 */
async function postForm(url, fields, headers = {}) {
  if (typeof fetch !== 'function' || typeof FormData === 'undefined') {
    throw new Error('Pay2All service requires Node 18+ (global fetch + FormData)');
  }
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  const res = await fetch(url, { method: 'POST', body: fd, headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

/**
 * Fetch a fresh access token. We do NOT cache — every recharge gets
 * its own token. See the file header for why.
 */
async function fetchToken() {
  const { status, body } = await postForm(`${BASE}/api/token`, {
    email: EMAIL,
    password: PASSWORD,
  }, { Accept: 'application/json' });

  if (status !== 200 || !body || !body.token) {
    const msg = (body && body.message) || `Pay2All token endpoint returned ${status}`;
    throw new Error(`Pay2All auth failed: ${msg}`);
  }
  return body.token;
}

const Pay2AllService = {
  isLive,
  PROVIDER_MAP,

  /**
   * Resolve a Mahakal operator code (e.g. 'airtel', 'tata_play') to
   * the Pay2All numeric provider id. Returns null if unmapped.
   */
  resolveProviderId(operatorCode) {
    if (operatorCode == null) return null;
    return PROVIDER_MAP[String(operatorCode).toLowerCase()] ?? null;
  },

  /**
   * Trigger a recharge through Pay2All.
   *
   * @param {object}  params
   * @param {number}  params.transactionId  internal Mahakal transaction id (used for client_id + log correlation)
   * @param {string}  params.operatorCode   Mahakal operator.code (NOT the Pay2All id)
   * @param {string}  params.number         subscriber / customer number
   * @param {number}  params.amount         in INR rupees
   * @returns {Promise<{status: 'success'|'processing'|'failed', apiTxnId, message, raw}>}
   */
  async recharge({ transactionId, operatorCode, number, amount }) {
    const providerId = this.resolveProviderId(operatorCode);
    const clientId = `MHK${transactionId || Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const requestPayload = { providerId, number, amount, clientId, operatorCode };

    // ── MOCK MODE: no creds, or operator not in Pay2All map ──
    if (!isLive() || providerId == null) {
      const reason = !isLive()
        ? 'pay2all credentials not set, returning mock success'
        : `operator ${operatorCode} has no Pay2All provider mapping, returning mock success`;
      logApiCall({
        transactionId,
        request: requestPayload,
        response: { mock: true, reason, status: 'success', apiTxnId: clientId },
        httpStatus: 200,
      });
      return {
        status: 'success',
        apiTxnId: clientId,
        message: 'MOCK: ' + reason,
        raw: { mock: true },
      };
    }

    // ── LIVE MODE ──
    let token;
    try {
      token = await fetchToken();
    } catch (err) {
      logApiCall({ transactionId, request: requestPayload, response: null, errorMessage: err.message });
      return { status: 'failed', apiTxnId: null, message: err.message, raw: null };
    }

    const fields = {
      mobile_number: ACCOUNT_MOBILE, // API partner's registered mobile
      number,                        // customer's mobile / DTH / fastag number
      provider_id:   providerId,
      amount,
      client_id:     clientId,
    };

    try {
      const { status, body } = await postForm(
        `${BASE}/api/v1/payment/recharge`,
        fields,
        { Accept: 'application/json', Authorization: `Bearer ${token}` }
      );
      logApiCall({ transactionId, request: requestPayload, response: body, httpStatus: status });

      // Pay2All status_id mapping (per docs):
      //   1 = success
      //   2 = failure
      //   3 = process / pending
      //   4 = refunded
      //   6 = credit
      const raw = body || {};
      const statusId = parseInt(raw.status_id ?? raw.status ?? 0, 10);
      let mappedStatus = 'processing';
      if (statusId === 1)      mappedStatus = 'success';
      else if (statusId === 2) mappedStatus = 'failed';
      else if (statusId === 3) mappedStatus = 'processing';
      else if (statusId === 4) mappedStatus = 'refunded';
      // Sometimes Pay2All returns the status as a string instead.
      const statusStr = String(raw.status || '').toLowerCase();
      if (!statusId && statusStr) {
        if (statusStr.includes('success')) mappedStatus = 'success';
        else if (statusStr.includes('fail')) mappedStatus = 'failed';
        else if (statusStr.includes('pending') || statusStr.includes('process')) mappedStatus = 'processing';
      }

      return {
        status: mappedStatus,
        apiTxnId: raw.txn_id || raw.transaction_id || raw.api_txn_id || raw.opid || clientId,
        message: raw.message || raw.msg || 'Pay2All response received',
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
        message: 'Pay2All API error: ' + err.message,
        raw: null,
      };
    }
  },

  /**
   * Status check for a previously submitted recharge.
   * @param {object} params
   * @param {string} params.clientId  the client_id we sent on the original recharge
   */
  async checkStatus({ clientId }) {
    if (!isLive()) {
      return { status: 'success', message: 'MOCK status', raw: { mock: true } };
    }
    try {
      const token = await fetchToken();
      const { body } = await postForm(
        `${BASE}/api/v1/payment/status`,
        { client_id: clientId },
        { Accept: 'application/json', Authorization: `Bearer ${token}` }
      );
      const raw = body || {};
      const statusId = parseInt(raw.status_id ?? 0, 10);
      let mapped = 'processing';
      if (statusId === 1)      mapped = 'success';
      else if (statusId === 2) mapped = 'failed';
      else if (statusId === 4) mapped = 'refunded';
      return { status: mapped, message: raw.message || '', raw };
    } catch (err) {
      return { status: 'processing', message: err.message, raw: null };
    }
  },

  /**
   * Master wallet balance (the API partner's Pay2All balance).
   * Useful for the admin dashboard so they can see when to top up.
   */
  async checkBalance() {
    if (!isLive()) {
      return { balance: null, message: 'MOCK mode — set PAY2ALL_EMAIL/PASSWORD/ACCOUNT_MOBILE to go live' };
    }
    try {
      const token = await fetchToken();
      const { body } = await getJson(`${BASE}/api/user`, {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      });
      const balance = body?.data?.balance?.user_balance;
      return { balance: balance ?? null, raw: body };
    } catch (err) {
      return { balance: null, error: err.message };
    }
  },
};

module.exports = Pay2AllService;
