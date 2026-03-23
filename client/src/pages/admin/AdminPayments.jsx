import { useState, useEffect } from 'react';
import { getPaymentRequests, updatePaymentRequest } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const [requests, setRequests] = useState([]);

  const fetch = () => {
    getPaymentRequests({}).then((res) => setRequests(res.data.requests || [])).catch(() => {});
  };

  useEffect(fetch, []);

  const handleAction = async (id, status) => {
    try {
      await updatePaymentRequest(id, { status });
      toast.success(`Payment request ${status}`);
      fetch();
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'User', render: (row) => `${row.user_name} (${row.user_phone})` },
    { header: 'Amount', render: (row) => `₹ ${row.amount}` },
    { header: 'Mode', accessor: 'payment_mode' },
    { header: 'Reference', accessor: 'reference_no' },
    {
      header: 'Status',
      render: (row) => <span className={`badge bg-${row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}`}>{row.status}</span>,
    },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
    {
      header: 'Action',
      render: (row) => row.status === 'pending' ? (
        <div className="btn-group btn-group-sm">
          <button className="btn btn-success" onClick={() => handleAction(row.id, 'approved')}>Approve</button>
          <button className="btn btn-danger" onClick={() => handleAction(row.id, 'rejected')}>Reject</button>
        </div>
      ) : '-',
    },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">Payment Requests</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={requests} emptyMessage="No payment requests" />
        </div>
      </div>
    </div>
  );
}
