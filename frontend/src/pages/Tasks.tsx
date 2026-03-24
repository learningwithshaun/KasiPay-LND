import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { Task } from '../types';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getAvailableTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  return (
    <Layout title="Available Tasks">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No tasks available right now</p>
          <p className="text-small">Check back soon!</p>
        </div>
      ) : (
        <div className="stack">
          {tasks.map((task) => (
            <button
              key={task._id}
              className="task-card"
              onClick={() => navigate(`/task/${task._id}`)}
              style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
            >
              <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <h3 style={{ fontSize: '1rem', flex: 1 }}>{task.title}</h3>
                <div className="task-reward">
                  <span className="task-reward-amount">{formatCurrency(task.rewardZAR)}</span>
                </div>
              </div>
              <p className="text-small text-muted" style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.description}
              </p>
              <div className="row row-between" style={{ marginTop: 'var(--spacing-md)' }}>
                <span className="text-small text-muted">
                  {task.maxClaims - task.currentClaims} spots left
                </span>
                {task.expiresAt && (
                  <span className="text-small text-muted">
                    Expires {new Date(task.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}

