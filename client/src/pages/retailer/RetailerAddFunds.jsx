import { useEffect, useState } from 'react';
import { FiCreditCard, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getPaymentConfig, createOrder, verifyPayment, myOrders } from '../../api/payment.api';

// Lazily inject Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RetailerAddFunds() {
  const { user, balance, refreshBalance } = useAuth();
  const [config, setConfig] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getPaymentConfig().then((res) => setConfig(res.data)).catch(() => {});
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await myOrders();
      setOrders(res.data.orders || []);
    } catch {}
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (config && (amt < config.min || amt > config.max)) {
      return toast.error(`Amount must be between ₹${config.min} and ₹${config.max}`);
    }

    setLoading(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load Razorpay checkout');

      const orderRes = await createOrder(amt);
      const { orderId, amount: orderAmount, currency, keyId } = orderRes.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: orderAmount,
        currency,
        name: 'Mahakal Pay',
        description: 'Wallet top-up',
        order_id: orderId,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#0d6efd' },
        handler: async (resp) => {
          try {
            const v = await verifyPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success(`Wallet credited ₹${v.data.credited.toFixed(2)} (₹${v.data.platformFee.toFixed(2)} platform fee)`);
            setAmount('');
            await refreshBalance();
            loadOrders();
          } catch (err) {
            toast.error(err.response?.data?.error || 'Verification failed');
          }
        },
        modal: {
          ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }),
        },
      });

      rzp.on('payment.failed', (resp) => {
        toast.error(resp.error?.description || 'Payment failed');
      });

      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  };

  const fee = config ? ((parseFloat(amount || 0) * config.platformFeePct) / 100).toFixed(2) : '0.00';
  const credited = config ? (parseFloat(amount || 0) - parseFloat(fee)).toFixed(2) : '0.00';

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiCreditCard className="me-2" />
        Add Funds (Online)
      </h4>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm text-center p-4 mb-3">
            <small className="text-muted">Current Wallet Balance</small>
            <h2 className="text-success mb-0">₹ {balance.toFixed(2)}</h2>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0"><FiZap className="me-1" /> Pay via UPI / Card / Netbanking</h6>
            </div>
            <div className="card-body">
              {!config?.configured && (
                <div className="alert alert-warning small">
                  Payment gateway is not configured. Set <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in your server <code>.env</code> file.
                </div>
              )}
              <form onSubmit={handlePay}>
                <div className="mb-3">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    min={config?.min || 100}
                    max={config?.max || 100000}
                    placeholder={`Min ₹${config?.min || 100}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {amount && (
                  <div className="bg-light p-3 rounded mb-3 small">
                    <div className="d-flex justify-content-between">
                      <span>You pay:</span>
                      <strong>₹ {parseFloat(amount).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between text-muted">
                      <span>Platform fee ({config?.platformFeePct || 1}%):</span>
                      <span>− ₹ {fee}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between text-success">
                      <strong>Credited to wallet:</strong>
                      <strong>₹ {credited}</strong>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 btn-lg"
                  disabled={loading || !config?.configured}
                >
                  {loading ? 'Processing...' : 'Pay & Add Funds'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="mb-0">Recent Top-ups</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan="3" className="text-center text-muted py-3">No top-ups yet</td></tr>
                    )}
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.created_at).toLocaleString()}</td>
                        <td>₹ {o.amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge bg-${o.status === 'paid' ? 'success' : o.status === 'failed' ? 'danger' : 'secondary'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
