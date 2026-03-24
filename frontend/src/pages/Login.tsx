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

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      clearError();
      setStep('pin');
    }
  };

  const handlePinChange = async (newPin: string) => {
    setPin(newPin);
    
    if (newPin.length === 4) {
      try {
        await login(phone, newPin);
        navigate('/tasks');
      } catch {
        setPin('');
      }
    }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="container stack-lg" style={{ flex: 1, justifyContent: 'center', paddingTop: 'var(--spacing-2xl)' }}>
        <div className="text-center">
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>
            Lightning Payday
          </h1>
          <p>Complete tasks, get paid instantly</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="stack-lg">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 XX XXX XXXX"
                autoComplete="tel"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block btn-lg"
              disabled={phone.length < 10}
            >
              Continue
            </button>
          </form>
        ) : (
          <div className="stack-lg">
            <div className="text-center">
              <p className="text-muted text-small">Enter your PIN</p>
              <p style={{ fontWeight: 600 }}>{phone}</p>
              <button 
                type="button" 
                onClick={() => { setStep('phone'); setPin(''); clearError(); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Change number
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <PinInput
              value={pin}
              onChange={handlePinChange}
              disabled={isLoading}
            />

            {isLoading && (
              <div className="text-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <p className="text-muted text-small">
            Don't have an account?{' '}
            <Link to="/register">Register</Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="card" style={{ 
          backgroundColor: 'var(--color-bg-tertiary)', 
          borderColor: 'var(--color-primary)',
          marginTop: 'var(--spacing-lg)'
        }}>
          <p className="text-small" style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>
            Demo Accounts (PIN: 1234)
          </p>
          <div className="stack" style={{ gap: 'var(--spacing-xs)' }}>
            <button
              type="button"
              onClick={() => { setPhone('+27800000001'); setStep('pin'); }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 'var(--spacing-xs) 0',
                fontSize: '0.875rem'
              }}
            >
              👑 Admin: +27800000001
            </button>
            <button
              type="button"
              onClick={() => { setPhone('+27800000002'); setStep('pin'); }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 'var(--spacing-xs) 0',
                fontSize: '0.875rem'
              }}
            >
              ✅ Operator: +27800000002
            </button>
            <button
              type="button"
              onClick={() => { setPhone('+27800000003'); setStep('pin'); }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 'var(--spacing-xs) 0',
                fontSize: '0.875rem'
              }}
            >
              💰 Earner: +27800000003
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

