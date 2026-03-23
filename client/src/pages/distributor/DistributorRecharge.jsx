import { useState, useEffect } from 'react';
import api from '../../api/client';
import { getTransactions } from '../../api/distributor.api';
import toast from 'react-hot-toast';
import { FiSmartphone, FiTv, FiCreditCard } from 'react-icons/fi';

const serviceConfig = {
  mobile: { label: 'Prepaid', icon: FiSmartphone, subscriberLabel: 'Mobile Number', placeholder: 'Enter 10-digit mobile number' },
  dth: { label: 'DTH', icon: FiTv, subscriberLabel: 'DTH Subscriber ID', placeholder: 'Enter DTH subscriber ID' },
  fastag: { label: 'FASTag', icon: FiCreditCard, subscriberLabel: 'Vehicle Number', placeholder: 'Enter vehicle number' },
};

const statusColors = { success: 'success', processing: 'warning', failed: 'danger', refunded: 'info', pending: 'secondary' };

export default function DistributorRecharge() {
  const [serviceType, setServiceType] = useState('mobile');
  const [operators, setOperators] = useState([]);
  const [form, setForm] = useState({ operator: '', subscriber_id: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.get('/operators', { params: { service_type: serviceType } })
      .then((res) => {
        setOperators(res.data);
        setForm({ operator: '', subscriber_id: '', amount: '' });
      })
      .catch(() => {});
  }, [serviceType]);

  const fetchTransactions = () => {
    getTransactions({ limit: 10 })
      .then((res) => setTransactions(res.data.transactions || []))
      .catch(() => {});
  };

  useEffect(fetchTransactions, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/distributor/recharge', {
        service_type: serviceType,
        operator: form.operator,
        subscriber_id: form.subscriber_id,
        amount: parseFloat(form.amount),
      });
      toast.success('Recharge successful!');
      setForm({ operator: '', subscriber_id: '', amount: '' });
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  const config = serviceConfig[serviceType];

  return (
    <div>
      <h4 className="fw-bold mb-4">Recharge</h4>

      {/* Service Tabs */}
      <div className="d-flex gap-3 mb-4">
        {Object.entries(serviceConfig).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const active = serviceType === type;
          return (
            <button
              key={type}
              className={`btn d-flex align-items-center gap-2 px-4 py-2 ${active ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setServiceType(type)}
            >
              <Icon size={18} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Recharge Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">{config.label} Recharge</h6>
        </div>
        <div className="card-body" style={{ maxWidth: 500 }}>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">{config.subscriberLabel}</label>
              <input
                type="text"
                className="form-control"
                placeholder={config.placeholder}
                value={form.subscriber_id}
                onChange={(e) => setForm({ ...form, subscriber_id: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Operator</label>
              <select
                className="form-select"
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                required
              >
                <option value="">-- Select Operator --</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.code}>{op.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                min="10"
                max="10000"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
              {loading ? 'Processing...' : 'PROCEED TO RECHARGE'}
            </button>
          </form>
        </div>
      </div>

      {/* Last Transactions */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-dark text-white">
          <h6 className="mb-0">Last Transactions</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="table-dark">
                  <th>#</th>
                  <th>Service</th>
                  <th>Operator</th>
                  <th>Number</th>
                  <th>Amount</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">No transactions yet</td>
                  </tr>
                ) : (
                  transactions.map((txn, i) => (
                    <tr key={txn.id || i}>
                      <td>{txn.id}</td>
                      <td className="text-capitalize">{txn.service_type}</td>
                      <td>{txn.operator}</td>
                      <td>{txn.subscriber_id}</td>
                      <td>₹ {txn.amount}</td>
                      <td>₹ {txn.commission}</td>
                      <td>
                        <span className={`badge bg-${statusColors[txn.status] || 'secondary'}`}>{txn.status}</span>
                      </td>
                      <td>{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
