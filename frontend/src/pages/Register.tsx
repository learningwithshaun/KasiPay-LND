import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PinInput } from '../components/PinInput';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Step = 'name' | 'phone' | 'pin' | 'confirm';

const stepNumber: Record<Step, number> = {
  name: 1,
  phone: 2,
  pin: 3,
  confirm: 4,
};

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<Step>('name');
  const [pinError, setPinError] = useState('');

  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const cleanedPhone = phone.replace(/\s/g, '');
  const phoneForApi = cleanedPhone.startsWith('+')
    ? cleanedPhone
    : `+27${cleanedPhone.replace(/^0/, '')}`;

  const goBack = () => {
    clearError();
    setPinError('');
    if (step === 'confirm') {
      setConfirmPin('');
      setStep('pin');
    } else if (step === 'pin') {
      setPin('');
      setStep('phone');
    } else if (step === 'phone') {
      setStep('name');
    } else {
      navigate('/login');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length >= 2) {
      clearError();
      setStep('phone');
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneForApi.length >= 12) {
      clearError();
      setStep('pin');
    }
  };

  const handlePinChange = (newPin: string) => {
    setPin(newPin);
    setPinError('');

    if (newPin.length === 4) {
      setStep('confirm');
    }
  };

  const handleConfirmPinChange = async (newConfirmPin: string) => {
    setConfirmPin(newConfirmPin);
    setPinError('');

    if (newConfirmPin.length === 4) {
      if (newConfirmPin !== pin) {
        setPinError('PINs do not match');
        setConfirmPin('');
        return;
      }

      try {
        await register(phoneForApi, pin, displayName.trim());
        navigate('/tasks');
      } catch {
        setConfirmPin('');
      }
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <button type="button" className="btn btn-secondary" onClick={goBack} aria-label="Go back">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="row" style={{ gap: '0.5rem' }}>
          <div className="progress" style={{ width: 72, height: 8 }}>
            <span style={{ width: `${stepNumber[step] * 25}%` }} />
          </div>
          <span className="text-small text-muted" style={{ fontWeight: 800 }}>
            Step {stepNumber[step]} of 4
          </span>
        </div>
      </header>

      <main className="auth-main">
        <section className="text-center stack" style={{ alignItems: 'center', marginBottom: '2rem' }}>
          <div className="brand-mark">
            <span className="material-symbols-outlined" style={{ fontSize: 38, fontVariationSettings: "'FILL' 1" }}>
              {step === 'pin' || step === 'confirm' ? 'lock' : 'person_add'}
            </span>
          </div>
          <div>
            <h1 style={{ color: 'var(--color-primary)' }}>
              {step === 'name' && 'Create your account'}
              {step === 'phone' && 'What is your number?'}
              {step === 'pin' && 'Secure your account'}
              {step === 'confirm' && 'Confirm your PIN'}
            </h1>
            <p>
              {step === 'name' && 'Tell us what to call you.'}
              {step === 'phone' && "We'll use this for your KasiPay login."}
              {step === 'pin' && "Create a 4-digit PIN. Don't share it with anyone."}
              {step === 'confirm' && 'Enter the same PIN again.'}
            </p>
          </div>
        </section>

        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="stack-lg">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                autoFocus
                maxLength={50}
              />
            </div>
            <button type="submit" className="btn btn-action btn-block btn-lg" disabled={displayName.trim().length < 2}>
              Continue
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        )}

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="stack-lg">
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
              Send verification code
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        )}

        {step === 'pin' && (
          <div className="stack-lg">
            <div className="chip" style={{ margin: '0 auto' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
              Bank-grade encryption
            </div>
            <PinInput value={pin} onChange={handlePinChange} disabled={isLoading} />
          </div>
        )}

        {step === 'confirm' && (
          <div className="stack-lg">
            {(pinError || error) && <div className="error-message">{pinError || error}</div>}
            <PinInput value={confirmPin} onChange={handleConfirmPinChange} disabled={isLoading} />
            {isLoading && (
              <div className="text-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        )}

        <div className="text-center" style={{ marginTop: '1.5rem' }}>
          <p className="text-muted text-small">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
