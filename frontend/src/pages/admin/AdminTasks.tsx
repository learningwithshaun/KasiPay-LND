import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as api from '../../services/api';
import type { Task } from '../../types';
import { TaskStatus } from '../../types';

export function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardSats, setRewardSats] = useState('');
  const [maxClaims, setMaxClaims] = useState('1');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getAllTasks(1, 100);
      setTasks(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRewardSats('');
    setMaxClaims('1');
    setEditingTask(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      if (editingTask) {
        await api.updateTask(editingTask._id, {
          title,
          description,
          rewardSats: parseInt(rewardSats),
          maxClaims: parseInt(maxClaims),
        });
      } else {
        await api.createTask({
          title,
          description,
          rewardSats: parseInt(rewardSats),
          maxClaims: parseInt(maxClaims),
        });
      }
      resetForm();
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description);
    setRewardSats(task.rewardSats.toString());
    setMaxClaims(task.maxClaims.toString());
    setEditingTask(task);
    setShowForm(true);
  };

  const handleStatusToggle = async (task: Task) => {
    try {
      const newStatus = task.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;
      await api.updateTask(task._id, { status: newStatus });
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const badges: Record<TaskStatus, { class: string; label: string }> = {
      [TaskStatus.DRAFT]: { class: 'badge-neutral', label: 'Draft' },
      [TaskStatus.ACTIVE]: { class: 'badge-success', label: 'Active' },
      [TaskStatus.PAUSED]: { class: 'badge-warning', label: 'Paused' },
      [TaskStatus.EXPIRED]: { class: 'badge-error', label: 'Expired' },
    };
    const badge = badges[status];
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <Layout title="Manage Tasks">
      {error && <div className="error-message" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}
      
      {showForm ? (
        <form onSubmit={handleSubmit} className="stack-lg">
          <h3>{editingTask ? 'Edit Task' : 'New Task'}</h3>
          
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              maxLength={100}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done..."
              rows={4}
              maxLength={1000}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Reward (satoshis)</label>
            <input
              type="number"
              value={rewardSats}
              onChange={(e) => setRewardSats(e.target.value)}
              placeholder="1000"
              min="1"
              required
            />
            <p className="text-small text-muted">1000 sats ≈ R1-2 depending on exchange rate</p>
          </div>
          
          <div className="form-group">
            <label className="form-label">Max Claims</label>
            <input
              type="number"
              value={maxClaims}
              onChange={(e) => setMaxClaims(e.target.value)}
              placeholder="1"
              min="1"
              required
            />
          </div>
          
          <div className="row" style={{ gap: 'var(--spacing-md)' }}>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
              {formLoading ? <LoadingSpinner /> : editingTask ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      ) : (
        <div className="stack-lg">
          <button className="btn btn-primary btn-block" onClick={() => setShowForm(true)}>
            + Create Task
          </button>
          
          {loading ? (
            <LoadingSpinner size="lg" centered />
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks yet</p>
            </div>
          ) : (
            <div className="stack">
              {tasks.map((task) => (
                <div key={task._id} className="card">
                  <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <h4 style={{ flex: 1 }}>{task.title}</h4>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-small text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    {task.currentClaims}/{task.maxClaims} claimed • {task.rewardSats} sats (R{task.rewardZAR.toFixed(2)})
                  </p>
                  <div className="row" style={{ gap: 'var(--spacing-sm)' }}>
                    <button className="btn btn-secondary" onClick={() => handleEdit(task)}>
                      Edit
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleStatusToggle(task)}
                    >
                      {task.status === TaskStatus.ACTIVE ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

