import { useEffect, useState } from 'react';
import {
  FiKey, FiCopy, FiRefreshCw, FiEye, FiEyeOff, FiSearch, FiAlertTriangle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getUsers, resetUserPassword } from '../../api/admin.api';

/**
 * AdminCredentials — listing of every distributor + retailer with their
 * login email, plus a "Reset Password" action that sets a new password
 * (admin-provided OR server-generated) and reveals it ONCE.
 *
 * The platform stores password hashes (bcrypt), so the existing password
 * literally cannot be displayed — this page is the supported way for an
 * admin to recover access for a user (e.g. user calls support saying
 * "I forgot my password and the email reset isn't reaching me").
 */

const ROLE_BADGES = { distributor: 'info', retailer: 'warning' };

export default function AdminCredentials() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { user, mode: 'choose'|'done', newPassword?, customPassword }
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        getUsers({ role: 'distributor' }),
        getUsers({ role: 'retailer' }),
      ]);
      setUsers([...(d.data.users || []), ...(r.data.users || [])]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.pan || '').toLowerCase().includes(q)
    );
  });

  const openReset = (user) => {
    setModal({ user, mode: 'choose', customPassword: '' });
    setRevealed(false);
  };
  const closeModal = () => setModal(null);

  const doReset = async (useCustom) => {
    if (!modal) return;
    if (useCustom) {
      if (modal.customPassword.length < 6) {
        return toast.error('Password must be at least 6 characters');
      }
    }
    setSubmitting(true);
    try {
      const res = await resetUserPassword(modal.user.id, useCustom ? modal.customPassword : undefined);
      setModal({
        ...modal,
        mode: 'done',
        newPassword: res.data.newPassword,
        generated: res.data.generated,
      });
      setRevealed(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Could not copy'));
  };

  return (
    <div>
      <h4 className="fw-bold mb-2">
        <FiKey className="me-2" />
        User Credentials
      </h4>
      <p className="text-muted small mb-4">
        Login emails for every distributor and retailer. Stored passwords are bcrypt hashes
        and cannot be displayed — use <strong>Reset Password</strong> to set a new value
        and pass it on to the user.
      </p>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-white border-end-0"><FiSearch /></span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by name, email, phone, or PAN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Login Email</th>
                  <th>Phone</th>
                  <th>PAN</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-4 text-muted">No users match</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td className="fw-semibold">{u.name}</td>
                    <td><code>{u.email}</code></td>
                    <td>{u.phone}</td>
                    <td><code>{u.pan || '—'}</code></td>
                    <td>
                      <span className={`badge bg-${ROLE_BADGES[u.role] || 'secondary'} text-capitalize`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${u.status === 'active' ? 'success' : 'danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${u.approval_status === 'approved' ? 'success' : u.approval_status === 'pending_approval' ? 'warning' : 'danger'}`}>
                        {u.approval_status || 'approved'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openReset(u)}
                      >
                        <FiKey className="me-1" />Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Reset Password Modal ─────────────────────────────────────── */}
      {modal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <FiKey className="me-2" />
                    Reset password — {modal.user.name}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal} />
                </div>

                {modal.mode === 'choose' && (
                  <>
                    <div className="modal-body">
                      <p className="text-muted small">
                        Resetting <strong>{modal.user.email}</strong>'s password will immediately log them out of every active session.
                      </p>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Set a custom password (optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Leave blank to auto-generate a strong password"
                          value={modal.customPassword}
                          onChange={(e) => setModal({ ...modal, customPassword: e.target.value })}
                          minLength={6}
                          autoFocus
                        />
                        <small className="text-muted">Minimum 6 characters. Leave blank to let the server generate a 12-char one.</small>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-link text-muted" onClick={closeModal}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={submitting}
                        onClick={() => doReset(false)}
                      >
                        <FiRefreshCw className="me-1" />
                        Generate Random
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting || !modal.customPassword}
                        onClick={() => doReset(true)}
                      >
                        Set Custom Password
                      </button>
                    </div>
                  </>
                )}

                {modal.mode === 'done' && (
                  <>
                    <div className="modal-body">
                      <div className="alert alert-warning d-flex align-items-start gap-2">
                        <FiAlertTriangle className="flex-shrink-0 mt-1" />
                        <div className="small">
                          <strong>Save this password now.</strong> It will not be shown again — once you close this dialog the only way to recover it is to reset again.
                        </div>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted">User</small>
                        <div className="fw-semibold">{modal.user.name}</div>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted">Login email</small>
                        <div><code>{modal.user.email}</code></div>
                      </div>
                      <div>
                        <small className="text-muted d-flex align-items-center gap-2">
                          New password
                          {modal.generated && <span className="badge bg-info">auto-generated</span>}
                        </small>
                        <div className="input-group mt-1">
                          <input
                            type={revealed ? 'text' : 'password'}
                            className="form-control font-monospace"
                            value={modal.newPassword || ''}
                            readOnly
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => setRevealed(!revealed)}
                            title={revealed ? 'Hide' : 'Show'}
                          >
                            {revealed ? <FiEyeOff /> : <FiEye />}
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => copyToClipboard(modal.newPassword)}
                            title="Copy to clipboard"
                          >
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-primary" onClick={closeModal}>
                        Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
