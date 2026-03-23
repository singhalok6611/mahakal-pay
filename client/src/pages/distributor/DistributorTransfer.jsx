import { useState, useEffect } from 'react';
import { getRetailers, transferBalance } from '../../api/distributor.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function DistributorTransfer() {
  const [retailers, setRetailers] = useState([]);
  const [retailerId, setRetailerId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshBalance } = useAuth();

  useEffect(() => {
    getRetailers({ limit: 100 }).then((res) => setRetailers(res.data.users || [])).catch(() => {});
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transferBalance({ retailer_id: parseInt(retailerId), amount: parseFloat(amount) });
      toast.success('Balance transferred!');
      setAmount('');
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">Transfer Balance</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body" style={{ maxWidth: 500 }}>
          <form onSubmit={handleTransfer}>
            <div className="mb-3">
              <label className="form-label">Select Retailer</label>
              <select className="form-select" value={retailerId} onChange={(e) => setRetailerId(e.target.value)} required>
                <option value="">-- Select Retailer --</option>
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.phone}) - ₹{(r.balance || 0).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Amount (₹)</label>
              <input type="number" className="form-control" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Transferring...' : 'Transfer Balance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
