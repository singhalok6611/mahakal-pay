import { useState, useEffect } from 'react';
import { getKYCRequests, updateKYC } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function AdminKYC() {
  const [requests, setRequests] = useState([]);

  const fetch = () => {
    getKYCRequests({}).then((res) => setRequests(res.data.requests || [])).catch(() => {});
  };

  useEffect(fetch, []);

  const handleAction = async (id, status) => {
    try {
      await updateKYC(id, { status });
      toast.success(`KYC ${status}`);
      fetch();
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'User', render: (row) => `${row.user_name} (${row.user_phone})` },
    { header: 'Document', accessor: 'document_type' },
    { header: 'Number', accessor: 'document_number' },
    {
      header: 'Status',
      render: (row) => <span className={`badge bg-${row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}`}>{row.status}</span>,
    },
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
      <h4 className="fw-bold mb-4">KYC Requests</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={requests} emptyMessage="No KYC requests" />
        </div>
      </div>
    </div>
  );
}
