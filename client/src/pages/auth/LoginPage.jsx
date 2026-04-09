import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiLock, FiMail, FiArrowLeft } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
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
                  <p className="text-muted" style={{ fontSize: '1.05rem' }}>Sign in to your account</p>
                </div>
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
                  <div className="mb-4">
                    <label className="form-label">
                      <FiLock className="me-2" size={14} />Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
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
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" style={{ width: '1rem', height: '1rem' }} />
                    ) : null}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
                <div className="text-center mt-3">
                  <Link
                    to="/forgot-password"
                    className="text-decoration-none small"
                    style={{ color: '#3498db' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="text-center mt-3">
                  <Link to="/" className="text-muted text-decoration-none d-inline-flex align-items-center gap-1" style={{ fontSize: '0.95rem' }}>
                    <FiArrowLeft size={14} /> Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
