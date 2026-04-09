import { useState, useEffect } from 'react';
import { createDistributor, getUsers } from '../../api/admin.api';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminAddCustomer() {
  const [tab, setTab] = useState('retailer');
  const [distributors, setDistributors] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', pan: '',
    shop_name: '', city: '', pincode: '', address: '',
    parent_id: ''
  });
  const [loading, setLoading] = useState(false);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  useEffect(() => {
    getUsers({ role: 'distributor' }).then(res => setDistributors(res.data.users || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pan = form.pan.trim().toUpperCase();
    if (!PAN_REGEX.test(pan)) {
      toast.error('PAN must be in format ABCDE1234F');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, pan };
      if (tab === 'distributor') {
        await createDistributor(payload);
        toast.success('Distributor created!');
      } else {
        await api.post('/admin/users/retailer', { ...payload, parent_id: parseInt(form.parent_id) });
        toast.success('Retailer created!');
      }
      setForm({ name: '', email: '', phone: '', password: '', pan: '', shop_name: '', city: '', pincode: '', address: '', parent_id: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const title = tab === 'retailer' ? 'ADD RETAILER' : 'ADD DISTRIBUTOR';
  const btnLabel = tab === 'retailer' ? 'Add Retailer' : 'Add Distributor';

  return (
    <div>
      <h4 className="fw-bold mb-4">Add Customer</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6 className="text-primary fw-bold mb-3">FILL BELOW FORM</h6>
          <hr />
          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button className={`nav-link ${tab === 'retailer' ? 'active' : ''}`} onClick={() => setTab('retailer')}>Retailer</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${tab === 'distributor' ? 'active' : ''}`} onClick={() => setTab('distributor')}>Distributor</button>
            </li>
          </ul>

          <h6 className="text-primary fw-bold mb-4">{title}</h6>

          <form onSubmit={handleSubmit}>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Name <span className="text-danger">*</span></label>
              <div className="col-md-9">
                <input type="text" className="form-control" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Username <span className="text-danger">*</span></label>
              <div className="col-md-9">
                <input type="email" className="form-control" placeholder="Email/Username" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Mobile <span className="text-danger">*</span></label>
              <div className="col-md-9">
                <input type="tel" className="form-control" placeholder="Mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
              </div>
            </div>
            {tab === 'retailer' && (
              <div className="row mb-3 align-items-center">
                <label className="col-md-3 fw-semibold">Select Parent <span className="text-danger">*</span></label>
                <div className="col-md-9">
                  <select className="form-select" value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})} required>
                    <option value="">- Select Distributor -</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} [{d.phone}]</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Email</label>
              <div className="col-md-9">
                <input type="email" className="form-control" placeholder="Email" value={form.email} disabled />
                <small className="text-muted">Same as username</small>
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Company Name</label>
              <div className="col-md-9">
                <input type="text" className="form-control" placeholder="Company" value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">City</label>
              <div className="col-md-9">
                <input type="text" className="form-control" placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Postal Code</label>
              <div className="col-md-9">
                <input type="text" className="form-control" placeholder="Postal Code" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Address</label>
              <div className="col-md-9">
                <input type="text" className="form-control" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">PAN Number <span className="text-danger">*</span></label>
              <div className="col-md-9">
                <input
                  type="text"
                  className="form-control text-uppercase"
                  placeholder="ABCDE1234F"
                  value={form.pan}
                  maxLength={10}
                  onChange={e => setForm({...form, pan: e.target.value.toUpperCase()})}
                  required
                />
                <small className="text-muted">One PAN can have only one account.</small>
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Password <span className="text-danger">*</span></label>
              <div className="col-md-9">
                <input type="password" className="form-control" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
            </div>
            <div className="row">
              <div className="col-md-9 offset-md-3">
                <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                  {loading ? 'Creating...' : btnLabel}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
