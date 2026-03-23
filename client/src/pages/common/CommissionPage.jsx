import { useState, useEffect } from 'react';
import api from '../../api/client';
import { FiPercent } from 'react-icons/fi';

const serviceLabels = { mobile: 'Prepaid', dth: 'DTH', fastag: 'FASTag' };

export default function CommissionPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/operators')
      .then((res) => setOperators(res.data))
      .catch(() => {
        // Fallback to retailer API if public not available
        api.get('/retailer/operators')
          .then((res) => setOperators(res.data))
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiPercent className="me-2" />
        MY COMMISSION
      </h4>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="table-dark">
                  <th>#</th>
                  <th>Operator</th>
                  <th>Service</th>
                  <th>Charge Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">Loading...</td>
                  </tr>
                ) : operators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">No operators found</td>
                  </tr>
                ) : (
                  operators.map((op, i) => (
                    <tr key={op.id || i}>
                      <td>{i + 1}</td>
                      <td className="fw-semibold">{op.name}</td>
                      <td>
                        <span className="badge bg-info text-dark">
                          {serviceLabels[op.service_type] || op.service_type}
                        </span>
                      </td>
                      <td>Percentage</td>
                      <td>
                        <span className="text-success fw-bold">{op.commission_pct}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
