import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { Task, TaskClaim } from '../types';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<Task | null>(null);
  const [claim, setClaim] = useState<TaskClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState('');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const taskData = await api.getTask(taskId);
      setTask(taskData);
      
      // Check if user has already claimed this task
      const claims = await api.getMyClaims(1, 100);
      const existingClaim = claims.items.find(
        c => (typeof c.taskId === 'string' ? c.taskId : c.taskId._id) === taskId
      );
      if (existingClaim) {
        setClaim(existingClaim);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!taskId) return;
    
    try {
      setClaiming(true);
      setError('');
      const newClaim = await api.claimTask(taskId);
      setClaim(newClaim);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim task');
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmit = async () => {
    if (!claim) return;
    
    try {
      setSubmitting(true);
      setError('');
      const updatedClaim = await api.submitTask(claim._id, evidence || undefined);
      setClaim(updatedClaim);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => `R${amount.toFixed(2)}`;

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

  if (loading) {
    return (
      <Layout title="Task">
        <LoadingSpinner size="lg" centered />
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout title="Task">
        <div className="error-message">Task not found</div>
      </Layout>
    );
  }

  return (
    <Layout title="Task Details">
      <div className="stack-lg">
        <div className="card">
          <div className="row row-between" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ flex: 1 }}>{task.title}</h2>
            {claim && getStatusBadge(claim.status)}
          </div>
          
          <div className="task-reward" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <span className="task-reward-amount">{formatCurrency(task.rewardZAR)}</span>
            <span className="task-reward-currency">reward</span>
          </div>

          <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!claim ? (
          // Not claimed yet
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={handleClaim}
            disabled={claiming || task.currentClaims >= task.maxClaims}
          >
            {claiming ? <LoadingSpinner /> : 'Claim This Task'}
          </button>
        ) : claim.status === 'CLAIMED' ? (
          // Claimed, ready to submit
          <div className="stack">
            <div className="form-group">
              <label className="form-label">Evidence / Notes (optional)</label>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Add any proof or notes about your completed work..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>
            <button
              className="btn btn-success btn-block btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <LoadingSpinner /> : 'Submit for Review'}
            </button>
          </div>
        ) : claim.status === 'SUBMITTED' ? (
          // Submitted, waiting for review
          <div className="card text-center">
            <p style={{ marginBottom: 'var(--spacing-sm)' }}>
              Your submission is being reviewed
            </p>
            <p className="text-small text-muted">
              You'll be paid automatically once approved
            </p>
          </div>
        ) : claim.status === 'VERIFIED' || claim.status === 'PAID' ? (
          // Approved/Paid
          <div className="success-message text-center">
            <p style={{ fontWeight: 600 }}>
              Task completed! {claim.status === 'PAID' ? 'Payment sent.' : 'Payment processing...'}
            </p>
          </div>
        ) : claim.status === 'REJECTED' ? (
          // Rejected
          <div className="error-message">
            <p style={{ fontWeight: 600 }}>Task was rejected</p>
            <p className="text-small">Please contact support if you believe this is an error.</p>
          </div>
        ) : null}

        <button
          className="btn btn-secondary btn-block"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    </Layout>
  );
}

