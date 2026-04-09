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
  const config = data.config || { distributor_share_pct: 0, admin_share_pct: 0 };
  const sum = data.sum || {};
  const topup = data.topupTotals || {};

  const fmt = (n) => `₹ ${Number(n || 0).toFixed(2)}`;

  return (
    <div>
      <h4 className="fw-bold mb-2">
        <FiTrendingUp className="me-2" />
        Platform Earnings
      </h4>
      <p className="text-muted small mb-4">
        Admin override on every retailer commission: <strong>{config.admin_share_pct}%</strong> to admin, <strong>{config.distributor_share_pct}%</strong> to the retailer's distributor.
        Both are credited directly to the respective wallets on each successful recharge.
      </p>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Today (admin)</small>
              <h4 className="text-success mb-0">{fmt(t.admin_today)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Last 7 Days (admin)</small>
              <h4 className="text-primary mb-0">{fmt(t.admin_last_7_days)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">This Month (admin)</small>
              <h4 className="text-info mb-0">{fmt(t.admin_this_month)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block">Lifetime (admin, {t.count || 0} txns)</small>
              <h4 className="text-dark mb-0">{fmt(t.admin_total_lifetime)}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">Distributor overrides paid (lifetime)</small>
              <h5 className="mb-0 text-primary">{fmt(t.distributor_total_lifetime)}</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">Retailer commission base (this view)</small>
              <h5 className="mb-0">{fmt(sum.retailer_commission_total)}</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <small className="text-muted d-block">Razorpay top-up fees (legacy 1%, lifetime)</small>
              <h5 className="mb-0 text-secondary">{fmt(topup.total_lifetime)}</h5>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light">
          <h6 className="mb-0">Recent Commission Splits</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0 align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Retailer</th>
                  <th>Distributor</th>
                  <th>Service</th>
                  <th className="text-end">Recharge ₹</th>
                  <th className="text-end">Retailer commission</th>
                  <th className="text-end">Distributor share</th>
                  <th className="text-end">Admin share</th>
                </tr>
              </thead>
              <tbody>
                {(!data.rows || data.rows.length === 0) && (
                  <tr><td colSpan="9" className="text-center text-muted py-4">No commission splits yet</td></tr>
                )}
                {data.rows && data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.transaction_id}</td>
                    <td><small>{new Date(r.created_at).toLocaleString()}</small></td>
                    <td>{r.retailer_name || '—'}</td>
                    <td>{r.distributor_name || '—'}</td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">{r.service_type}</span>
                      <small className="text-muted d-block">{r.operator} · {r.subscriber_id}</small>
                    </td>
                    <td className="text-end">{fmt(r.recharge_amount)}</td>
                    <td className="text-end">{fmt(r.retailer_commission_amount)}</td>
                    <td className="text-end text-primary">
                      {fmt(r.distributor_share_amount)}
                      <small className="text-muted d-block">{r.distributor_share_pct}%</small>
                    </td>
                    <td className="text-end text-success fw-bold">
                      {fmt(r.admin_share_amount)}
                      <small className="text-muted d-block">{r.admin_share_pct}%</small>
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
