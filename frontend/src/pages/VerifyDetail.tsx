import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { TaskClaim, Task, User, Verification } from '../types';

export function VerifyDetailPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  
  const [claim, setClaim] = useState<TaskClaim | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  const loadClaim = async () => {
    if (!claimId) return;
    
    try {
      setLoading(true);
      const data = await api.getClaimForVerification(claimId);
      setClaim(data.claim);
      setVerification(data.verification || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!claimId) return;
    
    try {
      setProcessing(true);
      setError('');
      await api.approveVerification(claimId);
      navigate('/verify', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!claimId || !rejectReason.trim()) return;
    
    try {
      setProcessing(true);
      setError('');
      await api.rejectVerification(claimId, rejectReason);
      navigate('/verify', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
      setProcessing(false);
    }
  };

  const getTaskInfo = (claim: TaskClaim) => {
    if (typeof claim.taskId === 'object') {
      const task = claim.taskId as Task;
      return { title: task.title, description: task.description, rewardZAR: task.rewardZAR };
    }
    return { title: 'Task', description: '', rewardZAR: 0 };
  };

  const getEarnerInfo = (claim: TaskClaim) => {
    if (typeof claim.earnerId === 'object') {
      const user = claim.earnerId as User;
      return { name: user.displayName, phone: user.phone, lightningAddress: user.lightningAddress };
    }
    return { name: 'Unknown', phone: '', lightningAddress: '' };
  };

  if (loading) {
    return (
      <Layout title="Review Task">
        <LoadingSpinner size="lg" centered />
      </Layout>
    );
  }

  if (!claim) {
    return (
      <Layout title="Review Task">
        <div className="error-message">Claim not found</div>
      </Layout>
    );
  }

  const taskInfo = getTaskInfo(claim);
  const earnerInfo = getEarnerInfo(claim);
  const isAlreadyVerified = verification !== null || claim.status !== 'SUBMITTED';

  return (
    <Layout title="Review Task">
      <div className="stack-lg">
        {/* Task info */}
        <div className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>{taskInfo.title}</h2>
          <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {taskInfo.description}
          </p>
          <div className="task-reward">
            <span className="task-reward-amount">R{taskInfo.rewardZAR.toFixed(2)}</span>
            <span className="task-reward-currency">reward</span>
          </div>
        </div>

        {/* Earner info */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Submitted By</h3>
          <p><strong>{earnerInfo.name}</strong></p>
          <p className="text-small text-muted">{earnerInfo.phone}</p>
          {earnerInfo.lightningAddress && (
            <p className="text-small text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
              Lightning: {earnerInfo.lightningAddress}
            </p>
          )}
        </div>

        {/* Evidence */}
        {claim.evidence && (
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Evidence</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{claim.evidence}</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {isAlreadyVerified ? (
          <div className="card text-center">
            <p>This task has already been {verification?.decision.toLowerCase() || 'processed'}</p>
          </div>
        ) : showRejectForm ? (
          <div className="stack">
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this task is being rejected..."
                rows={3}
                autoFocus
              />
            </div>
            <div className="row" style={{ gap: 'var(--spacing-md)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectForm(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleReject}
                disabled={processing || rejectReason.trim().length < 5}
              >
                {processing ? <LoadingSpinner /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <button
              className="btn btn-success btn-block btn-lg"
              onClick={handleApprove}
              disabled={processing || !earnerInfo.lightningAddress}
            >
              {processing ? <LoadingSpinner /> : 'Approve & Pay'}
            </button>
            
            {!earnerInfo.lightningAddress && (
              <p className="text-small" style={{ color: 'var(--color-warning)', textAlign: 'center' }}>
                Earner hasn't set a Lightning address yet
              </p>
            )}
            
            <button
              className="btn btn-secondary btn-block"
              onClick={() => setShowRejectForm(true)}
              disabled={processing}
            >
              Reject
            </button>
          </div>
        )}

        <button
          className="btn btn-secondary btn-block"
          onClick={() => navigate('/verify')}
        >
          Back to Queue
        </button>
      </div>
    </Layout>
  );
}

