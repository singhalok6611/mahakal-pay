import { useEffect, useState } from 'react';
import { FiBookOpen, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getReconciliation } from '../../api/admin.api';
import FloatHealthCard from '../../components/admin/FloatHealthCard';

const fmt = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminReconciliation() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReconciliation(days);
      setRows(res.data.days || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const totals = rows.reduce((acc, r) => {
    acc.attempted += r.recharges_attempted;
    acc.success   += r.recharges_success;
    acc.failed    += r.recharges_failed;
    acc.gross     += r.gross_recharge_amount;
    acc.retailer  += r.retailer_commission;
    acc.dist      += r.distributor_commission;
    acc.admin     += r.admin_commission;
    acc.credits   += r.wallet_credits;
    acc.debits    += r.wallet_debits;
    return acc;
  }, { attempted: 0, success: 0, failed: 0, gross: 0, retailer: 0, dist: 0, admin: 0, credits: 0, debits: 0 });

  return (
    <div>
      <FloatHealthCard />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">
          <FiBookOpen className="me-2" />
          Daily Reconciliation
        </h4>
        <div className="d-flex gap-2 align-items-center">
          <div className="btn-group btn-group-sm">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                className={`btn btn-${days === d ? 'primary' : 'outline-primary'}`}
                onClick={() => setDays(d)}
              >
                {d}d
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
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th className="text-center">Attempted</th>
                  <th className="text-center">Success</th>
                  <th className="text-center">Failed</th>
                  <th className="text-end">Gross Recharge</th>
                  <th className="text-end">Retailer Comm.</th>
                  <th className="text-end">Distributor Comm.</th>
                  <th className="text-end">Admin Comm.</th>
                  <th className="text-end">Wallet Credits</th>
                  <th className="text-end">Wallet Debits</th>
                  <th className="text-end">Net Change</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No data</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.date}>
                    <td className="fw-semibold">{r.date}</td>
                    <td className="text-center">{r.recharges_attempted}</td>
                    <td className="text-center text-success fw-semibold">{r.recharges_success}</td>
                    <td className="text-center text-danger">{r.recharges_failed}</td>
                    <td className="text-end">{fmt(r.gross_recharge_amount)}</td>
                    <td className="text-end">{fmt(r.retailer_commission)}</td>
                    <td className="text-end text-primary">{fmt(r.distributor_commission)}</td>
                    <td className="text-end text-success">{fmt(r.admin_commission)}</td>
                    <td className="text-end">{fmt(r.wallet_credits)}</td>
                    <td className="text-end">{fmt(r.wallet_debits)}</td>
                    <td className={`text-end fw-bold ${r.net_change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {r.net_change >= 0 ? '+' : ''}{fmt(r.net_change)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="table-light">
                  <tr className="fw-bold">
                    <td>{days}d total</td>
                    <td className="text-center">{totals.attempted}</td>
                    <td className="text-center text-success">{totals.success}</td>
                    <td className="text-center text-danger">{totals.failed}</td>
                    <td className="text-end">{fmt(totals.gross)}</td>
                    <td className="text-end">{fmt(totals.retailer)}</td>
                    <td className="text-end text-primary">{fmt(totals.dist)}</td>
                    <td className="text-end text-success">{fmt(totals.admin)}</td>
                    <td className="text-end">{fmt(totals.credits)}</td>
                    <td className="text-end">{fmt(totals.debits)}</td>
                    <td className="text-end">{fmt(totals.credits - totals.debits)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
