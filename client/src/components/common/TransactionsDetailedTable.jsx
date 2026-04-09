import { useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * Slice 6: shared role-aware All / Failed Transactions table.
 *
 * Renders columns based on the role (which is the role of the response,
 * NOT the prop — server stripping is the source of truth):
 *   - admin       : retailer + distributor + admin commission shown
 *   - distributor : retailer + distributor share shown (NO admin column)
 *   - retailer    : retailer only (NO distributor / admin columns)
 *
 * The Failed page passes `failedOnly` so the parent fetches with
 * status=failed and the table shows the millisecond timestamp column.
 */

const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;
const statusBadge = {
  success: 'success',
  processing: 'warning',
  failed: 'danger',
  refunded: 'info',
  pending: 'secondary',
};

export default function TransactionsDetailedTable({
  fetcher,           // function (params) -> Promise<{ data: { rows, total, role } }>
  role,              // 'admin' | 'distributor' | 'retailer' (used for column layout)
  failedOnly = false,
  pageSize = 25,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [serviceFilter, setServiceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (failedOnly) params.status = 'failed';
      if (serviceFilter) params.service_type = serviceFilter;
      const res = await fetcher(params);
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      // surfaces in toaster elsewhere; render empty here
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, serviceFilter, failedOnly]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const showDistributor = role === 'admin' || role === 'distributor';
  const showAdmin = role === 'admin';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm">
          {['', 'mobile', 'dth', 'fastag'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={`btn btn-${serviceFilter === s ? 'primary' : 'outline-primary'}`}
              onClick={() => { setServiceFilter(s); setPage(1); }}
            >
              {s ? s.toUpperCase() : 'All Services'}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
          <FiRefreshCw className="me-1" />
          Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  {showDistributor && <th>Distributor</th>}
                  <th>Retailer</th>
                  <th>Service / Operator</th>
                  <th>Number</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Retailer commission</th>
                  {showDistributor && <th className="text-end">Distributor share</th>}
                  {showAdmin && <th className="text-end">Admin share</th>}
                  <th>Status</th>
                  <th>Date / Time</th>
                  {failedOnly && <th>ms timestamp</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={20} className="text-center py-4 text-muted">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={20} className="text-center py-4 text-muted">
                    {failedOnly ? 'No failed transactions' : 'No transactions yet'}
                  </td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    {showDistributor && (
                      <td>
                        {r.distributor_name || '—'}
                        {r.distributor_phone && (
                          <small className="text-muted d-block">{r.distributor_phone}</small>
                        )}
                      </td>
                    )}
                    <td>
                      {r.retailer_name || '—'}
                      {r.retailer_phone && (
                        <small className="text-muted d-block">{r.retailer_phone}</small>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">{r.service_type}</span>
                      <small className="text-muted d-block">{r.operator}</small>
                    </td>
                    <td><code>{r.subscriber_id}</code></td>
                    <td className="text-end">{fmtMoney(r.amount)}</td>
                    <td className="text-end">{fmtMoney(r.retailer_commission)}</td>
                    {showDistributor && (
                      <td className="text-end text-primary">
                        {r.distributor_share_amount != null
                          ? <>{fmtMoney(r.distributor_share_amount)}<small className="text-muted d-block">{r.distributor_share_pct}%</small></>
                          : <span className="text-muted">—</span>}
                      </td>
                    )}
                    {showAdmin && (
                      <td className="text-end text-success fw-bold">
                        {r.admin_share_amount != null
                          ? <>{fmtMoney(r.admin_share_amount)}<small className="text-muted d-block">{r.admin_share_pct}%</small></>
                          : <span className="text-muted">—</span>}
                      </td>
                    )}
                    <td>
                      <span className={`badge bg-${statusBadge[r.status] || 'secondary'}`}>{r.status}</span>
                    </td>
                    <td>
                      <small>{r.created_at ? new Date(r.created_at_ms || r.created_at).toLocaleString() : '—'}</small>
                    </td>
                    {failedOnly && (
                      <td><code className="small">{r.created_at_ms ?? '—'}</code></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <small className="text-muted">Page {page} of {totalPages} · {total} total</small>
            <div className="btn-group btn-group-sm">
              <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
