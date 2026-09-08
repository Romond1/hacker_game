export function AmbientLayer({ variant = 'grid' }: { variant?: 'grid' | 'scan' | 'signal' }) {
  return <div className={`ambient-layer ambient-${variant}`} aria-hidden="true"><i /><i /><i /></div>;
}
