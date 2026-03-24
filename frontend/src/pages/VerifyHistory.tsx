import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { Verification, TaskClaim, Task, User } from '../types';

export function VerifyHistoryPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getVerificationHistory(1, 50);
      setVerifications(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getClaimInfo = (verification: Verification) => {
    if (typeof verification.taskClaimId === 'object') {
      const claim = verification.taskClaimId as TaskClaim;
      let taskTitle = 'Task';
      let earnerName = 'Unknown';
      let rewardZAR = 0;
      
      if (typeof claim.taskId === 'object') {
        const task = claim.taskId as Task;
        taskTitle = task.title;
        rewardZAR = task.rewardZAR;
      }
      
      if (typeof claim.earnerId === 'object') {
        const user = claim.earnerId as User;
        earnerName = user.displayName;
      }
      
      return { taskTitle, earnerName, rewardZAR };
    }
    return { taskTitle: 'Task', earnerName: 'Unknown', rewardZAR: 0 };
  };

  return (
    <Layout title="Verification History">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : verifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No verification history</p>
        </div>
      ) : (
        <div className="stack">
          {verifications.map((v) => {
            const info = getClaimInfo(v);
            return (
              <div key={v._id} className="card">
                <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <h4 style={{ flex: 1 }}>{info.taskTitle}</h4>
                  <span className={`badge ${v.decision === 'APPROVED' ? 'badge-success' : 'badge-error'}`}>
                    {v.decision}
                  </span>
                </div>
                <p className="text-small">
                  {info.earnerName} • R{info.rewardZAR.toFixed(2)}
                </p>
                <p className="text-small text-muted">
                  {new Date(v.verifiedAt).toLocaleString()}
                </p>
                {v.reason && (
                  <p className="text-small" style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-error)' }}>
                    Reason: {v.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

