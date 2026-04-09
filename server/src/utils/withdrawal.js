// Slice 4: shared validator for withdrawal request payloads, used by
// both retailer.controller and distributor.controller so the rules can
// only be defined once.

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.\-]+@[\w.\-]+$/;

function validateWithdrawalPayload(body = {}) {
  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'A positive amount is required' };
  }

  const method = String(body.method || '').toLowerCase();
  if (method !== 'bank' && method !== 'upi') {
    return { error: "method must be 'bank' or 'upi'" };
  }

  const payload = { amount, method };

  if (method === 'bank') {
    const name = String(body.bank_account_name || '').trim();
    const number = String(body.bank_account_number || '').trim();
    const ifsc = String(body.bank_ifsc || '').trim().toUpperCase();
    if (!name)   return { error: 'bank_account_name is required for bank withdrawals' };
    if (!number) return { error: 'bank_account_number is required for bank withdrawals' };
    if (!IFSC_REGEX.test(ifsc)) return { error: 'bank_ifsc must be in standard IFSC format (e.g. HDFC0001234)' };
    payload.bank_account_name = name;
    payload.bank_account_number = number;
    payload.bank_ifsc = ifsc;
    if (body.bank_name) payload.bank_name = String(body.bank_name).trim();
  } else {
    const upi = String(body.upi_id || '').trim().toLowerCase();
    if (!UPI_REGEX.test(upi)) return { error: 'upi_id must look like name@bank' };
    payload.upi_id = upi;
  }

  return { payload };
}

module.exports = { validateWithdrawalPayload };
