import { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiClock, FiSend } from 'react-icons/fi';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-banner">
        <div className="container">
          <h2>Contact Us</h2>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem' }}>
            We'd love to hear from you
          </p>
        </div>
      </div>
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm p-4 p-lg-5">
              <h4 className="fw-bold mb-4" style={{ fontSize: '1.4rem' }}>
                <FiSend className="me-2" size={22} />Send us a message
              </h4>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Your Name *</label>
                    <input type="text" className="form-control" placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-control" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-control" placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Subject *</label>
                    <input type="text" className="form-control" placeholder="Enter subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Message *</label>
                    <textarea className="form-control" rows="5" placeholder="Write your message here..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary btn-lg px-5" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm p-4 p-lg-5 h-100">
              <h4 className="fw-bold mb-4" style={{ fontSize: '1.4rem' }}>Contact Information</h4>
              <div className="d-flex flex-column gap-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#3498db', width: 55, height: 55 }}>
                    <FiMail size={22} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.05rem' }}>Email</h6>
                    <p className="mb-0" style={{ color: '#666' }}>support@mahakal.com</p>
                  </div>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#2ecc71', width: 55, height: 55 }}>
                    <FiPhone size={22} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.05rem' }}>Phone</h6>
                    <p className="mb-0" style={{ color: '#666' }}>+91 9999999999</p>
                  </div>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div className="feature-icon flex-shrink-0" style={{ background: '#f39c12', width: 55, height: 55 }}>
                    <FiClock size={22} color="#fff" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '1.05rem' }}>Support Hours</h6>
                    <p className="mb-0" style={{ color: '#666' }}>Mon - Sat: 10:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              <div className="p-3 rounded-3" style={{ background: '#f8f9ff' }}>
                <h6 className="fw-bold mb-2" style={{ fontSize: '1.05rem' }}>Want to become a partner?</h6>
                <p className="mb-0" style={{ fontSize: '0.95rem', color: '#666' }}>
                  Contact us to become a distributor or retailer. Start your recharge business today with Mahakal Pay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
