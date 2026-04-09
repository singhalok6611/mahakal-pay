import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { resetPassword } from '../../api/auth.api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      toast.success('Password reset successful');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="container">
          <div className="row justify-content-center align-items-center min-vh-100 py-4">
            <div className="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
              <div className="card shadow-lg border-0">
                <div className="card-body p-4 p-md-5 text-center">
                  <h5 className="fw-bold mb-3 text-danger">Invalid Reset Link</h5>
                  <p className="text-muted">This reset link is missing a token. Request a new one.</p>
                  <Link to="/forgot-password" className="btn btn-primary mt-2">Request New Link</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="container">
        <div className="row justify-content-center align-items-center min-vh-100 py-4">
          <div className="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <img src="/logo-mark.svg" alt="Mahakal Pay" width="64" height="64" className="mb-2" />
                  <h3 className="fw-bold mb-1">
                    <span className="text-warning">MAHAKAL</span>{' '}
                    <span className="text-primary">PAY</span>
                  </h3>
                  <p className="text-muted" style={{ fontSize: '1.05rem' }}>Set a new password</p>
                </div>

                {done ? (
                  <div className="text-center py-3">
                    <FiCheckCircle size={48} className="text-success mb-3" />
                    <h5 className="fw-bold mb-2">Password updated</h5>
                    <p className="text-muted small">
                      Redirecting you to the sign-in page…
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label">
                        <FiLock className="me-2" size={14} />New Password
                      </label>
                      <input
                        type="password"
                        className="form-control form-control-lg"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        minLength={6}
                        required
                        style={{ fontSize: '1rem' }}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="form-label">
                        <FiLock className="me-2" size={14} />Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="form-control form-control-lg"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter the password"
                        minLength={6}
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
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                    <div className="text-center mt-4">
                      <Link to="/login" className="text-muted text-decoration-none d-inline-flex align-items-center gap-1" style={{ fontSize: '0.95rem' }}>
                        <FiArrowLeft size={14} /> Back to Sign In
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
