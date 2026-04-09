import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getTransactions } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';

const statusColors = { success: 'success', processing: 'warning', failed: 'danger', refunded: 'info', pending: 'secondary' };

export default function AdminTransactions() {
  const [searchParams] = useSearchParams();
  const userIdFilter = searchParams.get('user_id');

  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const params = { page, limit };
    if (filter) params.status = filter;
    if (userIdFilter) params.user_id = userIdFilter;
    getTransactions(params).then((res) => {
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
    }).catch(() => {});
  }, [page, filter, userIdFilter]);

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'User', render: (row) => `${row.user_name} (${row.user_phone})` },
    { header: 'Service', render: (row) => <span className="text-capitalize">{row.service_type}</span> },
    { header: 'Operator', accessor: 'operator' },
    { header: 'Number', accessor: 'subscriber_id' },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Commission', render: (row) => `₹ ${row.commission}` },
    {
      header: 'Status',
      render: (row) => <span className={`badge bg-${statusColors[row.status]}`}>{row.status}</span>,
    },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">All Transactions</h4>
      {userIdFilter && (
        <div className="alert alert-info d-flex align-items-center justify-content-between py-2">
          <span>
            Filtered by user <strong>#{userIdFilter}</strong>
            {transactions[0] && <> — {transactions[0].user_name} ({transactions[0].user_phone})</>}
          </span>
          <Link to="/admin/transactions" className="btn btn-sm btn-outline-secondary">Clear filter</Link>
        </div>
      )}
      <div className="mb-3">
        <div className="btn-group btn-group-sm">
          {['', 'success', 'processing', 'failed', 'refunded'].map((s) => (
            <button
              key={s}
              className={`btn btn-${filter === s ? 'primary' : 'outline-primary'}`}
              onClick={() => { setFilter(s); setPage(1); }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="card border-0 shadow-sm">
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
