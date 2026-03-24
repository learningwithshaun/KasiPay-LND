import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { TaskClaim, Task } from '../types';

export function MyTasksPage() {
  const [claims, setClaims] = useState<TaskClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await api.getMyClaims(1, 50);
      setClaims(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      CLAIMED: { class: 'badge-warning', label: 'In Progress' },
      SUBMITTED: { class: 'badge-neutral', label: 'Pending Review' },
      VERIFIED: { class: 'badge-success', label: 'Approved' },
      REJECTED: { class: 'badge-error', label: 'Rejected' },
      PAID: { class: 'badge-success', label: 'Paid' },
    };
    const badge = badges[status] || { class: 'badge-neutral', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getTaskInfo = (claim: TaskClaim): { id: string; title: string; rewardZAR: number } => {
    if (typeof claim.taskId === 'string') {
      return { id: claim.taskId, title: 'Task', rewardZAR: 0 };
    }
    const task = claim.taskId as Task;
    return { id: task._id, title: task.title, rewardZAR: task.rewardZAR };
  };

  return (
    <Layout title="My Tasks">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : claims.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p>No tasks yet</p>
          <p className="text-small text-muted">Claim a task to get started!</p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: 'var(--spacing-lg)' }}
            onClick={() => navigate('/tasks')}
          >
            Browse Tasks
          </button>
        </div>
      ) : (
        <div className="stack">
          {claims.map((claim) => {
            const taskInfo = getTaskInfo(claim);
            return (
              <button
                key={claim._id}
                className="task-card"
                onClick={() => navigate(`/task/${taskInfo.id}`)}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
              >
                <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <h3 style={{ fontSize: '1rem', flex: 1 }}>{taskInfo.title}</h3>
                  {getStatusBadge(claim.status)}
                </div>
                <div className="row row-between">
                  <span className="text-small text-muted">
                    Claimed {new Date(claim.claimedAt).toLocaleDateString()}
                  </span>
                  {taskInfo.rewardZAR > 0 && (
                    <span className="currency">R{taskInfo.rewardZAR.toFixed(2)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

