import type { Reminder } from '../types';
import {
  alertData,
  isAlertCurrent,
  nextDailyOccurrence,
  planAlert,
  skipTodaysOccurrence,
} from './repeat-rules';

// Local-time dates, so the tests pass in any time zone.
function at(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

// Saturday, Oct 10, 2026, 2:30 PM.
const NOW = at(2026, 10, 10, 14, 30);

describe('nextDailyOccurrence', () => {
  it("rings later today when today's time is still to come", () => {
    expect(nextDailyOccurrence(at(2026, 10, 3, 20), NOW)).toBe(at(2026, 10, 10, 20));
  });

  it("rings tomorrow once today's time has passed", () => {
    expect(nextDailyOccurrence(at(2026, 10, 3, 8), NOW)).toBe(at(2026, 10, 11, 8));
  });

  it('moves on to tomorrow at the very minute it rings', () => {
    expect(nextDailyOccurrence(at(2026, 10, 3, 14, 30), NOW)).toBe(at(2026, 10, 11, 14, 30));
  });

  it('starts no earlier than the first time it was set for', () => {
    expect(nextDailyOccurrence(at(2026, 10, 15, 8), NOW)).toBe(at(2026, 10, 15, 8));
    expect(nextDailyOccurrence(at(2026, 10, 10, 20), NOW)).toBe(at(2026, 10, 10, 20));
  });

  it('rings on the minute, dropping seconds', () => {
    expect(nextDailyOccurrence(at(2026, 10, 10, 20, 5, 42), NOW)).toBe(at(2026, 10, 10, 20, 5));
    // 2:30:20 PM rounds down to 2:30 PM, which has already come.
    expect(nextDailyOccurrence(at(2026, 10, 10, 14, 30, 20), at(2026, 10, 10, 14, 30, 10))).toBe(
      at(2026, 10, 11, 14, 30),
    );
  });

  it('rolls over the end of the month and the year', () => {
    expect(nextDailyOccurrence(at(2026, 10, 1, 7), at(2026, 10, 31, 9))).toBe(at(2026, 11, 1, 7));
    expect(nextDailyOccurrence(at(2026, 12, 1, 7), at(2026, 12, 31, 9))).toBe(at(2027, 1, 1, 7));
  });
});

describe('skipTodaysOccurrence', () => {
  it("skips today's time when it is still to come", () => {
    expect(skipTodaysOccurrence(at(2026, 10, 1, 20), NOW)).toBe(at(2026, 10, 11, 20));
  });

  it("keeps tomorrow's time when today's has already rung", () => {
    expect(skipTodaysOccurrence(at(2026, 10, 1, 8), NOW)).toBe(at(2026, 10, 11, 8));
  });

  it('changes nothing when today is already skipped', () => {
    const skipped = skipTodaysOccurrence(at(2026, 10, 1, 20), NOW);
    expect(skipTodaysOccurrence(skipped, NOW)).toBe(skipped);
  });

  it('keeps a start date that is still days away', () => {
    expect(skipTodaysOccurrence(at(2026, 10, 15, 8), NOW)).toBe(at(2026, 10, 15, 8));
  });
});

describe('planAlert', () => {
  function plan(changes: Partial<Pick<Reminder, 'status' | 'scheduledAt' | 'repeat'>>, now = NOW) {
    return planAlert({ status: 'scheduled', scheduledAt: NOW, repeat: null, ...changes }, now);
  }

  it('alerts once for a one-off reminder that is still to come', () => {
    expect(plan({ scheduledAt: at(2026, 10, 11, 9) })).toEqual({
      kind: 'once',
      at: at(2026, 10, 11, 9),
    });
    expect(plan({ scheduledAt: at(2026, 10, 10, 9) })).toBeNull();
  });

  it('never alerts for a finished reminder, daily or not', () => {
    for (const status of ['completed', 'dismissed', 'cancelled'] as const) {
      expect(plan({ status, scheduledAt: at(2026, 10, 11, 9) })).toBeNull();
      expect(plan({ status, scheduledAt: at(2026, 10, 11, 9), repeat: 'daily' })).toBeNull();
    }
  });

  it('uses the daily alert when the next time is the next one to come round', () => {
    expect(plan({ scheduledAt: at(2026, 10, 1, 8), repeat: 'daily' })).toEqual({
      kind: 'daily',
      at: at(2026, 10, 11, 8),
    });
    expect(plan({ scheduledAt: at(2026, 10, 1, 20), repeat: 'daily' })).toEqual({
      kind: 'daily',
      at: at(2026, 10, 10, 20),
    });
  });

  it("covers a skipped day with a one-off alert, then switches back once today's time passes", () => {
    const skipped = skipTodaysOccurrence(at(2026, 10, 1, 20), NOW);
    expect(plan({ scheduledAt: skipped, repeat: 'daily' })).toEqual({
      kind: 'once',
      at: at(2026, 10, 11, 20),
    });
    expect(plan({ scheduledAt: skipped, repeat: 'daily' }, at(2026, 10, 10, 20, 1))).toEqual({
      kind: 'daily',
      at: at(2026, 10, 11, 20),
    });
  });

  it('waits with a one-off alert for a daily reminder that starts on a later day', () => {
    expect(plan({ scheduledAt: at(2026, 10, 15, 8), repeat: 'daily' })).toEqual({
      kind: 'once',
      at: at(2026, 10, 15, 8),
    });
  });
});

describe('isAlertCurrent', () => {
  const once = { kind: 'once', at: at(2026, 10, 11, 9) } as const;
  const daily = { kind: 'daily', at: at(2026, 10, 11, 8) } as const;

  it('reads back the data it writes', () => {
    expect(isAlertCurrent(once, alertData(4, once))).toBe(true);
    expect(isAlertCurrent(daily, alertData(4, daily))).toBe(true);
    expect(alertData(4, daily)).toEqual({ reminderId: 4, scheduledAt: daily.at, repeat: 'daily' });
  });

  it('matches a one-off alert on its exact time, as alerts saved before repeats did', () => {
    expect(isAlertCurrent(once, { reminderId: 4, scheduledAt: once.at })).toBe(true);
    expect(isAlertCurrent(once, { reminderId: 4, scheduledAt: once.at + 60_000 })).toBe(false);
    expect(isAlertCurrent(once, { reminderId: 4 })).toBe(false);
  });

  it('matches a daily alert on its time of day, whichever day it started', () => {
    const lastWeek = { reminderId: 4, scheduledAt: at(2026, 10, 3, 8), repeat: 'daily' };
    expect(isAlertCurrent(daily, lastWeek)).toBe(true);
    expect(isAlertCurrent(daily, { ...lastWeek, scheduledAt: at(2026, 10, 3, 8, 30) })).toBe(false);
  });

  it('never mistakes a daily alert for a one-off, or the other way round', () => {
    expect(isAlertCurrent(once, alertData(4, { kind: 'daily', at: once.at }))).toBe(false);
    expect(isAlertCurrent(daily, alertData(4, { kind: 'once', at: daily.at }))).toBe(false);
  });

  it('never mistakes an alarm for a plain alert, or the other way round', () => {
    expect(alertData(4, once, true)).toEqual({ reminderId: 4, scheduledAt: once.at, alarm: true });
    expect(isAlertCurrent(once, alertData(4, once, true), true)).toBe(true);
    expect(isAlertCurrent(daily, alertData(4, daily, true), true)).toBe(true);
    // Alerts saved before alarms existed are plain.
    expect(isAlertCurrent(once, alertData(4, once), true)).toBe(false);
    expect(isAlertCurrent(once, alertData(4, once, true))).toBe(false);
  });
});
