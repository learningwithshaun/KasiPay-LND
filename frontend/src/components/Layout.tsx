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

  return (
    <>
      {title && (
        <header className="header">
          <h1 className="header-title">{title}</h1>
        </header>
      )}
      
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span>Tasks</span>
              </Link>
              <Link to="/my-tasks" className={`nav-item ${isActive('/my-tasks') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>My Tasks</span>
              </Link>
              <Link to="/earnings" className={`nav-item ${isActive('/earnings') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Earnings</span>
              </Link>
            </>
          )}

          {/* Operator navigation */}
          {hasRole(user, UserRole.OPERATOR) && (
            <>
              <Link to="/verify" className={`nav-item ${isActive('/verify') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Verify</span>
              </Link>
              <Link to="/verify-history" className={`nav-item ${isActive('/verify-history') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>History</span>
              </Link>
            </>
          )}

          {/* Admin navigation */}
          {hasRole(user, UserRole.ADMIN) && (
            <>
              <Link to="/admin/tasks" className={`nav-item ${isActive('/admin/tasks') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Tasks</span>
              </Link>
              <Link to="/admin/users" className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Users</span>
              </Link>
              <Link to="/admin/treasury" className={`nav-item ${isActive('/admin/treasury') ? 'active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Treasury</span>
              </Link>
            </>
          )}

          {/* Settings (all users) */}
          <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </Link>
        </nav>
      )}
    </>
  );
}

