import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiMenu, FiLogOut, FiBell } from 'react-icons/fi';
import { getNotificationCount } from '../../api/admin.api';

export default function TopBar({ onToggleSidebar }) {
  const { user, balance, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Slice 5: poll the admin notifications count every 30s. Cheap query
  // (one COUNT(*) on an indexed column) and gives the bell a live feel
  // without a websocket.
  useEffect(() => {
    if (user?.role !== 'admin') return;
    let cancelled = false;
    const tick = () => {
      getNotificationCount()
        .then((res) => { if (!cancelled) setUnread(res.data.unread || 0); })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-link text-dark d-lg-none p-0" onClick={onToggleSidebar}>
          <FiMenu size={26} />
        </button>
        <div className="d-none d-md-block">
          <h5 className="mb-0 text-primary">
            <span className="text-warning">MAHAKAL</span> PAY
          </h5>
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        {user?.role !== 'admin' && (
          <div className="balance-badge">
            <small className="text-muted">Balance:</small>
            <strong className="text-success">₹ {balance.toFixed(2)}</strong>
          </div>
        )}
        {user?.role === 'admin' && (
          <Link
            to="/admin/notifications"
            className="btn btn-light position-relative"
            title="Notifications"
          >
            <FiBell size={18} />
            {unread > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        )}
        <div className="dropdown">
          <button
            className="btn btn-light dropdown-toggle d-flex align-items-center gap-2"
            type="button"
            data-bs-toggle="dropdown"
          >
            <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style={{ width: 32, height: 32, fontSize: '0.85rem', fontWeight: 700 }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="d-none d-sm-inline fw-semibold">{user?.name}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0" style={{ minWidth: 200 }}>
            <li className="px-3 py-2">
              <div className="fw-semibold">{user?.name}</div>
              <small className="text-muted text-capitalize">{user?.role}</small>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2 text-danger py-2" onClick={handleLogout}>
                <FiLogOut size={16} /> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
