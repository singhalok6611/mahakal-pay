import { useEffect, useState } from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import api from '../../api/client';

export default function AdminPlatformEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/platform-fees?limit=100')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div className="alert alert-warning">Failed to load platform earnings</div>;

  const t = data.totals || {};

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiTrendingUp className="me-2" />
        Platform Earnings ({data.feePct}% auto-fee)
      </h4>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Today</small>
              <h4 className="text-success mb-0">₹ {Number(t.today || 0).toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Last 7 Days</small>
              <h4 className="text-primary mb-0">₹ {Number(t.last_7_days || 0).toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">This Month</small>
              <h4 className="text-info mb-0">₹ {Number(t.this_month || 0).toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Lifetime ({t.count || 0} txns)</small>
              <h4 className="text-dark mb-0">₹ {Number(t.total_lifetime || 0).toFixed(2)}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light">
          <h6 className="mb-0">Recent Platform Fee Collections</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>User</th>
                  <th>Source</th>
                  <th className="text-end">Base Amount</th>
                  <th className="text-end">Fee %</th>
                  <th className="text-end">Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No platform fees collected yet</td></tr>
                )}
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>
                      {r.user_name}
                      <small className="text-muted d-block">{r.user_role}</small>
                    </td>
                    <td><span className="badge bg-secondary">{r.source_type}</span> #{r.source_id}</td>
                    <td className="text-end">₹ {Number(r.base_amount).toFixed(2)}</td>
                    <td className="text-end">{Number(r.fee_pct).toFixed(2)}%</td>
                    <td className="text-end text-success fw-bold">₹ {Number(r.fee_amount).toFixed(2)}</td>
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
