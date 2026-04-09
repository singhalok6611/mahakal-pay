import { useState, useEffect } from 'react';
import { getDashboard } from '../../api/admin.api';
import StatCard from '../../components/common/StatCard';
import FloatHealthCard from '../../components/admin/FloatHealthCard';
import {
  FiCheckCircle, FiClock, FiXCircle, FiRefreshCw, FiUsers,
  FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiCreditCard,
  FiMessageSquare, FiAlertCircle, FiCheckSquare, FiTrendingUp
} from 'react-icons/fi';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!data) return <div className="text-center py-5 text-danger">Failed to load dashboard</div>;

  const earnings = data.earnings || {};
  const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;

  return (
    <div>
      <h4 className="fw-bold mb-4">Dashboard</h4>

      {/* Pay2All float health card — shows whether the upstream master
          wallet has enough money to back every internal credit, plus
          the deposit info to top it up. Lives at the top because if
          this is red, nothing else matters. */}
      <FloatHealthCard />

      {/* Slice 5: admin commission earnings — aggregated from
          commission_splits (slice 3) at all four time windows. */}
      <h6 className="text-muted mb-3">My Earnings (admin override)</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard title="Today" value={fmtMoney(earnings.admin_today)} icon={FiTrendingUp} color="success" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title="Last 7 Days" value={fmtMoney(earnings.admin_last_7_days)} icon={FiTrendingUp} color="primary" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title="This Month" value={fmtMoney(earnings.admin_this_month)} icon={FiTrendingUp} color="info" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title={`Lifetime (${earnings.count || 0} txns)`} value={fmtMoney(earnings.admin_total_lifetime)} icon={FiTrendingUp} color="dark" />
        </div>
      </div>

      {/* Today Recharge */}
      <h6 className="text-muted mb-3">Today Recharge</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg">
          <StatCard title="Success" value={`₹ ${data.recharge.success_amount}`} subtitle={`${data.recharge.success_count} txns`} icon={FiCheckCircle} color="success" />
        </div>
        <div className="col-6 col-lg">
          <StatCard title="In Process" value={`₹ ${data.recharge.processing_amount}`} subtitle={`${data.recharge.processing_count} txns`} icon={FiClock} color="warning" />
        </div>
        <div className="col-6 col-lg">
          <StatCard title="Failure" value={`₹ ${data.recharge.failed_amount}`} subtitle={`${data.recharge.failed_count} txns`} icon={FiXCircle} color="danger" />
        </div>
        <div className="col-6 col-lg">
          <StatCard title="Refund" value={`₹ ${data.recharge.refund_amount}`} subtitle={`${data.recharge.refund_count} txns`} icon={FiRefreshCw} color="info" />
        </div>
        <div className="col-12 col-lg">
          <StatCard title="Total" value={`₹ ${data.recharge.total_amount}`} subtitle={`${data.recharge.total_count} txns`} icon={FiDollarSign} color="primary" />
        </div>
      </div>

      {/* Users */}
      <h6 className="text-muted mb-3">Users</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <StatCard title="Distributors" value={data.users.distributors} icon={FiUsers} color="primary" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Retailers" value={data.users.retailers} icon={FiUsers} color="success" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard title="Total" value={data.users.total} icon={FiUsers} color="dark" />
        </div>
      </div>

      {/* Main Balance */}
      <h6 className="text-muted mb-3">Main Balance</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <StatCard title="Distributors" value={`₹ ${data.balance.distributors.toFixed(3)}`} icon={FiDollarSign} color="primary" />
        </div>
        <div className="col-6 col-md-4">
          <StatCard title="Retailers" value={`₹ ${data.balance.retailers.toFixed(3)}`} icon={FiDollarSign} color="success" />
        </div>
        <div className="col-12 col-md-4">
          <StatCard title="Total" value={`₹ ${data.balance.total.toFixed(3)}`} icon={FiDollarSign} color="dark" />
        </div>
      </div>

      {/* Today Statement */}
      <h6 className="text-muted mb-3">Today Statement</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ background: '#2d3436', borderRadius: 14 }}>
            <small className="fw-bold text-white">Opening Bal.</small>
            <h5 className="mb-0 text-white mt-1">₹ {(data.statement.opening_balance || 0).toFixed(3)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-primary">Credit</small>
            <h5 className="mb-0 mt-1">₹ {data.statement.credit.toFixed(0)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-danger">Debit</small>
            <h5 className="mb-0 mt-1">₹ {data.statement.debit.toFixed(0)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-info">Payment Req.</small>
            <h5 className="mb-0 mt-1">₹ {data.statement.payment_requests.toFixed(0)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-warning">Comm.</small>
            <h5 className="mb-0 mt-1">₹ {data.statement.commission.toFixed(3)}</h5>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ background: '#1a237e', borderRadius: 14 }}>
            <small className="fw-bold text-white">Closing Bal.</small>
            <h5 className="mb-0 text-white mt-1">₹ {(data.statement.closing_balance || 0).toFixed(3)}</h5>
          </div>
        </div>
      </div>

      {/* Today Payment Request */}
      <h6 className="text-muted mb-3">Today Payment Request</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-success">Accepted</small>
            <h5 className="mb-0 mt-1">₹ {(data.paymentRequests?.accepted_amount || 0)} | {data.paymentRequests?.accepted_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-warning">Pending</small>
            <h5 className="mb-0 mt-1">₹ {(data.paymentRequests?.pending_amount || 0)} | {data.paymentRequests?.pending_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-danger">Rejected</small>
            <h5 className="mb-0 mt-1">₹ {(data.paymentRequests?.rejected_amount || 0)} | {data.paymentRequests?.rejected_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ background: '#f5f5f5', borderRadius: 14 }}>
            <small className="fw-bold text-dark">Total</small>
            <h5 className="mb-0 mt-1">₹ {(data.paymentRequests?.total_amount || 0)} | {data.paymentRequests?.total_count || 0}</h5>
          </div>
        </div>
      </div>

      {/* Today Support Tickets */}
      <h6 className="text-muted mb-3">Today Support Tickets</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-success">Open</small>
            <h5 className="mb-0 mt-1">{data.supportTickets?.open_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-warning">Pending</small>
            <h5 className="mb-0 mt-1">{data.supportTickets?.pending_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ borderRadius: 14 }}>
            <small className="fw-bold text-danger">Closed</small>
            <h5 className="mb-0 mt-1">{data.supportTickets?.closed_count || 0}</h5>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3 h-100" style={{ background: '#f5f5f5', borderRadius: 14 }}>
            <small className="fw-bold text-dark">Total</small>
            <h5 className="mb-0 mt-1">{data.supportTickets?.total_count || 0}</h5>
          </div>
        </div>
      </div>
    </div>
  );
}
