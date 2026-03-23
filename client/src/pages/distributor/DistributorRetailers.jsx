import { useState, useEffect } from 'react';
import { getRetailers, createRetailer } from '../../api/distributor.api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

export default function DistributorRetailers() {
  const [retailers, setRetailers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shop_name: '', city: '' });
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    getRetailers({}).then((res) => setRetailers(res.data.users || [])).catch(() => {});
  };

  useEffect(fetch, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createRetailer(form);
      toast.success('Retailer created!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', password: '', shop_name: '', city: '' });
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: '#', render: (row) => row.id },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Shop', accessor: 'shop_name' },
    { header: 'Balance', render: (row) => `₹ ${(row.balance || 0).toFixed(2)}` },
    {
      header: 'Status',
      render: (row) => <span className={`badge bg-${row.status === 'active' ? 'success' : 'danger'}`}>{row.status}</span>,
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">My Retailers</h4>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Retailer</button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <DataTable columns={columns} data={retailers} emptyMessage="No retailers yet" />
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Retailer</h5>
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
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
