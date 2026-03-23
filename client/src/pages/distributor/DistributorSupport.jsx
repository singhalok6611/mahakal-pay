import { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { FiHelpCircle } from 'react-icons/fi';

export default function DistributorSupport() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/distributor/support-ticket', form);
      toast.success('Support ticket created successfully!');
      setForm({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">
        <FiHelpCircle className="me-2" />
        Support
      </h4>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">Create Support Ticket</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Subject *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Brief description of your issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Message *</label>
              <textarea
                className="form-control"
                rows="5"
                placeholder="Describe your issue in detail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
