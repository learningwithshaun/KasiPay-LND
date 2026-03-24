import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

export function SettingsPage() {
  const { user, logout, updateLightningAddress, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  
  const [lightningAddress, setLightningAddress] = useState(user?.lightningAddress || '');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccess('');
    
    try {
      await updateLightningAddress(lightningAddress);
      setSuccess('Lightning address updated!');
      setShowAddressForm(false);
    } catch {
      // Error is handled by store
    }
  };

  return (
    <Layout title="Settings">
      <div className="stack-lg">
        {/* Profile card */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Profile</h3>
          <div className="stack">
            <div>
              <p className="text-small text-muted">Name</p>
              <p>{user?.displayName}</p>
            </div>
            <div>
              <p className="text-small text-muted">Phone</p>
              <p>{user?.phone}</p>
            </div>
            <div>
              <p className="text-small text-muted">Role</p>
              <p style={{ textTransform: 'capitalize' }}>{user?.role.toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* Lightning address */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Lightning Address</h3>
          
          {success && (
            <div className="success-message" style={{ marginBottom: 'var(--spacing-md)' }}>
              {success}
            </div>
          )}
          
          {error && (
            <div className="error-message" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}
          
          {showAddressForm ? (
            <form onSubmit={handleSaveAddress} className="stack">
              <div className="form-group">
                <label className="form-label">Your Lightning Address</label>
                <input
                  type="email"
                  value={lightningAddress}
                  onChange={(e) => setLightningAddress(e.target.value)}
                  placeholder="you@wallet.com"
                  autoFocus
                />
                <p className="text-small text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                  This is where you'll receive payments. Get one from Wallet of Satoshi, Blink, or similar apps.
                </p>
              </div>
              <div className="row" style={{ gap: 'var(--spacing-md)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddressForm(false);
                    setLightningAddress(user?.lightningAddress || '');
                    clearError();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={isLoading || !lightningAddress.includes('@')}
                >
                  {isLoading ? <LoadingSpinner /> : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {user?.lightningAddress ? (
                <div className="row row-between">
                  <p style={{ wordBreak: 'break-all' }}>{user.lightningAddress}</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddressForm(true)}
                    style={{ marginLeft: 'var(--spacing-md)' }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                    No Lightning address set. You need one to receive payments.
                  </p>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => setShowAddressForm(true)}
                  >
                    Add Lightning Address
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* About */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>About</h3>
          <p className="text-small text-muted">
            Lightning Payday helps you earn money by completing tasks. 
            Payments are instant via the Lightning Network.
          </p>
          <p className="text-small text-muted" style={{ marginTop: 'var(--spacing-md)' }}>
            Version 1.0.0
          </p>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-block"
          onClick={handleLogout}
          style={{ color: 'var(--color-error)' }}
        >
          Log Out
        </button>
      </div>
    </Layout>
  );
}

