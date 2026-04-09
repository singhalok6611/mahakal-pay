import { useEffect, useState } from 'react';
import {
  FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiExternalLink,
  FiCopy, FiSmartphone, FiDollarSign,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getFloatStatus, getPay2allDeposit } from '../../api/admin.api';

const fmtMoney = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const HEALTH_THEME = {
  healthy:  { bg: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', icon: FiCheckCircle,    label: 'HEALTHY' },
  warning:  { bg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)', icon: FiAlertTriangle,  label: 'WARNING' },
  critical: { bg: 'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)', icon: FiAlertTriangle,  label: 'CRITICAL' },
};

export default function FloatHealthCard() {
  const [status, setStatus] = useState(null);
  const [deposit, setDeposit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [s, d] = await Promise.all([getFloatStatus(), getPay2allDeposit()]);
      setStatus(s.data);
      setDeposit(d.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load float status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = (label, value) => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Copy failed'));
  };

  if (loading) {
    return <div className="card border-0 shadow-sm p-4 mb-4 text-center text-muted">Loading float status…</div>;
  }
  if (!status) return null;

  const theme = HEALTH_THEME[status.health] || HEALTH_THEME.warning;
  const Icon = theme.icon;
  const upiAmount = Math.max(0, Math.round(Math.abs(status.delta) || 1000)); // suggested top-up
  const upiLink = deposit?.upi_id
    ? `upi://pay?pa=${encodeURIComponent(deposit.upi_id)}&pn=${encodeURIComponent(deposit.account_holder || 'Pay2All')}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent('Pay2All master top-up')}`
    : null;

  return (
    <div className="row g-3 mb-4">
      {/* ── Float health summary ───────────────────────────── */}
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm h-100" style={{ overflow: 'hidden' }}>
          <div className="card-body p-0">
            <div className="d-flex align-items-center gap-3 p-4" style={{ background: theme.bg, color: '#fff' }}>
              <Icon size={40} />
              <div className="flex-grow-1">
                <div className="fw-bold text-uppercase" style={{ fontSize: '0.78rem', letterSpacing: '1.5px', opacity: 0.85 }}>
                  Float Health
                </div>
                <div className="fw-bold" style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>{theme.label}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>{status.message}</div>
              </div>
              <button
                className="btn btn-sm btn-light"
                onClick={load}
                disabled={refreshing}
                title="Refresh"
              >
                <FiRefreshCw className={refreshing ? 'spin' : ''} />
              </button>
            </div>
            <div className="row g-0">
              <div className="col-6 col-md-3 p-3 border-end border-bottom text-center">
                <small className="text-muted d-block">Pay2All Master</small>
                <div className="fw-bold" style={{ fontSize: '1.15rem', color: '#1a237e' }}>{fmtMoney(status.pay2all_balance)}</div>
                {!status.pay2all_live && <small className="text-warning">⚠ mock mode</small>}
              </div>
              <div className="col-6 col-md-3 p-3 border-end border-bottom text-center">
                <small className="text-muted d-block">Internal Total</small>
                <div className="fw-bold" style={{ fontSize: '1.15rem', color: '#1a237e' }}>{fmtMoney(status.internal_total)}</div>
              </div>
              <div className="col-6 col-md-3 p-3 border-end border-bottom text-center">
                <small className="text-muted d-block">Coverage</small>
                <div className="fw-bold" style={{
                  fontSize: '1.15rem',
                  color: status.health === 'critical' ? '#dc2626' : status.health === 'warning' ? '#d97706' : '#059669'
                }}>
                  {Number(status.coverage_pct).toFixed(1)}%
                </div>
              </div>
              <div className="col-6 col-md-3 p-3 border-bottom text-center">
                <small className="text-muted d-block">Delta</small>
                <div className="fw-bold" style={{
                  fontSize: '1.15rem',
                  color: status.delta < 0 ? '#dc2626' : '#059669'
                }}>
                  {status.delta < 0 ? '−' : ''}{fmtMoney(Math.abs(status.delta))}
                </div>
              </div>
            </div>
            <div className="p-3" style={{ background: '#f8f9ff' }}>
              <small className="text-muted d-block mb-1 fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                Internal Breakdown
              </small>
              <div className="d-flex gap-3 flex-wrap">
                {Object.entries(status.internal_breakdown || {}).map(([role, amt]) => (
                  <div key={role}>
                    <small className="text-muted text-capitalize">{role}: </small>
                    <span className="fw-semibold">{fmtMoney(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pay2All deposit panel ───────────────────────────── */}
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between pt-3">
            <h6 className="mb-0 fw-bold">
              <FiDollarSign className="me-2" />
              Top up Pay2All
            </h6>
            <a
              href="https://erp.pay2all.in"
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
            >
              Pay2All Portal <FiExternalLink size={13} />
            </a>
          </div>
          <div className="card-body pt-2">
            {!deposit?.configured ? (
              <div className="alert alert-warning small mb-0">
                Pay2All credentials not configured. Set <code>PAY2ALL_EMAIL</code>, <code>PAY2ALL_PASSWORD</code>, and <code>PAY2ALL_ACCOUNT_MOBILE</code> in <code>server/.env</code>.
              </div>
            ) : (
              <>
                <p className="small text-muted mb-3">
                  Deposits to this virtual account / UPI ID auto-credit the Pay2All master wallet.
                  The fastest way to top up is the UPI button below.
                </p>

                <div className="mb-2">
                  <small className="text-muted d-block">Account Holder</small>
                  <div className="fw-semibold">{deposit.account_holder}</div>
                </div>

                <div className="mb-2 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">Virtual A/c Number</small>
                    <code style={{ fontSize: '0.95rem' }}>{deposit.bank_account_number}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('Account number', deposit.bank_account_number)}
                  >
                    <FiCopy />
                  </button>
                </div>

                <div className="mb-2 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">IFSC</small>
                    <code style={{ fontSize: '0.95rem' }}>{deposit.bank_ifsc}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('IFSC', deposit.bank_ifsc)}
                  >
                    <FiCopy />
                  </button>
                </div>

                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">UPI ID</small>
                    <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{deposit.upi_id}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('UPI ID', deposit.upi_id)}
                  >
                    <FiCopy />
                  </button>
                </div>

                {upiLink && (
                  <a
                    href={upiLink}
                    className="btn btn-warning w-100 d-inline-flex align-items-center justify-content-center gap-2 fw-bold"
                  >
                    <FiSmartphone />
                    Pay via UPI {upiAmount > 0 && `(₹${upiAmount.toLocaleString('en-IN')})`}
                  </a>
                )}
                <small className="text-muted d-block mt-2 text-center">
                  Opens your UPI app prefilled. Suggested amount = current shortfall.
                </small>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
