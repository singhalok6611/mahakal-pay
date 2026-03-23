import { useState, useEffect } from 'react';
import { getWalletTransactions, createPaymentRequest } from '../../api/retailer.api';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function RetailerWallet() {
  const { balance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', payment_mode: 'bank_transfer', reference_no: '', bank_name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getWalletTransactions({ limit: 50 }).then((res) => setTransactions(res.data.transactions || [])).catch(() => {});
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPaymentRequest({ ...form, amount: parseFloat(form.amount) });
      toast.success('Payment request submitted');
      setShowModal(false);
      setForm({ amount: '', payment_mode: 'bank_transfer', reference_no: '', bank_name: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'Type', render: (row) => <span className={`badge bg-${row.type === 'credit' ? 'success' : 'danger'}`}>{row.type}</span> },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Balance Before', render: (row) => `₹ ${row.balance_before}` },
    { header: 'Balance After', render: (row) => `₹ ${row.balance_after}` },
    { header: 'Description', accessor: 'description' },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Wallet</h4>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Fund Request</button>
      </div>

      <div className="card border-0 shadow-sm text-center p-4 mb-4">
        <small className="text-muted">Current Balance</small>
        <h2 className="text-success mb-0">₹ {balance.toFixed(2)}</h2>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header"><h6 className="mb-0">Transaction History</h6></div>
        <div className="card-body">
          <DataTable columns={columns} data={transactions} />
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Fund Request</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleRequest}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" className="form-control" min="500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash Deposit</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Transaction Reference No</label>
                    <input type="text" className="form-control" value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bank Name</label>
                    <input type="text" className="form-control" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
