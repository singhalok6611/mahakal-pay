import { useState, useEffect } from 'react';
import { getUsers, creditWallet } from '../../api/admin.api';
import toast from 'react-hot-toast';

export default function AdminWalletCredit() {
  const [userType, setUserType] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userType) {
      getUsers({ role: userType }).then(res => setUsers(res.data.users || [])).catch(() => {});
    } else {
      setUsers([]);
    }
    setSelectedUser(null);
  }, [userType]);

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === parseInt(userId));
    setSelectedUser(user || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Select a user');
    setLoading(true);
    try {
      await creditWallet({ user_id: selectedUser.id, amount: parseFloat(amount), description: remarks || 'Admin credit' });
      toast.success('Wallet credited successfully!');
      setAmount('');
      setRemarks('');
      // Refresh user balance
      if (userType) {
        getUsers({ role: userType }).then(res => {
          setUsers(res.data.users || []);
          const updated = (res.data.users || []).find(u => u.id === selectedUser.id);
          setSelectedUser(updated || null);
        }).catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">Credits / Debits</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button className="nav-link active">Credit</button>
            </li>
          </ul>
          <h6 className="text-primary fw-bold mb-4">CREDITS</h6>
          <hr />
          <form onSubmit={handleSubmit}>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Select Usertype</label>
              <div className="col-md-6">
                <select className="form-select" value={userType} onChange={e => setUserType(e.target.value)} required>
                  <option value="">- Select -</option>
                  <option value="distributor">Distributor</option>
                  <option value="retailer">Retailer</option>
                </select>
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Select User</label>
              <div className="col-md-6">
                <select className="form-select" value={selectedUser?.id || ''} onChange={e => handleUserSelect(e.target.value)} required>
                  <option value="">- Select -</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} [{u.phone}]</option>
                  ))}
                </select>
                {selectedUser && <div className="mt-1"><strong>Balance: &#8377; {selectedUser.balance || 0}</strong></div>}
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Amount</label>
              <div className="col-md-6">
                <input type="number" className="form-control" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
            </div>
            <div className="row mb-3 align-items-center">
              <label className="col-md-3 fw-semibold">Remarks</label>
              <div className="col-md-6">
                <textarea className="form-control" rows="3" placeholder="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 offset-md-3">
                <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                  {loading ? 'Processing...' : 'Credit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
