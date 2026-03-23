import { useState, useEffect } from 'react';
import { getTransactions } from '../../api/distributor.api';
import DataTable from '../../components/common/DataTable';

export default function DistributorReports() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    getTransactions({ limit: 100 }).then((res) => setTransactions(res.data.transactions || [])).catch(() => {});
  }, []);

  const totalSuccess = transactions.filter(t => t.status === 'success').reduce((s, t) => s + t.amount, 0);

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'Retailer', render: (row) => row.user_name },
    { header: 'Service', render: (row) => <span className="text-capitalize">{row.service_type}</span> },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Status', render: (row) => <span className={`badge bg-${row.status === 'success' ? 'success' : 'danger'}`}>{row.status}</span> },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">Reports</h4>
      <div className="card border-0 shadow-sm text-center p-3 mb-4">
        <small className="text-muted">Total Success Amount</small>
        <h4 className="text-success mb-0">₹ {totalSuccess.toFixed(2)}</h4>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={transactions} />
        </div>
      </div>
    </div>
  );
}
