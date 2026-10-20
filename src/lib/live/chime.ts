/**
 * A short two-note chime via WebAudio: no audio file to ship. Browsers only
 * allow sound after the user has interacted with the page, so this checks
 * that first and otherwise stays silent. Off if the user turned it off.
 */
let ctx: AudioContext | null = null;

const SOUND_KEY = 'chat_sound_enabled';
const soundListeners = new Set<() => void>();

/** Whether this browser plays the chime (Profile -> Chat Sound). On unless turned off. */
export function chatSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setChatSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, String(on));
  } catch {
    /* storage blocked: nothing to remember it in */
  }
  soundListeners.forEach((fn) => fn());
}

/** For useSyncExternalStore. */
export function subscribeChatSound(fn: () => void): () => void {
  soundListeners.add(fn);
  return () => soundListeners.delete(fn);
}

export function playChime(): void {
  try {
    if (typeof window === 'undefined') return;
    if (!chatSoundEnabled()) return;
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;

    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();

    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    /* sound is a nicety; never let it throw */
  }
}
