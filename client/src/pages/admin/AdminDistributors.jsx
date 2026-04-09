import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiList } from 'react-icons/fi';
import { getUsers } from '../../api/admin.api';

const fmtMoney = (n) => `₹ ${Number(n || 0).toFixed(2)}`;

export default function AdminDistributors() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers({ role: 'distributor' }).then(res => {
      const data = res.data.users || [];
      setUsers(data);
    }).catch(() => {});
  }, []);

  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);

  return (
    <div>
      <h4 className="fw-bold mb-4">Distributors</h4>
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="text-primary fw-bold">DISTRIBUTORS</h6>
          <hr />
          <p className="mb-3">
            Total: <strong>{users.length}</strong>
            <span className="ms-4">Combined wallet balance: <strong>{fmtMoney(totalBalance)}</strong></span>
          </p>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="table-dark">
                  <th>Id</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>PAN</th>
                  <th>Shop</th>
                  <th>City</th>
                  <th className="text-end">Wallet Balance</th>
                  <th>Reg. Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-4 text-muted">No distributors found</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td><code>{u.pan || '—'}</code></td>
                    <td>{u.shop_name || '-'}</td>
                    <td>{u.city || '-'}</td>
                    <td className="text-end fw-semibold text-success">{fmtMoney(u.balance)}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge bg-${u.status === 'active' ? 'success' : 'danger'}`}>{u.status}</span></td>
                    <td>
                      <Link
                        to={`/admin/transactions?user_id=${u.id}`}
                        className="btn btn-sm btn-outline-primary"
                        title="View this distributor's downstream transactions"
                      >
                        <FiList className="me-1" />
                        Txns
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
