import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PinInput({ length = 4, value, onChange, disabled }: PinInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '');
    if (newValue.length <= length) {
      onChange(newValue);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (value.length < length) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="stack-lg">
      {/* Hidden input for keyboard on mobile */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        autoComplete="one-time-code"
      />

      {/* Visual PIN display */}
      <div 
        className="pin-input-container" 
        onClick={() => !disabled && inputRef.current?.focus()}
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      >
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className="pin-digit"
            style={{
              borderColor: i === value.length && focused ? 'var(--color-primary)' : undefined,
            }}
          >
            {value[i] ? '•' : ''}
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((key, i) => (
          <button
            key={i}
            type="button"
            className="keypad-btn"
            disabled={disabled || key === ''}
            onClick={() => {
              if (key === '←') {
                handleBackspace();
              } else if (key !== '') {
                handleKeypadPress(key);
              }
            }}
            style={key === '' ? { visibility: 'hidden' } : undefined}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

