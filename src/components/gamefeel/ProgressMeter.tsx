export function ProgressMeter({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  return <div className="game-progress"><div className="game-progress-label"><strong>{label}</strong>{detail && <span>{detail}</span>}</div><div className="game-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue}><span style={{ width: `${(safeValue / safeMax) * 100}%` }} /></div></div>;
}
