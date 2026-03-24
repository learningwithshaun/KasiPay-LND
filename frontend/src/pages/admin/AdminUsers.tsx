import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as api from '../../services/api';
import type { User } from '../../types';
import { UserRole, UserStatus } from '../../types';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<UserRole | ''>('');

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAllUsers(1, 100, filter || undefined);
      setUsers(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    try {
      await api.updateUserStatus(userId, status);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await api.updateUserRole(userId, role);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const badges: Record<UserRole, { class: string; label: string }> = {
      [UserRole.EARNER]: { class: 'badge-neutral', label: 'Earner' },
      [UserRole.OPERATOR]: { class: 'badge-warning', label: 'Operator' },
      [UserRole.ADMIN]: { class: 'badge-success', label: 'Admin' },
    };
    const badge = badges[role];
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getStatusBadge = (status: UserStatus) => {
    const badges: Record<UserStatus, { class: string; label: string }> = {
      [UserStatus.ACTIVE]: { class: 'badge-success', label: 'Active' },
      [UserStatus.SUSPENDED]: { class: 'badge-error', label: 'Suspended' },
      [UserStatus.PENDING]: { class: 'badge-warning', label: 'Pending' },
    };
    const badge = badges[status];
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <Layout title="Manage Users">
      <div className="stack-lg">
        {error && <div className="error-message">{error}</div>}
        
        {/* Filter */}
        <div className="form-group">
          <label className="form-label">Filter by Role</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as UserRole | '')}
            style={{ padding: 'var(--spacing-md)' }}
          >
            <option value="">All Roles</option>
            <option value={UserRole.EARNER}>Earners</option>
            <option value={UserRole.OPERATOR}>Operators</option>
            <option value={UserRole.ADMIN}>Admins</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" centered />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        ) : (
          <div className="stack">
            <p className="text-small text-muted">{users.length} user(s)</p>
            
            {users.map((user) => (
              <div key={user.id} className="card">
                <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div>
                    <h4>{user.displayName}</h4>
                    <p className="text-small text-muted">{user.phone}</p>
                  </div>
                  <div className="stack" style={{ gap: 'var(--spacing-xs)', alignItems: 'flex-end' }}>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                </div>
                
                {user.lightningAddress && (
                  <p className="text-small text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                    ⚡ {user.lightningAddress}
                  </p>
                )}
                
                <div className="row" style={{ gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  {/* Role change buttons */}
                  {user.role !== UserRole.OPERATOR && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                      onClick={() => handleRoleChange(user.id, UserRole.OPERATOR)}
                    >
                      Make Operator
                    </button>
                  )}
                  {user.role === UserRole.OPERATOR && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                      onClick={() => handleRoleChange(user.id, UserRole.EARNER)}
                    >
                      Demote to Earner
                    </button>
                  )}
                  
                  {/* Status change buttons */}
                  {user.status === UserStatus.ACTIVE ? (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem', padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-error)' }}
                      onClick={() => handleStatusChange(user.id, UserStatus.SUSPENDED)}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}
                      onClick={() => handleStatusChange(user.id, UserStatus.ACTIVE)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

