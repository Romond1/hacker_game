import { useState } from 'react';
import { MISSIONS } from '../../missions/catalog';

export function ResetMissionControls({ studentName, onReset }: { studentName: string; onReset: (missionId: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const mission = MISSIONS.find(item => item.id === selected);
  async function confirm() {
    if (!mission || busy) return;
    setBusy(true); setError(''); setStatus('');
    try {
      await onReset(mission.id);
      setSelected(undefined);
      setStatus(`Mission ${mission.number} reset for ${studentName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Reset failed. Please try again.');
    } finally { setBusy(false); }
  }
  return <section className="teacher-reset" aria-label="Teacher mission controls">
    <h2>Reset mission progress</h2>
    <p>Clear a mission so this student can start it again. Later missions remain available.</p>
    <div className="reset-actions">{MISSIONS.map(item => <button className="quiet-button" key={item.id} disabled={busy} onClick={() => { setSelected(item.id); setError(''); setStatus(''); }}>Reset Mission {item.number}</button>)}</div>
    {mission && <div className="reset-confirmation" role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-description">
      <h3 id="reset-title">Reset Mission {mission.number} for {studentName}?</h3>
      <p id="reset-description">This permanently deletes this mission’s attempts, activity, personal bests, training points, and mission-specific awards. Lifetime XP, Credits, inventory, credit limits, and unlocked story progress remain. Other missions and students are kept. An attempt currently in progress will be invalidated.</p>
      <div className="reset-actions"><button className="quiet-button" autoFocus disabled={busy} onClick={() => { setSelected(undefined); setError(''); }}>Cancel</button><button className="quiet-button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Resetting…' : 'Confirm reset'}</button></div>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
  </section>;
}
