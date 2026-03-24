import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { TaskClaim, Task, User } from '../types';

export function VerifyPage() {
  const [claims, setClaims] = useState<TaskClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPendingClaims();
  }, []);

  const loadPendingClaims = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingVerifications();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const getTaskInfo = (claim: TaskClaim) => {
    if (typeof claim.taskId === 'object') {
      const task = claim.taskId as Task;
      return { title: task.title, rewardZAR: task.rewardZAR };
    }
    return { title: 'Task', rewardZAR: 0 };
  };

  const getEarnerInfo = (claim: TaskClaim) => {
    if (typeof claim.earnerId === 'object') {
      const user = claim.earnerId as User;
      return { name: user.displayName, phone: user.phone };
    }
    return { name: 'Unknown', phone: '' };
  };

  return (
    <Layout title="Verify Tasks">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : claims.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p>No tasks to verify</p>
          <p className="text-small text-muted">All caught up!</p>
        </div>
      ) : (
        <div className="stack">
          <p className="text-muted text-small">{claims.length} task(s) pending review</p>
          
          {claims.map((claim) => {
            const taskInfo = getTaskInfo(claim);
            const earnerInfo = getEarnerInfo(claim);
            
            return (
              <button
                key={claim._id}
                className="task-card"
                onClick={() => navigate(`/verify/${claim._id}`)}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
              >
                <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: '1rem', flex: 1 }}>{taskInfo.title}</h3>
                  <span className="currency">R{taskInfo.rewardZAR.toFixed(2)}</span>
                </div>
                <p className="text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  Submitted by: <strong>{earnerInfo.name}</strong>
                </p>
                <p className="text-small text-muted">
                  {claim.submittedAt && new Date(claim.submittedAt).toLocaleString()}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

