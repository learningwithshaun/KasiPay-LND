interface LoadingSpinnerProps {
  size?: 'sm' | 'lg';
  centered?: boolean;
}

export function LoadingSpinner({ size = 'sm', centered = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
  );

  if (centered) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 'var(--spacing-2xl)',
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
}

