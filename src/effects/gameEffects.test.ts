import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSoundTheme, playEffect } from './gameEffects';

afterEach(() => vi.unstubAllGlobals());

describe('game effects', () => {
  it('defines a replaceable semantic default sound theme', () => {
    expect(defaultSoundTheme).toMatchObject({ hover: expect.any(Array), click: expect.any(Array), validation: expect.any(Array), purchase: expect.any(Array), equip: expect.any(Array) });
  });

  it('does not create audio while muted', () => {
    const audio = vi.fn();
    vi.stubGlobal('AudioContext', audio);
    playEffect('click', true);
    expect(audio).not.toHaveBeenCalled();
  });

  it('throttles repeated hover sounds centrally', () => {
    const createOscillator = vi.fn(() => ({ frequency: { value: 0 }, type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn() }));
    class FakeAudioContext {
      currentTime = 0; destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      createOscillator = createOscillator;
      createGain = vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }));
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    playEffect('hover', false);
    playEffect('hover', false);
    expect(createOscillator).toHaveBeenCalledTimes(1);
  });
});
