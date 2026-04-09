import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../../api/admin.api';

const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;
const STATUS_BADGES = {
  pending: 'warning',
  approved: 'info',
  processed: 'success',
  rejected: 'danger',
  failed: 'danger',
};

export default function AdminWithdrawals() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await getWithdrawals(params);
      setRows(res.data.rows || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve and debit user wallet for this withdrawal?')) return;
    setActing(id);
    try {
      await approveWithdrawal(id);
      toast.success('Withdrawal approved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally { setActing(null); }
  };

  const handleReject = async (id) => {
    const remarks = window.prompt('Reason for rejection (optional):') || '';
    setActing(id);
    try {
      await rejectWithdrawal(id, remarks);
      toast.success('Withdrawal rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rejection failed');
    } finally { setActing(null); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <FiDollarSign className="me-2" />
          Withdrawal Requests
        </h4>
        <div className="d-flex gap-2 align-items-center">
          <div className="btn-group btn-group-sm">
            {['pending', 'processed', 'rejected', ''].map((s) => (
              <button
                key={s || 'all'}
                className={`btn btn-${statusFilter === s ? 'primary' : 'outline-primary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
            <FiRefreshCw />
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Method / Destination</th>
                  <th className="text-end">Amount</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No withdrawals match this filter</td></tr>
                ) : rows.map(w => (
                  <tr key={w.id}>
                    <td>{w.id}</td>
                    <td>
                      <div className="fw-semibold">{w.user_name}</div>
                      <small className="text-muted">{w.user_role} · {w.user_phone}</small>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">{w.method}</span>
                      <div className="small mt-1">
                        {w.method === 'bank' ? (
                          <>
                            {w.bank_account_name}
                            <div className="text-muted">
                              {w.bank_name || ''} {w.bank_account_number} · {w.bank_ifsc}
                            </div>
                          </>
                        ) : (
                          <code>{w.upi_id}</code>
                        )}
                      </div>
                    </td>
                    <td className="text-end fw-bold">{fmtMoney(w.amount)}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGES[w.status] || 'secondary'}`}>{w.status}</span>
                      {w.admin_remarks && <small className="text-muted d-block">{w.admin_remarks}</small>}
                    </td>
                    <td><small>{new Date(w.created_at).toLocaleString()}</small></td>
                    <td className="text-end">
                      {w.status === 'pending' ? (
                        <>
                          <button
                            className="btn btn-sm btn-success me-2"
                            disabled={acting === w.id}
                            onClick={() => handleApprove(w.id)}
                          >
                            <FiCheck className="me-1" />Approve
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={acting === w.id}
                            onClick={() => handleReject(w.id)}
                          >
                            <FiX className="me-1" />Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
