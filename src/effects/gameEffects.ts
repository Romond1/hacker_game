export type GameEffect = 'hover' | 'click' | 'panel' | 'validation' | 'xp' | 'credit' | 'equip' | 'missionComplete' | 'reward' | 'purchase' | 'warning' | 'alarm' | 'unlock' | 'levelUp' | 'achievement' | 'transmission' | 'error' | 'accessGranted';
export type SoundTheme = Record<GameEffect, number[]>;
export const defaultSoundTheme: SoundTheme = { hover: [880], click: [440], panel: [330, 440], validation: [262, 330], xp: [659], credit: [784], equip: [523, 784], missionComplete: [440, 554, 659], reward: [660, 880], purchase: [523, 659, 784], warning: [220, 196], alarm: [330, 220, 330], unlock: [440, 660, 880], levelUp: [440, 554, 660, 880], achievement: [659, 784, 988], transmission: [880, 440, 880], error: [196, 147], accessGranted: [523, 784] };
let context: AudioContext | undefined;
let lastPlayed = new Map<GameEffect, number>();
export function playEffect(effect: GameEffect, muted = true, theme: SoundTheme = defaultSoundTheme) {
  if (muted || typeof window.AudioContext !== 'function') return;
  try {
    const now = Date.now(); const throttle = effect === 'hover' ? 100 : effect === 'xp' || effect === 'credit' ? 60 : 0;
    if (now - (lastPlayed.get(effect) ?? 0) < throttle) return;
    lastPlayed.set(effect, now);
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
    theme[effect].forEach((frequency, index) => {
      const oscillator = context!.createOscillator(); const volume = context!.createGain();
      const time = context!.currentTime + index * .11;
      oscillator.frequency.value = frequency; oscillator.type = 'sine';
      volume.gain.setValueAtTime(0, time); volume.gain.linearRampToValueAtTime(.04, time + .015); volume.gain.exponentialRampToValueAtTime(.001, time + .16);
      oscillator.connect(volume); volume.connect(context!.destination); oscillator.start(time); oscillator.stop(time + .18);
    });
  } catch { /* Audio must never block an operation. */ }
}
