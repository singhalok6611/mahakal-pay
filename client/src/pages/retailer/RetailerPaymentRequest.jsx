import { useState } from 'react';
import { createPaymentRequest } from '../../api/retailer.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiCreditCard } from 'react-icons/fi';

export default function RetailerPaymentRequest() {
  const { balance } = useAuth();
  const [form, setForm] = useState({ amount: '', payment_mode: 'bank_transfer', reference_no: '', bank_name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPaymentRequest({ ...form, amount: parseFloat(form.amount) });
      toast.success('Payment request submitted successfully!');
      setForm({ amount: '', payment_mode: 'bank_transfer', reference_no: '', bank_name: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiCreditCard className="me-2" />
        Payment Request
      </h4>

      <div className="card border-0 shadow-sm text-center p-4 mb-4" style={{ maxWidth: 600 }}>
        <small className="text-muted">Current Wallet Balance</small>
        <h2 className="text-success mb-0">₹ {balance.toFixed(2)}</h2>
      </div>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">Submit Fund Request</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                className="form-control"
                min="500"
                placeholder="Minimum ₹500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Payment Mode *</label>
              <select
                className="form-select"
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash Deposit</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Transaction Reference No</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter reference number"
                value={form.reference_no}
                onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter bank name"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Payment Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
