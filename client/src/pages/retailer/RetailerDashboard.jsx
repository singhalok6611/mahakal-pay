import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../api/retailer.api';
import StatCard from '../../components/common/StatCard';
import { FiSmartphone, FiTruck, FiMonitor, FiDollarSign, FiCheckCircle } from 'react-icons/fi';

const services = [
  { icon: FiSmartphone, title: 'Mobile Recharge', path: '/retailer/recharge?type=mobile', color: '#3498db', desc: 'Prepaid mobile recharge' },
  { icon: FiTruck, title: 'FASTag Recharge', path: '/retailer/recharge?type=fastag', color: '#2ecc71', desc: 'FASTag recharge' },
  { icon: FiMonitor, title: 'DTH Recharge', path: '/retailer/recharge?type=dth', color: '#e74c3c', desc: 'DTH recharge' },
];

export default function RetailerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((res) => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <h4 className="fw-bold mb-4">Retailer Dashboard</h4>

      {/* Wallet Balance */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <StatCard title="Wallet Balance" value={`₹ ${(data?.balance || 0).toFixed(2)}`} icon={FiDollarSign} color="success" />
        </div>
        <div className="col-md-4">
          <StatCard title="Today Success" value={`₹ ${data?.recharge?.success_amount || 0}`} subtitle={`${data?.recharge?.success_count || 0} txns`} icon={FiCheckCircle} color="primary" />
        </div>
        <div className="col-md-4">
          <StatCard title="Today Total" value={`₹ ${data?.recharge?.total_amount || 0}`} subtitle={`${data?.recharge?.total_count || 0} txns`} icon={FiDollarSign} color="info" />
        </div>
      </div>

      {/* Service Cards */}
      <h6 className="text-muted mb-3">Services</h6>
      <div className="row g-4 mb-4">
        {services.map((s, i) => (
          <div className="col-md-4" key={i}>
            <Link to={s.path} className="text-decoration-none">
              <div className="card border-0 shadow-sm h-100 text-center p-4 service-card">
                <div className="feature-icon mx-auto mb-3" style={{ background: s.color }}>
                  <s.icon size={32} color="#fff" />
                </div>
                <h5 className="fw-bold text-dark">{s.title}</h5>
                <p className="text-muted small mb-0">{s.desc}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      {data?.recentTransactions?.length > 0 && (
        <>
          <h6 className="text-muted mb-3">Recent Transactions</h6>
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Service</th>
                      <th>Operator</th>
                      <th>Number</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id}>
                        <td className="text-capitalize">{t.service_type}</td>
                        <td>{t.operator}</td>
                        <td>{t.subscriber_id}</td>
                        <td>₹ {t.amount}</td>
                        <td>
                          <span className={`badge bg-${t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
