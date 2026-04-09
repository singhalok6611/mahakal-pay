import { useEffect, useState } from 'react';
import {
  FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiExternalLink,
  FiCopy, FiSmartphone, FiDollarSign, FiInfo,
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
  const [topupAmount, setTopupAmount] = useState('');

  const load = async () => {
    setRefreshing(true);
    try {
      const [s, d] = await Promise.all([getFloatStatus(), getPay2allDeposit()]);
      setStatus(s.data);
      setDeposit(d.data);
      // Pre-fill the top-up box with the live shortfall the FIRST time only,
      // so the admin can clearly see "this is what you need" but can edit it.
      if (s.data?.delta < 0 && !topupAmount) {
        setTopupAmount(String(Math.round(Math.abs(s.data.delta))));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load float status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const copy = (label, value) => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Copy failed'));
  };

  // The Razorpay-issued virtual VPA (rpy.*@icici) refuses direct
  // consumer UPI deep links — Razorpay only accepts payments to that
  // VPA via their own checkout session (which is what erp.pay2all.in
  // uses internally). So instead of generating a upi://pay?... deep
  // link that fails with "Payment declined by receiver", we route the
  // UPI button + QR through Pay2All's portal, which DOES work.
  //
  // The bank transfer (NEFT/IMPS to the virtual A/c above) is the only
  // way to top up that doesn't require leaving our portal — that path
  // uses different rails and is unaffected.
  const upiAmountNum = Math.max(0, parseFloat(topupAmount) || 0);
  const pay2allCheckoutUrl = 'https://erp.pay2all.in';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(pay2allCheckoutUrl)}`;

  if (loading) {
    return <div className="card border-0 shadow-sm p-4 mb-4 text-center text-muted">Loading float status…</div>;
  }
  if (!status) return null;

  const theme = HEALTH_THEME[status.health] || HEALTH_THEME.warning;
  const Icon = theme.icon;

  return (
    // align-items-start so the (shorter) Float Health card doesn't get
    // stretched to match the (taller) Top Up Pay2All card and end up with
    // empty white space inside it.
    <div className="row g-3 mb-4 align-items-start">
      {/* ── Float health summary ───────────────────────────── */}
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm" style={{ overflow: 'hidden' }}>
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
                  Send money via <strong>NEFT / IMPS / RTGS</strong> from any bank app to the
                  virtual account below. It auto-credits the Pay2All master wallet.
                </p>

                <div className="mb-2">
                  <small className="text-muted d-block">Account Holder</small>
                  <div className="fw-semibold">{deposit.account_holder || <span className="text-muted">—</span>}</div>
                </div>

                <div className="mb-2 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">Virtual A/c Number</small>
                    <code style={{ fontSize: '0.95rem' }}>{deposit.bank_account_number || <span className="text-muted">—</span>}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('Account number', deposit.bank_account_number)}
                    disabled={!deposit.bank_account_number}
                  >
                    <FiCopy />
                  </button>
                </div>

                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">IFSC</small>
                    <code style={{ fontSize: '0.95rem' }}>{deposit.bank_ifsc || <span className="text-muted">—</span>}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('IFSC', deposit.bank_ifsc)}
                    disabled={!deposit.bank_ifsc}
                  >
                    <FiCopy />
                  </button>
                </div>

                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted d-block">UPI ID</small>
                    <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{deposit.upi_id || <span className="text-muted">—</span>}</code>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => copy('UPI ID', deposit.upi_id)}
                    disabled={!deposit.upi_id}
                  >
                    <FiCopy />
                  </button>
                </div>

                <div className="mb-2">
                  <small className="text-muted d-block">Top-up amount (₹)</small>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter amount"
                    value={topupAmount}
                    min="1"
                    onChange={(e) => setTopupAmount(e.target.value)}
                  />
                  <small className="text-muted">
                    <FiInfo size={11} className="me-1" />
                    Pre-filled with the current shortfall ({status.delta < 0 ? `₹${Math.round(Math.abs(status.delta)).toLocaleString('en-IN')}` : '₹0'}).
                  </small>
                </div>

                <a
                  href={pay2allCheckoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-warning w-100 d-inline-flex align-items-center justify-content-center gap-2 fw-bold mb-2"
                >
                  <FiSmartphone />
                  Pay via UPI{upiAmountNum > 0 ? ` (₹${upiAmountNum.toLocaleString('en-IN')})` : ''}
                </a>
                <small className="text-muted d-block text-center mb-2">
                  Opens Pay2All checkout — UPI works there. (Direct UPI to the VPA above
                  is rejected by Razorpay.)
                </small>
                <div className="text-center p-2" style={{ background: '#f8f9ff', borderRadius: 12 }}>
                  <img
                    src={qrUrl}
                    alt="QR to open Pay2All portal"
                    width={180}
                    height={180}
                    style={{ display: 'block', margin: '0 auto' }}
                  />
                  <small className="text-muted d-block mt-1">
                    Scan to open Pay2All on your phone
                  </small>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
