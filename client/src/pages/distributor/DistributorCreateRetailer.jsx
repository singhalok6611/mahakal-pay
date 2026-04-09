import { useState } from 'react';
import { createRetailer } from '../../api/distributor.api';
import toast from 'react-hot-toast';
import { FiUserPlus } from 'react-icons/fi';

export default function DistributorCreateRetailer() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    pan: '',
    shop_name: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pan = form.pan.trim().toUpperCase();
    if (!PAN_REGEX.test(pan)) {
      toast.error('PAN must be in format ABCDE1234F');
      return;
    }
    setLoading(true);
    try {
      await createRetailer({ ...form, pan });
      toast.success('Retailer created. Pending admin approval.');
      setForm({ name: '', email: '', phone: '', password: '', pan: '', shop_name: '', city: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create retailer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiUserPlus className="me-2" />
        Create Retailer
      </h4>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">New Retailer Registration</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Phone *</label>
              <input
                type="tel"
                className="form-control"
                placeholder="Enter 10-digit phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Set login password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">PAN Number *</label>
              <input
                type="text"
                className="form-control text-uppercase"
                placeholder="ABCDE1234F"
                value={form.pan}
                maxLength={10}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                required
              />
              <small className="text-muted">
                One PAN can have only one account. Retailer will be active after admin approval.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label">Shop Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter shop/business name"
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
              {loading ? 'Creating...' : 'Create Retailer (Pending Approval)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
