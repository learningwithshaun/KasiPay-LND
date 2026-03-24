import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, hasRole } from './store/authStore';
import { UserRole } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';

// Auth pages
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';

// Earner pages
import { TasksPage } from './pages/Tasks';
import { TaskDetailPage } from './pages/TaskDetail';
import { MyTasksPage } from './pages/MyTasks';
import { EarningsPage } from './pages/Earnings';

// Operator pages
import { VerifyPage } from './pages/Verify';
import { VerifyDetailPage } from './pages/VerifyDetail';
import { VerifyHistoryPage } from './pages/VerifyHistory';

// Admin pages
import { AdminTasksPage } from './pages/admin/AdminTasks';
import { AdminUsersPage } from './pages/admin/AdminUsers';
import { AdminTreasuryPage } from './pages/admin/AdminTreasury';

// Common pages
import { SettingsPage } from './pages/Settings';

// Protected route wrapper
function ProtectedRoute({ 
  children, 
  roles 
}: { 
  children: React.ReactNode; 
  roles?: UserRole[];
}) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(user, ...roles)) {
    return <Navigate to="/tasks" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    // Redirect based on role
    if (user.role === UserRole.ADMIN) {
      return <Navigate to="/admin/tasks" replace />;
    }
    if (user.role === UserRole.OPERATOR) {
      return <Navigate to="/verify" replace />;
    }
    return <Navigate to="/tasks" replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setChecking(false));
  }, [checkAuth]);

  if (checking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--color-bg)',
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Determine default route based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated || !user) return '/login';
    if (user.role === UserRole.ADMIN) return '/admin/tasks';
    if (user.role === UserRole.OPERATOR) return '/verify';
    return '/tasks';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />

        {/* Earner routes */}
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute roles={[UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN]}>
              <TasksPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/task/:taskId" 
          element={
            <ProtectedRoute roles={[UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN]}>
              <TaskDetailPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-tasks" 
          element={
            <ProtectedRoute roles={[UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN]}>
              <MyTasksPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/earnings" 
          element={
            <ProtectedRoute roles={[UserRole.EARNER, UserRole.OPERATOR, UserRole.ADMIN]}>
              <EarningsPage />
            </ProtectedRoute>
          } 
        />

        {/* Operator routes */}
        <Route 
          path="/verify" 
          element={
            <ProtectedRoute roles={[UserRole.OPERATOR, UserRole.ADMIN]}>
              <VerifyPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/verify/:claimId" 
          element={
            <ProtectedRoute roles={[UserRole.OPERATOR, UserRole.ADMIN]}>
              <VerifyDetailPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/verify-history" 
          element={
            <ProtectedRoute roles={[UserRole.OPERATOR, UserRole.ADMIN]}>
              <VerifyHistoryPage />
            </ProtectedRoute>
          } 
        />

        {/* Admin routes */}
        <Route 
          path="/admin/tasks" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminTasksPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminUsersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/treasury" 
          element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminTreasuryPage />
            </ProtectedRoute>
          } 
        />

        {/* Settings (all authenticated users) */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

