import { useState } from 'react';

type BalanceChange = { lifetimeXP?: number; currentCredits?: number };

export function TeacherEconomyControls({ studentName, lifetimeXP, currentCredits, onSetBalances }: { studentName: string; lifetimeXP: number; currentCredits: number; onSetBalances: (changes: BalanceChange) => Promise<void> }) {
  const [pending, setPending] = useState<BalanceChange>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function confirm() {
    if (!pending || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await onSetBalances(pending); setPending(undefined); setMessage(`Balances updated for ${studentName}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Balance change failed.'); }
    finally { setBusy(false); }
  }
  return <section className="teacher-reset teacher-economy-controls" aria-label="Teacher economy controls">
    <h2>XP and Credit controls</h2>
    <p>Current balance: {lifetimeXP.toLocaleString()} XP · {currentCredits} Credits. Resetting balances does not erase mission history, purchases, or reward limits.</p>
    <div className="reset-actions"><button className="quiet-button" disabled={busy} onClick={() => setPending({ lifetimeXP: 0 })}>Reset XP</button><button className="quiet-button" disabled={busy} onClick={() => setPending({ currentCredits: 0 })}>Reset Credits</button></div>
    {pending && <div className="reset-confirmation" role="alertdialog" aria-label="Confirm balance change"><h3>Change balances for {studentName}?</h3><p>{pending.lifetimeXP !== undefined ? 'XP will be set to 0.' : 'Credits will be set to 0.'} Previous rewards and purchases remain recorded.</p><div className="reset-actions"><button className="quiet-button" disabled={busy} onClick={() => setPending(undefined)}>Cancel</button><button className="quiet-button" disabled={busy} onClick={() => void confirm()}>Confirm balance change</button></div></div>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
