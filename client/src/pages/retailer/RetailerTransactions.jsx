import { useState, useEffect } from 'react';
import { getTransactions } from '../../api/retailer.api';
import DataTable from '../../components/common/DataTable';

const statusColors = { success: 'success', processing: 'warning', failed: 'danger', refunded: 'info', pending: 'secondary' };

export default function RetailerTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getTransactions({ page, limit: 20 }).then((res) => {
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
    }).catch(() => {});
  }, [page]);

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'Service', render: (row) => <span className="text-capitalize">{row.service_type}</span> },
    { header: 'Operator', accessor: 'operator' },
    { header: 'Number', accessor: 'subscriber_id' },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Commission', render: (row) => `₹ ${row.commission}` },
    { header: 'Status', render: (row) => <span className={`badge bg-${statusColors[row.status]}`}>{row.status}</span> },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">My Transactions</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={transactions} totalPages={Math.ceil(total / 20)} currentPage={page} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
