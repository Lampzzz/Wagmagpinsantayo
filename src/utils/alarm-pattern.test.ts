import { buildAlarmPattern } from './alarm-pattern';

describe('buildAlarmPattern', () => {
  it('lasts 1.3 seconds', () => {
    expect(buildAlarmPattern(48_000)).toHaveLength(62_400);
    expect(buildAlarmPattern(44_100)).toHaveLength(57_330);
  });

  it('starts and ends silent, so the loop has no click', () => {
    const samples = buildAlarmPattern(44_100);
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(0);
  });

  it('beeps four times', () => {
    const samples = buildAlarmPattern(44_100);
    let beeps = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i - 1] === 0 && samples[i] !== 0) beeps++;
    }
    expect(beeps).toBe(4);
  });

  it('stays within full scale', () => {
    const samples = buildAlarmPattern(44_100);
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThanOrEqual(1);
  });
});
