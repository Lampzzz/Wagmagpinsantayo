const BEEPS = 4;
const BEEP_SECONDS = 0.1;
const GAP_SECONDS = 0.1;
const PAUSE_SECONDS = 0.5;
// Short fades so no beep starts or stops with a click.
const FADE_SECONDS = 0.005;
// B5, a classic alarm-clock pitch.
const PITCH_HZ = 988;
const VOLUME = 0.8;

/**
 * One loop of the alarm tone as mono samples at `sampleRate`: four short beeps, then a
 * pause, 1.3 seconds in all. It starts and ends silent, so it repeats seamlessly.
 */
export function buildAlarmPattern(sampleRate: number): Float32Array<ArrayBuffer> {
  const beep = Math.round(BEEP_SECONDS * sampleRate);
  const step = beep + Math.round(GAP_SECONDS * sampleRate);
  const fade = Math.max(1, Math.round(FADE_SECONDS * sampleRate));
  const samples = new Float32Array(BEEPS * step + Math.round(PAUSE_SECONDS * sampleRate));
  for (let n = 0; n < BEEPS; n++) {
    for (let i = 0; i < beep; i++) {
      const envelope = Math.min(1, i / fade, (beep - 1 - i) / fade);
      samples[n * step + i] =
        VOLUME * envelope * Math.sin((2 * Math.PI * PITCH_HZ * i) / sampleRate);
    }
  }
  return samples;
}
