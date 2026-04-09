import { useEffect, useState } from 'react';
import { FiUserCheck, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getPendingRetailers,
  approveRetailer,
  rejectRetailer,
} from '../../api/admin.api';

export default function AdminRetailerApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null); // id currently being acted on

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPendingRetailers();
      setRows(res.data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load pending retailers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setActing(id);
    try {
      await approveRetailer(id);
      toast.success('Retailer approved');
      setRows(rows.filter(r => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this retailer? They will not be able to log in.')) return;
    setActing(id);
    try {
      await rejectRetailer(id);
      toast.success('Retailer rejected');
      setRows(rows.filter(r => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rejection failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <FiUserCheck className="me-2" />
          Retailer Approvals
        </h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
          <FiRefreshCw className="me-1" />
          Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5 text-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No retailers waiting for approval.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>PAN</th>
                    <th>Distributor</th>
                    <th>City</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <div className="fw-semibold">{r.name}</div>
                        {r.shop_name && <small className="text-muted">{r.shop_name}</small>}
                      </td>
                      <td>{r.email}</td>
                      <td>{r.phone}</td>
                      <td><code>{r.pan}</code></td>
                      <td>
                        <div>{r.distributor_name || '—'}</div>
                        {r.distributor_phone && (
                          <small className="text-muted">{r.distributor_phone}</small>
                        )}
                      </td>
                      <td>{r.city || '—'}</td>
                      <td>
                        <small className="text-muted">
                          {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                        </small>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-success me-2"
                          disabled={acting === r.id}
                          onClick={() => handleApprove(r.id)}
                        >
                          <FiCheck className="me-1" />
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={acting === r.id}
                          onClick={() => handleReject(r.id)}
                        >
                          <FiX className="me-1" />
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
