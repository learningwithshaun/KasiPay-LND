import { useEffect, useState } from 'react';
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

  const formatCurrency = (amount: number) => `R${amount.toFixed(2)}`;
  const totalAvailable = tasks.reduce((sum, task) => sum + Math.max(task.maxClaims - task.currentClaims, 0), 0);
  const topReward = tasks.reduce((max, task) => Math.max(max, task.rewardZAR), 0);

  return (
    <Layout title="Tasks">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <p>No tasks available right now</p>
          <p className="text-small">Check back soon!</p>
        </div>
      ) : (
        <div className="stack-lg">
          <section className="hero-panel" style={{ margin: '-1.25rem -1rem 0' }}>
            <div className="container stack">
              <div className="trust-chip">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>trending_up</span>
                Real-time impact
              </div>
              <div>
                <p className="metric">{formatCurrency(topReward)}</p>
                <h2>top task reward today</h2>
              </div>
              <div className="card stack">
                <div className="row row-between">
                  <span className="text-small text-muted" style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    Open spots
                  </span>
                  <span className="text-small" style={{ color: 'var(--color-secondary)', fontWeight: 800 }}>
                    {totalAvailable} available
                  </span>
                </div>
                <div className="progress">
                  <span style={{ width: `${Math.min(100, Math.max(18, totalAvailable * 8))}%` }} />
                </div>
              </div>
            </div>
          </section>

          <div className="stack">
            <div>
              <h2>Pick a task</h2>
              <p>Choose local work that fits your schedule.</p>
            </div>

            {tasks.map((task) => (
              <button
                key={task._id}
                className="task-card"
                onClick={() => navigate(`/task/${task._id}`)}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
              >
                <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1rem', flex: 1 }}>{task.title}</h3>
                  <div className="task-reward">
                    <span className="task-reward-amount">{formatCurrency(task.rewardZAR)}</span>
                  </div>
                </div>
                <p
                  className="text-small text-muted"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {task.description}
                </p>
                <div className="row row-between" style={{ marginTop: 'var(--spacing-md)' }}>
                  <span className="chip" style={{ textTransform: 'none', letterSpacing: 0 }}>
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
        </div>
      )}
    </Layout>
  );
}
