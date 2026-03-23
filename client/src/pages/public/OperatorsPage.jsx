import { useState, useEffect } from 'react';
import api from '../../api/client';
import { FiSmartphone, FiTruck, FiMonitor } from 'react-icons/fi';

const typeIcons = {
  mobile: { icon: FiSmartphone, color: '#3498db', bg: '#ebf5fb' },
  dth: { icon: FiMonitor, color: '#e74c3c', bg: '#fdedec' },
  fastag: { icon: FiTruck, color: '#2ecc71', bg: '#eafaf1' },
};

const typeLabels = {
  mobile: 'Prepaid & Postpaid Operators',
  dth: 'DTH Operators',
  fastag: 'FASTag Operators',
};

export default function OperatorsPage() {
  const [operators, setOperators] = useState([]);

  useEffect(() => {
    api.get('/operators').then((res) => setOperators(res.data)).catch(() => {});
  }, []);

  const groups = ['mobile', 'dth', 'fastag'];

  return (
    <>
      <div className="page-banner">
        <div className="container">
          <h2>Our Operators</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem' }}>
            We support all major operators across India
          </p>
        </div>
      </div>
      <div className="container py-5">
        {groups.map((type) => {
          const ops = operators.filter((o) => o.service_type === type);
          if (ops.length === 0) return null;
          const { icon: Icon, color, bg } = typeIcons[type];

          return (
            <div className="mb-5" key={type}>
              <h4 className="operator-group-title">
                <Icon size={24} className="me-2" style={{ color }} />
                {typeLabels[type]}
              </h4>
              <div className="row g-3">
                {ops.map((op) => (
                  <div className="col-6 col-md-4 col-lg-3" key={op.id}>
                    <div className="card operator-card h-100">
                      <div className="card-body d-flex align-items-center gap-3 p-3">
                        <div className="op-icon" style={{ background: bg }}>
                          <Icon size={22} style={{ color }} />
                        </div>
                        <h6>{op.name}</h6>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
