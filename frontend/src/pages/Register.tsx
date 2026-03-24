import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PinInput } from '../components/PinInput';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Step = 'name' | 'phone' | 'pin' | 'confirm';

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<Step>('name');
  const [pinError, setPinError] = useState('');
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.length >= 2) {
      clearError();
      setStep('phone');
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
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
        await register(phone, pin, displayName);
        navigate('/tasks');
      } catch {
        setConfirmPin('');
      }
    }
  };

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
    }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="container stack-lg" style={{ flex: 1, paddingTop: 'var(--spacing-2xl)' }}>
        <div className="text-center">
          <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>
            Create Account
          </h1>
          <p className="text-small text-muted">
            Step {step === 'name' ? 1 : step === 'phone' ? 2 : step === 'pin' ? 3 : 4} of 4
          </p>
        </div>

        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="stack-lg">
            <div className="form-group">
              <label className="form-label">What should we call you?</label>
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

            <button 
              type="submit" 
              className="btn btn-primary btn-block btn-lg"
              disabled={displayName.length < 2}
            >
              Continue
            </button>
          </form>
        )}

        {step === 'phone' && (
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

            <div className="row" style={{ gap: 'var(--spacing-md)' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={goBack}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={phone.length < 10}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 'pin' && (
          <div className="stack-lg">
            <div className="text-center">
              <p style={{ fontWeight: 500 }}>Create a 4-digit PIN</p>
              <p className="text-muted text-small">You'll use this to log in</p>
            </div>

            <PinInput
              value={pin}
              onChange={handlePinChange}
              disabled={isLoading}
            />

            <button 
              type="button" 
              className="btn btn-secondary btn-block"
              onClick={goBack}
            >
              Back
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="stack-lg">
            <div className="text-center">
              <p style={{ fontWeight: 500 }}>Confirm your PIN</p>
              <p className="text-muted text-small">Enter the same PIN again</p>
            </div>

            {(pinError || error) && (
              <div className="error-message">
                {pinError || error}
              </div>
            )}

            <PinInput
              value={confirmPin}
              onChange={handleConfirmPinChange}
              disabled={isLoading}
            />

            {isLoading && (
              <div className="text-center">
                <LoadingSpinner />
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-secondary btn-block"
              onClick={goBack}
            >
              Back
            </button>
          </div>
        )}

        <div className="text-center">
          <p className="text-muted text-small">
            Already have an account?{' '}
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

