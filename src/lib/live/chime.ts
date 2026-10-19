/**
 * A short two-note chime via WebAudio: no audio file to ship. Browsers only
 * allow sound after the user has interacted with the page, so this checks
 * that first and otherwise stays silent. Off if the user turned it off.
 */
let ctx: AudioContext | null = null;

export function playChime(): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('chat_sound_enabled') === 'false') return;
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
