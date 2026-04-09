import { useEffect, useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/admin.api';

const TYPE_BADGES = {
  recharge_success: 'success',
  recharge_failed: 'danger',
  wallet_transfer: 'primary',
  withdrawal_request: 'warning',
  user_suspended: 'dark',
};

export default function AdminNotifications() {
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter === 'unread') params.unread = '1';
      const res = await getNotifications(params);
      setRows(res.data.rows || []);
      setUnread(res.data.unread || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const handleMarkOne = async (id) => {
    try {
      await markNotificationRead(id);
      load();
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">
          <FiBell className="me-2" />
          Notifications
          {unread > 0 && (
            <span className="badge bg-danger ms-2">{unread} unread</span>
          )}
        </h4>
        <div className="d-flex gap-2">
          <div className="btn-group btn-group-sm">
            <button className={`btn btn-${filter === 'all' ? 'primary' : 'outline-primary'}`} onClick={() => setFilter('all')}>All</button>
            <button className={`btn btn-${filter === 'unread' ? 'primary' : 'outline-primary'}`} onClick={() => setFilter('unread')}>Unread</button>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
            <FiRefreshCw />
          </button>
          {unread > 0 && (
            <button className="btn btn-sm btn-success" onClick={handleMarkAll}>
              <FiCheckCircle className="me-1" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="list-group list-group-flush">
          {loading ? (
            <div className="text-center py-5 text-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">No notifications</div>
          ) : rows.map((n) => (
            <div
              key={n.id}
              className={`list-group-item d-flex justify-content-between align-items-start ${!n.is_read ? 'list-group-item-light' : ''}`}
            >
              <div className="me-3 flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className={`badge bg-${TYPE_BADGES[n.type] || 'secondary'}`}>{n.type.replace(/_/g, ' ')}</span>
                  <strong>{n.title}</strong>
                  {!n.is_read && <span className="badge bg-danger">new</span>}
                </div>
                <div className="text-muted small">{n.message}</div>
                <small className="text-muted">{new Date(n.created_at).toLocaleString()}</small>
              </div>
              {!n.is_read && (
                <button
                  className="btn btn-sm btn-outline-success"
                  title="Mark as read"
                  onClick={() => handleMarkOne(n.id)}
                >
                  <FiCheck />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
