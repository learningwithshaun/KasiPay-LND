import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, hasRole } from '../store/authStore';
import { UserRole } from '../types';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const initials = user?.displayName
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'KP';

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <div className="header-brand">KasiPay</div>
          {user && (
            <p className="text-small text-muted">
              {user.role.toLowerCase()} account
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 'var(--spacing-sm)' }}>
          {title && <h1 className="header-title">{title}</h1>}
          <div className="header-avatar" aria-label="Profile initials">
            {initials}
          </div>
        </div>
      </header>
      
      <main className="page">
        <div className="container">
          {children}
        </div>
      </main>

      {user && (
        <nav className="nav-bottom">
          {/* Earner navigation */}
          {hasRole(user, UserRole.EARNER) && (
            <>
              <Link to="/tasks" className={`nav-item ${isActive('/tasks') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">assignment</span>
                <span>Tasks</span>
              </Link>
              <Link to="/my-tasks" className={`nav-item ${isActive('/my-tasks') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">work_history</span>
                <span>Mine</span>
              </Link>
              <Link to="/earnings" className={`nav-item ${isActive('/earnings') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">payments</span>
                <span>Earnings</span>
              </Link>
            </>
          )}

          {/* Operator navigation */}
          {hasRole(user, UserRole.OPERATOR) && (
            <>
              <Link to="/verify" className={`nav-item ${isActive('/verify') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">verified</span>
                <span>Verify</span>
              </Link>
              <Link to="/verify-history" className={`nav-item ${isActive('/verify-history') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">history</span>
                <span>History</span>
              </Link>
            </>
          )}

          {/* Admin navigation */}
          {hasRole(user, UserRole.ADMIN) && (
            <>
              <Link to="/admin/tasks" className={`nav-item ${isActive('/admin/tasks') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">playlist_add_check</span>
                <span>Tasks</span>
              </Link>
              <Link to="/admin/users" className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">groups</span>
                <span>Users</span>
              </Link>
              <Link to="/admin/treasury" className={`nav-item ${isActive('/admin/treasury') ? 'active' : ''}`}>
                <span className="material-symbols-outlined">account_balance_wallet</span>
                <span>Treasury</span>
              </Link>
            </>
          )}

          {/* Settings (all users) */}
          <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="material-symbols-outlined">person</span>
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

