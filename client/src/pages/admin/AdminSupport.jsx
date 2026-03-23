import { useState, useEffect } from 'react';
import { getSupportTickets, updateSupportTicket } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);

  const fetch = () => {
    getSupportTickets({}).then((res) => setTickets(res.data.tickets || [])).catch(() => {});
  };

  useEffect(fetch, []);

  const handleStatus = async (id, status) => {
    try {
      await updateSupportTicket(id, { status });
      toast.success('Ticket updated');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'User', render: (row) => `${row.user_name} (${row.user_phone})` },
    { header: 'Subject', accessor: 'subject' },
    { header: 'Message', render: (row) => <span className="text-truncate d-inline-block" style={{ maxWidth: 200 }}>{row.message}</span> },
    {
      header: 'Status',
      render: (row) => <span className={`badge bg-${row.status === 'resolved' ? 'success' : row.status === 'closed' ? 'secondary' : 'warning'}`}>{row.status}</span>,
    },
    { header: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
    {
      header: 'Action',
      render: (row) => row.status !== 'closed' ? (
        <select className="form-select form-select-sm" style={{ width: 120 }} value={row.status} onChange={(e) => handleStatus(row.id, e.target.value)}>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      ) : '-',
    },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">Support Tickets</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={tickets} emptyMessage="No support tickets" />
        </div>
      </div>
    </div>
  );
}
