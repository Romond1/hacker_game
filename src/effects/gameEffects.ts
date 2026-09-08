export type GameEffect = 'missionComplete' | 'reward' | 'purchase' | 'warning' | 'alarm' | 'unlock' | 'levelUp' | 'achievement' | 'transmission' | 'error' | 'accessGranted';
const tones: Record<GameEffect, number[]> = { missionComplete: [440, 554, 659], reward: [660, 880], purchase: [523, 659, 784], warning: [220, 196], alarm: [330, 220, 330], unlock: [440, 660, 880], levelUp: [440, 554, 660, 880], achievement: [659, 784, 988], transmission: [880, 440, 880], error: [196, 147], accessGranted: [523, 784] };
let context: AudioContext | undefined;
export function playEffect(effect: GameEffect, muted = true) {
  if (muted || typeof window.AudioContext !== 'function') return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
    tones[effect].forEach((frequency, index) => {
      const oscillator = context!.createOscillator(); const volume = context!.createGain();
      const time = context!.currentTime + index * .11;
      oscillator.frequency.value = frequency; oscillator.type = 'sine';
      volume.gain.setValueAtTime(0, time); volume.gain.linearRampToValueAtTime(.04, time + .015); volume.gain.exponentialRampToValueAtTime(.001, time + .16);
      oscillator.connect(volume); volume.connect(context!.destination); oscillator.start(time); oscillator.stop(time + .18);
    });
  } catch { /* Audio must never block an operation. */ }
}
