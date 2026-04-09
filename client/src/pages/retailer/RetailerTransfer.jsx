import { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { transferToParent, getWallet } from '../../api/retailer.api';

const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;

export default function RetailerTransfer() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => getWallet().then((r) => setBalance(r.data.balance ?? 0)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter a positive amount');
    if (amt > balance) return toast.error('Amount exceeds wallet balance');

    setSubmitting(true);
    try {
      await transferToParent({ amount: amt, description: description || undefined });
      toast.success('Transferred to your distributor');
      setAmount('');
      setDescription('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-2">
        <FiArrowUp className="me-2" />
        Transfer to Distributor
      </h4>
      <p className="text-muted small mb-4">
        Send money from your wallet back to your parent distributor's wallet.
        Available: <strong>{fmtMoney(balance)}</strong>
      </p>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 540 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Note (optional)</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. excess balance return"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Transferring…' : 'Transfer to Distributor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
