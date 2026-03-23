import { useState, useEffect } from 'react';
import { getTransactions } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import { FiFileText } from 'react-icons/fi';

export default function AdminWalletReport() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    getTransactions({ page, limit })
      .then((res) => {
        setTransactions(res.data.transactions || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {});
  }, [page]);

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'User', render: (row) => `${row.user_name || 'N/A'} (${row.user_phone || ''})` },
    { header: 'Service', render: (row) => <span className="text-capitalize">{row.service_type}</span> },
    { header: 'Operator', accessor: 'operator' },
    { header: 'Number', accessor: 'subscriber_id' },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Commission', render: (row) => `₹ ${row.commission}` },
    {
      header: 'Status',
      render: (row) => {
        const colors = { success: 'success', processing: 'warning', failed: 'danger', refunded: 'info', pending: 'secondary' };
        return <span className={`badge bg-${colors[row.status] || 'secondary'}`}>{row.status}</span>;
      },
    },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiFileText className="me-2" />
        Wallet Report
      </h4>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">All Wallet Transactions</h6>
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={transactions}
            totalPages={Math.ceil(total / limit)}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
