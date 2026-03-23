import { useState, useEffect } from 'react';
import api from '../../api/client';
import { FiLayers } from 'react-icons/fi';

const serviceLabels = { mobile: 'Prepaid', dth: 'DTH', fastag: 'FASTag' };
const serviceOrder = ['mobile', 'dth', 'fastag'];

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
        MY SLAB COMMISSION
      </h4>

      {loading ? (
        <div className="text-center py-5 text-muted">Loading...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-5 text-muted">No commission data found</div>
      ) : (
        grouped.map((group) => (
          <div key={group.type} className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">{group.label} Commission Slab</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr className="table-dark">
                      <th>#</th>
                      <th>Operator</th>
                      <th>Service</th>
                      <th>Charge Type</th>
                      <th>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((op, i) => (
                      <tr key={op.id || i}>
                        <td>{i + 1}</td>
                        <td className="fw-semibold">{op.name}</td>
                        <td>
                          <span className="badge bg-info text-dark">{group.label}</span>
                        </td>
                        <td>Percentage</td>
                        <td>
                          <span className="text-success fw-bold">{op.commission_pct}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
