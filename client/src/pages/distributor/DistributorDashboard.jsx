import { useState, useEffect } from 'react';
import { getDashboard } from '../../api/distributor.api';
import StatCard from '../../components/common/StatCard';
import { FiCheckCircle, FiClock, FiXCircle, FiUsers, FiDollarSign } from 'react-icons/fi';

export default function DistributorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((res) => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!data) return <div className="text-center py-5 text-danger">Failed to load</div>;

  return (
    <div>
      <h4 className="fw-bold mb-4">Distributor Dashboard</h4>

      <h6 className="text-muted mb-3">Today Recharge</h6>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard title="Success" value={`₹ ${data.recharge.success_amount}`} subtitle={`${data.recharge.success_count} txns`} icon={FiCheckCircle} color="success" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title="In Process" value={`₹ ${data.recharge.processing_amount}`} icon={FiClock} color="warning" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title="Failed" value={`₹ ${data.recharge.failed_amount}`} icon={FiXCircle} color="danger" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard title="Total" value={`₹ ${data.recharge.total_amount}`} icon={FiDollarSign} color="primary" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <StatCard title="My Balance" value={`₹ ${data.wallet.balance.toFixed(2)}`} icon={FiDollarSign} color="success" />
        </div>
        <div className="col-md-4">
          <StatCard title="Total Retailers" value={data.retailers.count} icon={FiUsers} color="primary" />
        </div>
        <div className="col-md-4">
          <StatCard title="Retailers Balance" value={`₹ ${data.retailers.balance.toFixed(2)}`} icon={FiDollarSign} color="info" />
        </div>
      </div>
    </div>
  );
}
