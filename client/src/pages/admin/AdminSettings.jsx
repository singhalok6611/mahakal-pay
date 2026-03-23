import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../api/admin.api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSettings().then((res) => setSettings(res.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const fields = [
    { key: 'site_name', label: 'Site Name' },
    { key: 'site_tagline', label: 'Tagline' },
    { key: 'support_email', label: 'Support Email' },
    { key: 'support_phone', label: 'Support Phone' },
    { key: 'min_recharge', label: 'Min Recharge (₹)' },
    { key: 'max_recharge', label: 'Max Recharge (₹)' },
    { key: 'min_fund_request', label: 'Min Fund Request (₹)' },
  ];

  return (
    <div>
      <h4 className="fw-bold mb-4">Settings</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {fields.map((f) => (
            <div className="row mb-3" key={f.key}>
              <label className="col-md-3 col-form-label">{f.label}</label>
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  value={settings[f.key] || ''}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
