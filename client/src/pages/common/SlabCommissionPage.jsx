import { useState, useEffect } from 'react';
import api from '../../api/client';
import { FiLayers } from 'react-icons/fi';

const serviceLabels = { mobile: 'Prepaid', dth: 'DTH', fastag: 'FASTag' };
const serviceOrder = ['mobile', 'dth', 'fastag'];

// Soft tinted styles per service so the badges sit calmly inside the
// table instead of competing with it. All three pull from the same
// navy-indigo-purple palette as the rest of the dashboard.
const serviceStyles = {
  mobile: { bg: '#e8eaf6', color: '#1a237e', border: '#c5cae9' }, // indigo
  dth:    { bg: '#ede7f6', color: '#4527a0', border: '#d1c4e9' }, // deep purple
  fastag: { bg: '#fff8e1', color: '#8d6e00', border: '#ffecb3' }, // amber/gold
};

// Card header gradient — same family as the sidebar but slightly lighter
// so the section header has presence without going neon-bright.
const headerStyle = {
  background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #4527a0 100%)',
  color: '#fff',
  borderBottom: '3px solid #ffc107',
};

export default function SlabCommissionPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/operators')
      .then((res) => setOperators(res.data))
      .catch(() => {
        api.get('/retailer/operators')
          .then((res) => setOperators(res.data))
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = serviceOrder
    .map((type) => ({
      type,
      label: serviceLabels[type],
      items: operators.filter((op) => op.service_type === type),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiLayers className="me-2" />
        My Slab Commission
      </h4>

      {loading ? (
        <div className="text-center py-5 text-muted">Loading...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-5 text-muted">No commission data found</div>
      ) : (
        grouped.map((group) => {
          const s = serviceStyles[group.type] || serviceStyles.mobile;
          return (
            <div key={group.type} className="card border-0 shadow-sm mb-4">
              <div className="card-header py-3" style={headerStyle}>
                <h6 className="mb-0 fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  {group.label} Commission Slab
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#f5f7fb' }}>
                      <tr style={{ color: '#37474f' }}>
                        <th className="py-3" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>#</th>
                        <th className="py-3" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>OPERATOR</th>
                        <th className="py-3" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>SERVICE</th>
                        <th className="py-3" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>CHARGE TYPE</th>
                        <th className="py-3" style={{ fontSize: '0.78rem', letterSpacing: '0.5px' }}>COMMISSION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((op, i) => (
                        <tr key={op.id || i}>
                          <td className="text-muted">{i + 1}</td>
                          <td className="fw-semibold">{op.name}</td>
                          <td>
                            <span
                              className="badge rounded-pill"
                              style={{
                                background: s.bg,
                                color: s.color,
                                border: `1px solid ${s.border}`,
                                fontWeight: 600,
                                padding: '6px 12px',
                              }}
                            >
                              {group.label}
                            </span>
                          </td>
                          <td className="text-muted">Percentage</td>
                          <td>
                            <span
                              className="badge rounded-pill"
                              style={{
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                border: '1px solid #c8e6c9',
                                fontWeight: 700,
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                              }}
                            >
                              {op.commission_pct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
