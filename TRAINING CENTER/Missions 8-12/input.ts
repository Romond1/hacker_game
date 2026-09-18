import { physicalKeyCode } from '../../src/domain/modifier-cycle';
import type { InputEvent } from './types';

/** One owner for physical events. Browser shortcuts remain normal outside the focused canvas. */
export class KeyboardInput {
  readonly held = new Set<string>();
  private controller = new AbortController();
  constructor(private root: HTMLElement, private onInput: (event: InputEvent) => void, private onLostFocus: (nextTarget: EventTarget | null) => void, private active: () => boolean) {
    const signal = this.controller.signal;
    root.addEventListener('keydown', e => this.handle(e, 'down'), { signal });
    root.addEventListener('keyup', e => this.handle(e, 'up'), { signal });
    root.addEventListener('blur', event => this.reset(event.relatedTarget), { signal });
    window.addEventListener('blur', () => this.reset(), { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); }, { signal });
  }
  private handle(event: KeyboardEvent, type: 'down' | 'up') {
    if (document.activeElement !== this.root || !this.active()) return;
    const code = physicalKeyCode(event);
    const shortcut = (event.ctrlKey || event.metaKey) && ['KeyC', 'KeyV', 'KeyA', 'KeyF'].includes(code);
    if (shortcut || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) event.preventDefault();
    if (type === 'down' && (event.repeat || this.held.has(code))) return;
    if (type === 'down') this.held.add(code); else this.held.delete(code);
    this.onInput({ type, code, ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey, held: [...this.held] });
  }
  clear() { this.held.clear(); }
  private reset(nextTarget: EventTarget | null = null) { this.clear(); this.onLostFocus(nextTarget); }
  dispose() { this.controller.abort(); this.clear(); }
}
