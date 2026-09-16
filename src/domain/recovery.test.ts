import { describe, expect, it } from 'vitest';
import { createRecovery, recoveryAction, recoverySteps, validRecoveryEvidence } from './recovery';
function level(state = createRecovery()) { for (const step of recoverySteps(state.phase)) state = recoveryAction(state, {type:'checkpoint',step:step.id}); return state; }
describe('three-level mouse assessment', () => {
 it('rejects shortcuts and requires verification after file paste', () => { let s = recoveryAction(createRecovery(),{type:'checkpoint',step:'paste'}); expect(s.step).toBe(0); for (const step of recoverySteps(0).slice(0,-1)) s = recoveryAction(s,{type:'checkpoint',step:step.id}); expect(s.secured).toEqual([]); expect(validRecoveryEvidence(s)).toBe(false); s = recoveryAction(s,{type:'checkpoint',step:'verify'}); expect(s.status).toBe('phase-complete'); });
 it('requires file, text and combined levels for valid saved evidence', () => { let s = createRecovery(); for(let i=0;i<3;i++){ s=level(s); if(i<2)s=recoveryAction(s,{type:'next'}); } expect(s.status).toBe('complete'); expect(s.secured).toHaveLength(3); expect(s.metrics.copies).toBe(2); expect(s.metrics.textCopies).toBe(2); expect(validRecoveryEvidence(s)).toBe(true); expect(validRecoveryEvidence({...s,metrics:{...s.metrics,textSelections:0}})).toBe(false); });
 it('allows learners time to read without losing progress', () => { const s = recoveryAction(recoveryAction(level(),{type:'next'}),{type:'tick',seconds:10000}); expect(s.status).toBe('active'); expect(s.phase).toBe(1); expect(s.secured).toEqual(['CORE_MAP.dat']); });
});
