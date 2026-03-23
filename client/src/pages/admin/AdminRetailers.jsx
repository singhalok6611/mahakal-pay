import { useState, useEffect } from 'react';
import { getUsers } from '../../api/admin.api';

export default function AdminRetailers() {
  const [users, setUsers] = useState([]);
  const [distributors, setDistributors] = useState({});

  useEffect(() => {
    // Get distributors for parent mapping
    getUsers({ role: 'distributor' }).then(res => {
      const map = {};
      (res.data.users || []).forEach(d => { map[d.id] = d; });
      setDistributors(map);
    }).catch(() => {});

    getUsers({ role: 'retailer' }).then(res => {
      setUsers(res.data.users || []);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h4 className="fw-bold mb-4">Retailers</h4>
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="text-primary fw-bold">RETAILERS</h6>
          <hr />
          <p className="mb-3">Total: <strong>{users.length}</strong></p>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="table-dark">
                  <th>Id</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Parent</th>
                  <th>Shop</th>
                  <th>City</th>
                  <th>Package</th>
                  <th>Reg. Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">No retailers found</td></tr>
                ) : users.map(u => {
                  const parent = distributors[u.parent_id];
                  return (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>{parent ? `${parent.name} [${parent.phone}]` : '-'}</td>
                      <td>{u.shop_name || '-'}</td>
                      <td>{u.city || '-'}</td>
                      <td><span className="badge bg-warning text-dark">Retailer</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td><span className={`badge bg-${u.status === 'active' ? 'success' : 'danger'}`}>{u.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
