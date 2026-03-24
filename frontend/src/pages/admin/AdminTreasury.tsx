import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as api from '../../services/api';
import type { TreasuryStats, Payout, ExchangeRateInfo } from '../../types';
import { PayoutStatus } from '../../types';

export function AdminTreasuryPage() {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, payoutsData, rateData] = await Promise.all([
        api.getTreasury(),
        api.getAllPayouts(1, 50),
        api.getExchangeRate(),
      ]);
      setStats(statsData);
      setPayouts(payoutsData.items);
      setExchangeRate(rateData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (payoutId: string) => {
    try {
      setRetrying(payoutId);
      await api.retryPayout(payoutId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry payout');
    } finally {
      setRetrying(null);
    }
  };

  const satsToZAR = (sats: number) => {
    if (!exchangeRate) return 0;
    return sats * exchangeRate.zarPerSat;
  };

  const getStatusBadge = (status: PayoutStatus) => {
    const badges: Record<PayoutStatus, { class: string; label: string }> = {
      [PayoutStatus.PENDING]: { class: 'badge-warning', label: 'Pending' },
      [PayoutStatus.PROCESSING]: { class: 'badge-warning', label: 'Processing' },
      [PayoutStatus.COMPLETED]: { class: 'badge-success', label: 'Completed' },
      [PayoutStatus.FAILED]: { class: 'badge-error', label: 'Failed' },
    };
    const badge = badges[status];
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <Layout title="Treasury">
        <LoadingSpinner size="lg" centered />
      </Layout>
    );
  }

  return (
    <Layout title="Treasury">
      <div className="stack-lg">
        {error && <div className="error-message">{error}</div>}

        {/* Balance card */}
        {stats && (
          <div className="card text-center">
            <p className="text-muted text-small">Treasury Balance</p>
            <p className="currency currency-lg">
              R{satsToZAR(stats.balance).toFixed(2)}
            </p>
            <p className="text-small text-muted">
              {stats.balance.toLocaleString()} sats
            </p>
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
            <div className="card text-center">
              <p className="text-muted text-small">Total Paid</p>
              <p className="currency">R{satsToZAR(stats.totalPaid).toFixed(2)}</p>
            </div>
            <div className="card text-center">
              <p className="text-muted text-small">Pending</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stats.pendingPayouts}</p>
            </div>
            <div className="card text-center">
              <p className="text-muted text-small">Failed</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: stats.failedPayouts > 0 ? 'var(--color-error)' : undefined }}>
                {stats.failedPayouts}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-muted text-small">BTC/ZAR</p>
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>
                R{exchangeRate?.btcPriceZAR.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Recent payouts */}
        <div>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Recent Payouts</h3>
          
          {payouts.length === 0 ? (
            <div className="empty-state">
              <p>No payouts yet</p>
            </div>
          ) : (
            <div className="stack">
              {payouts.map((payout) => (
                <div key={payout._id} className="card">
                  <div className="row row-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <span className="currency">R{payout.amountZAR.toFixed(2)}</span>
                    {getStatusBadge(payout.status)}
                  </div>
                  <p className="text-small text-muted">
                    {payout.lightningAddress}
                  </p>
                  <p className="text-small text-muted">
                    {new Date(payout.initiatedAt).toLocaleString()}
                  </p>
                  {payout.errorMessage && (
                    <p className="text-small" style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-sm)' }}>
                      Error: {payout.errorMessage}
                    </p>
                  )}
                  {payout.status === PayoutStatus.FAILED && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 'var(--spacing-sm)' }}
                      onClick={() => handleRetry(payout._id)}
                      disabled={retrying === payout._id}
                    >
                      {retrying === payout._id ? <LoadingSpinner /> : 'Retry'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

