import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.\-]+@[\w.\-]+$/;
const STATUS_BADGES = {
  pending: 'warning',
  approved: 'info',
  processed: 'success',
  rejected: 'danger',
  failed: 'danger',
};

/**
 * Slice 4: shared withdrawal-request page used by both Retailer and
 * Distributor. Takes:
 *   - createWithdrawal({ amount, method, ... })
 *   - listMyWithdrawals(params)
 *   - getBalance()  -> Promise<{ data: { balance } }>
 */
export default function WithdrawalRequestForm({ createWithdrawal, listMyWithdrawals, getBalance }) {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    method: 'bank',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    upi_id: '',
  });

  const refresh = async () => {
    try {
      const [b, h] = await Promise.all([getBalance(), listMyWithdrawals({ limit: 20 })]);
      setBalance(b.data.balance ?? 0);
      setHistory(h.data.rows || []);
    } catch (err) {
      // ignore — toaster handles errors elsewhere
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a positive amount');
    if (amt > balance) return toast.error('Amount exceeds wallet balance');
    if (form.method === 'bank') {
      if (!form.bank_account_name.trim()) return toast.error('Account holder name required');
      if (!form.bank_account_number.trim()) return toast.error('Account number required');
      if (!IFSC_REGEX.test(form.bank_ifsc.toUpperCase())) return toast.error('IFSC must be like HDFC0001234');
    } else {
      if (!UPI_REGEX.test(form.upi_id.toLowerCase())) return toast.error('UPI must look like name@bank');
    }

    setSubmitting(true);
    try {
      const payload = { amount: amt, method: form.method };
      if (form.method === 'bank') {
        payload.bank_account_name = form.bank_account_name.trim();
        payload.bank_account_number = form.bank_account_number.trim();
        payload.bank_ifsc = form.bank_ifsc.trim().toUpperCase();
        if (form.bank_name) payload.bank_name = form.bank_name.trim();
      } else {
        payload.upi_id = form.upi_id.trim().toLowerCase();
      }
      await createWithdrawal(payload);
      toast.success('Withdrawal request submitted');
      setForm({
        amount: '', method: form.method,
        bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '', upi_id: '',
      });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-2">Withdraw to Bank / UPI</h4>
      <p className="text-muted small mb-4">
        Available wallet balance: <strong>{fmtMoney(balance)}</strong>
      </p>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">New Withdrawal Request</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-control"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Payout method *</label>
                  <div className="btn-group w-100">
                    <button
                      type="button"
                      className={`btn btn-${form.method === 'bank' ? 'primary' : 'outline-primary'}`}
                      onClick={() => setForm({ ...form, method: 'bank' })}
                    >Bank Transfer</button>
                    <button
                      type="button"
                      className={`btn btn-${form.method === 'upi' ? 'primary' : 'outline-primary'}`}
                      onClick={() => setForm({ ...form, method: 'upi' })}
                    >UPI</button>
                  </div>
                </div>

                {form.method === 'bank' ? (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Account holder name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.bank_account_name}
                        onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Account number *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.bank_account_number}
                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">IFSC *</label>
                      <input
                        type="text"
                        className="form-control text-uppercase"
                        placeholder="HDFC0001234"
                        value={form.bank_ifsc}
                        maxLength={11}
                        onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Bank name (optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="mb-3">
                    <label className="form-label">UPI ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="name@bank"
                      value={form.upi_id}
                      onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                      required
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Withdrawal Request'}
                </button>
                <small className="text-muted d-block mt-2">
                  The amount will be debited from your wallet only after admin approval.
                </small>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="mb-0">My Withdrawal History</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted py-3">No withdrawal requests yet</td></tr>
                    ) : history.map(w => (
                      <tr key={w.id}>
                        <td>{w.id}</td>
                        <td className="fw-semibold">{fmtMoney(w.amount)}</td>
                        <td>
                          <span className="badge bg-secondary text-uppercase">{w.method}</span>
                          <small className="text-muted d-block">
                            {w.method === 'bank'
                              ? `${w.bank_name || ''} ${w.bank_account_number || ''}`.trim()
                              : w.upi_id}
                          </small>
                        </td>
                        <td>
                          <span className={`badge bg-${STATUS_BADGES[w.status] || 'secondary'}`}>{w.status}</span>
                          {w.admin_remarks && <small className="text-muted d-block">{w.admin_remarks}</small>}
                        </td>
                        <td><small>{new Date(w.created_at).toLocaleString()}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
