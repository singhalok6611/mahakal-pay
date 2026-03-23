import { useState } from 'react';
import { createSupportTicket } from '../../api/retailer.api';
import toast from 'react-hot-toast';

export default function RetailerSupport() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createSupportTicket(form);
      toast.success('Support ticket created');
      setForm({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">Support</h4>
      <div className="card border-0 shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <h6 className="mb-3">Create Support Ticket</h6>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Subject</label>
              <input type="text" className="form-control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Message</label>
              <textarea className="form-control" rows="4" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
