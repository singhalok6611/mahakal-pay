import { useState, useEffect } from 'react';
import { getUsers, createDistributor, updateUser } from '../../api/admin.api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shop_name: '', city: '' });
  const [loading, setLoading] = useState(false);

  const fetchUsers = () => {
    getUsers({}).then((res) => setUsers(res.data.users || [])).catch(() => {});
  };

  useEffect(fetchUsers, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDistributor(form);
      toast.success('Distributor created!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', shop_name: '', city: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      await updateUser(user.id, { status: newStatus });
      toast.success(`User ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Role', render: (row) => <span className="badge bg-info text-capitalize">{row.role}</span> },
    { header: 'City', accessor: 'city' },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge bg-${row.status === 'active' ? 'success' : 'danger'}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          className={`btn btn-sm btn-${row.status === 'active' ? 'danger' : 'success'}`}
          onClick={() => toggleStatus(row)}
        >
          {row.status === 'active' ? 'Block' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Users</h4>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Create Distributor
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={users} />
        </div>
      </div>

      {/* Create Distributor Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Distributor</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name *</label>
                    <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone *</label>
                    <input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Shop Name</label>
                    <input type="text" className="form-control" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">City</label>
                    <input type="text" className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
