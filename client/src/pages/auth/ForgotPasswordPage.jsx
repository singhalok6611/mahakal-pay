import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../api/auth.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="row justify-content-center align-items-center min-vh-100 py-4">
          <div className="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h3 className="fw-bold mb-1">
                    <span className="text-warning">MAHAKAL</span>{' '}
                    <span className="text-primary">PAY</span>
                  </h3>
                  <p className="text-muted" style={{ fontSize: '1.05rem' }}>Forgot your password?</p>
                </div>

                {submitted ? (
                  <div className="text-center py-3">
                    <FiCheckCircle size={48} className="text-success mb-3" />
                    <h5 className="fw-bold mb-2">Check your inbox</h5>
                    <p className="text-muted small">
                      If an account exists for <strong>{email}</strong>, we've sent a password reset link there. The link is valid for 1 hour.
                    </p>
                    <p className="text-muted small mb-0">
                      Don't see the email? Check your spam folder, or try again in a minute.
                    </p>
                    <Link to="/login" className="btn btn-link mt-3">
                      <FiArrowLeft className="me-1" /> Back to Sign In
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-muted small mb-3">
                      Enter the email address linked to your account and we'll send you a link to reset your password.
                    </p>
                    <form onSubmit={handleSubmit}>
                      <div className="mb-3">
                        <label className="form-label">
                          <FiMail className="me-2" size={14} />Email Address
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          style={{ fontSize: '1rem' }}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100"
                        disabled={loading}
                        style={{ fontSize: '1.05rem' }}
                      >
                        {loading && <span className="spinner-border spinner-border-sm me-2" style={{ width: '1rem', height: '1rem' }} />}
                        {loading ? 'Sending...' : 'Send Reset Link'}
                      </button>
                    </form>
                    <div className="text-center mt-4">
                      <Link to="/login" className="text-muted text-decoration-none d-inline-flex align-items-center gap-1" style={{ fontSize: '0.95rem' }}>
                        <FiArrowLeft size={14} /> Back to Sign In
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
