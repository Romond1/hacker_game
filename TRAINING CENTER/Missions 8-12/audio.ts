import type { GameEvent } from './types';
/** Optional sound hook; silent by default. Replace synthesis with assets without touching rules. */
export class AudioFeedback {
  enabled = false;
  private context?: AudioContext;
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) { try { this.context ??= new AudioContext(); void this.context.resume().catch(() => { this.enabled = false; }); } catch { this.enabled = false; } }
  }
  play(event: GameEvent) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx=this.context, now=ctx.currentTime;
    const notes=event.type==='complete'?[440,554,660,880]:event.type==='unlock'?[440,660]:event.type==='detected'?[180,140]:event.type==='wrong'?[220]:[550];
    notes.forEach((frequency,i)=>{
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,now+i*.1);gain.gain.linearRampToValueAtTime(.035,now+i*.1+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.1+.2);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(now+i*.1);oscillator.stop(now+i*.1+.22);
    });
  }
  dispose() { void this.context?.close(); }
}
