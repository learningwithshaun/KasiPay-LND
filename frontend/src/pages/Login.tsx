import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PinInput } from '../components/PinInput';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'phone' | 'pin'>('phone');

  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const cleanedPhone = phone.replace(/\s/g, '');
  const phoneForApi = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+27${cleanedPhone.replace(/^0/, '')}`;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneForApi.length >= 12) {
      clearError();
      setStep('pin');
    }
  };

  const handlePinChange = async (newPin: string) => {
    setPin(newPin);

    if (newPin.length === 4) {
      try {
        await login(phoneForApi, newPin);
        navigate('/tasks');
      } catch {
        setPin('');
      }
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="header-brand">KasiPay</div>
        <div className="chip">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
          Secure
        </div>
      </header>

      <main className="auth-main">
        <section className="stack-lg" style={{ marginBottom: 'auto' }}>
          <div className="text-center stack" style={{ alignItems: 'center' }}>
            <div className="brand-mark">
              <span className="material-symbols-outlined" style={{ fontSize: 38, fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>R2.4M</h1>
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>paid to youth this month</p>
            </div>
          </div>

          <div className="card stack">
            <div className="row row-between">
              <span className="text-small text-muted" style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                Community goal
              </span>
              <span className="text-small" style={{ color: 'var(--color-secondary)', fontWeight: 800 }}>
                82% achieved
              </span>
            </div>
            <div className="progress" aria-hidden="true">
              <span style={{ width: '82%' }} />
            </div>
          </div>
        </section>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="stack-lg">
            <div>
              <h2>What is your number?</h2>
              <p>Enter your phone number to continue.</p>
            </div>

            <div className="phone-field">
              <span className="phone-prefix">+27</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/^\+27/, ''))}
                placeholder="00 000 0000"
                autoComplete="tel"
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-action btn-block btn-lg" disabled={phoneForApi.length < 12}>
              Continue
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        ) : (
          <div className="stack-lg">
            <div className="text-center stack">
              <div>
                <h2>Enter your PIN</h2>
                <p className="text-small">{phoneForApi}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setPin('');
                  clearError();
                }}
                className="btn btn-secondary"
              >
                Change number
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <PinInput value={pin} onChange={handlePinChange} disabled={isLoading} />

            {isLoading && (
              <div className="text-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        )}

        <div className="text-center" style={{ marginTop: '1.5rem' }}>
          <p className="text-muted text-small">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>

        <div className="card demo-list" style={{ marginTop: '1rem' }}>
          <p className="text-small" style={{ color: 'var(--color-primary)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Demo accounts use PIN 1234
          </p>
          <button type="button" onClick={() => { setPhone('+27800000001'); setStep('pin'); }}>
            Admin: +27800000001
          </button>
          <button type="button" onClick={() => { setPhone('+27800000002'); setStep('pin'); }}>
            Operator: +27800000002
          </button>
          <button type="button" onClick={() => { setPhone('+27800000003'); setStep('pin'); }}>
            Earner: +27800000003
          </button>
        </div>
      </main>
    </div>
  );
}
