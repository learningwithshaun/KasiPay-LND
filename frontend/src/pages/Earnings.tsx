import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../services/api';
import type { Payout } from '../types';

export function EarningsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const data = await api.getMyPayouts(1, 50);
      setPayouts(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = payouts
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amountZAR, 0);

  const pendingTotal = payouts
    .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum, p) => sum + p.amountZAR, 0);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      PENDING: { class: 'badge-warning', label: 'Pending' },
      PROCESSING: { class: 'badge-warning', label: 'Processing' },
      COMPLETED: { class: 'badge-success', label: 'Paid' },
      FAILED: { class: 'badge-error', label: 'Failed' },
    };
    const badge = badges[status] || { class: 'badge-neutral', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <Layout title="Earnings">
      {loading ? (
        <LoadingSpinner size="lg" centered />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="stack-lg">
          <section className="hero-panel" style={{ margin: '-1.25rem -1rem 0' }}>
            <div className="container stack">
              <div className="trust-chip">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                Instant payouts
              </div>
              <div>
                <p className="metric">R{totalEarnings.toFixed(2)}</p>
                <h2>total earned</h2>
              </div>
              <div className="card row row-between">
                <div>
                  <p className="text-small text-muted">Pending</p>
                  <p className="currency">R{pendingTotal.toFixed(2)}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>
                  bolt
                </span>
              </div>
            </div>
          </section>

          {payouts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <p>No earnings yet</p>
              <p className="text-small text-muted">Complete tasks to start earning.</p>
            </div>
          ) : (
            <div className="stack">
              <h2>Payment history</h2>
              {payouts.map((payout) => (
                <div key={payout._id} className="card">
                  <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <span className="currency">R{payout.amountZAR.toFixed(2)}</span>
                    {getStatusBadge(payout.status)}
                  </div>
                  <div className="row row-between">
                    <span className="text-small text-muted">
                      {new Date(payout.initiatedAt).toLocaleDateString()}
                    </span>
                    {payout.completedAt && (
                      <span className="text-small text-muted">
                        {new Date(payout.completedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {payout.errorMessage && (
                    <p className="text-small" style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-sm)' }}>
                      {payout.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
