import { parseWhen } from './parse-when';
import { calendarDaysBetween, dayWindow, resolveWhen, type WhenPurpose } from './resolve-when';

// Local time, so the tests read the same in any time zone. Months are 1-based here.
function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function endOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

// Thursday, Oct 8, 2026, 2:30 PM.
const NOW = at(2026, 10, 8, 14, 30);

type Options = {
  purpose?: WhenPurpose;
  now?: number;
  base?: { at: number; hasTime: boolean };
};

function resolve(text: string, { purpose = 'reminder', now = NOW, base }: Options = {}) {
  const parts = parseWhen(text, { loose: true });
  if (!parts) throw new Error(`"${text}" didn't parse`);
  return resolveWhen(parts, { now, purpose, base });
}

function ok(atMs: number, hasTime = true) {
  return { kind: 'ok', at: atMs, hasTime };
}

describe('resolveWhen', () => {
  it('adds offsets to now', () => {
    expect(resolve('in 5 minutes')).toEqual(ok(NOW + 5 * 60_000));
    expect(resolve('in 2 hours')).toEqual(ok(NOW + 2 * 60 * 60_000));
  });

  it('places a bare hour at its next daytime occurrence', () => {
    expect(resolve('at 3')).toEqual(ok(at(2026, 10, 8, 15)));
    expect(resolve('at 9')).toEqual(ok(at(2026, 10, 8, 21)));
    expect(resolve('at 6:45')).toEqual(ok(at(2026, 10, 8, 18, 45)));
  });

  it('suggests tomorrow when a bare hour has passed today', () => {
    expect(resolve('at 2')).toEqual({ kind: 'passed', suggestion: at(2026, 10, 9, 14) });
    expect(resolve('2 PM')).toEqual({ kind: 'passed', suggestion: at(2026, 10, 9, 14) });
  });

  it('reads a bare hour on a named day as morning for 7–11 and afternoon otherwise', () => {
    expect(resolve('tomorrow at 8')).toEqual(ok(at(2026, 10, 9, 8)));
    expect(resolve('tomorrow at 6')).toEqual(ok(at(2026, 10, 9, 18)));
    expect(resolve('tomorrow at 12')).toEqual(ok(at(2026, 10, 9, 12)));
  });

  it('refuses a named day and time that have passed, without a suggestion', () => {
    expect(resolve('today at 2 PM')).toEqual({ kind: 'passed', suggestion: null });
  });

  it('makes a date without a time all-day for tasks and 9 AM for reminders', () => {
    expect(resolve('tomorrow', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 9), false));
    expect(resolve('tomorrow')).toEqual(ok(at(2026, 10, 9, 9)));
    expect(resolve('today', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 8), false));
  });

  it('asks for a time when a reminder for today is past 9 AM', () => {
    expect(resolve('today')).toEqual({ kind: 'needs-time' });
  });

  it('uses the default hours for parts of the day', () => {
    expect(resolve('tonight')).toEqual(ok(at(2026, 10, 8, 20)));
    expect(resolve('tomorrow morning')).toEqual(ok(at(2026, 10, 9, 9)));
    expect(resolve('midnight')).toEqual(ok(at(2026, 10, 9, 0)));
  });

  it('finds weekdays, counting today and treating "next" as next week', () => {
    expect(resolve('Thursday', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 8), false));
    expect(resolve('Friday', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 9), false));
    expect(resolve('next Friday', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 16), false));
    expect(resolve('next Thursday', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 15), false));
    const saturday = at(2026, 10, 10, 10);
    expect(resolve('next Friday', { purpose: 'task', now: saturday })).toEqual(
      ok(endOf(2026, 10, 16), false),
    );
  });

  it('moves a month and day that already passed into next year', () => {
    expect(resolve('Oct 15', { purpose: 'task' })).toEqual(ok(endOf(2026, 10, 15), false));
    expect(resolve('Oct 1', { purpose: 'task' })).toEqual(ok(endOf(2027, 10, 1), false));
    expect(resolve('Jan 5', { purpose: 'task' })).toEqual(ok(endOf(2027, 1, 5), false));
  });

  it('rejects days that are not deadlines or do not exist', () => {
    expect(resolve('this week', { purpose: 'task' })).toEqual({ kind: 'invalid' });
    expect(resolve('Feb 29', { purpose: 'task' })).toEqual({ kind: 'invalid' });
    expect(resolve('Feb 29 2028', { purpose: 'task' })).toEqual(ok(endOf(2028, 2, 29), false));
  });

  describe('when editing', () => {
    const tomorrowAt10 = { at: at(2026, 10, 9, 10), hasTime: true };

    it("keeps the item's day for a time-only phrase", () => {
      expect(resolve('3 PM', { base: tomorrowAt10 })).toEqual(ok(at(2026, 10, 9, 15)));
      expect(resolve('at 3', { base: tomorrowAt10 })).toEqual(ok(at(2026, 10, 9, 15)));
    });

    it("keeps the item's time for a date-only phrase", () => {
      expect(resolve('Saturday', { base: tomorrowAt10 })).toEqual(ok(at(2026, 10, 10, 10)));
    });

    it('uses today when the item is already in the past', () => {
      const yesterday = { at: at(2026, 10, 7, 10), hasTime: true };
      expect(resolve('at 4 PM', { base: yesterday })).toEqual(ok(at(2026, 10, 8, 16)));
    });

    it('keeps an all-day deadline all-day', () => {
      const allDay = { at: endOf(2026, 10, 9), hasTime: false };
      expect(resolve('Saturday', { purpose: 'task', base: allDay })).toEqual(
        ok(endOf(2026, 10, 10), false),
      );
    });
  });

  it('keeps wall-clock times across a daylight-saving change', () => {
    // US clocks go back on Nov 1, 2026. Run with TZ=America/New_York to exercise it.
    const halloween = at(2026, 10, 31, 10);
    const tomorrowAt9 = resolve('tomorrow at 9 AM', { now: halloween });
    expect(tomorrowAt9).toEqual(ok(at(2026, 11, 1, 9)));
    expect(resolve('in 2 hours', { now: halloween })).toEqual(ok(halloween + 2 * 60 * 60_000));
  });
});

describe('dayWindow', () => {
  function window(text: string) {
    const parts = parseWhen(text);
    if (!parts) throw new Error(`"${text}" didn't parse`);
    return dayWindow(parts, NOW);
  }

  it('covers one day for a named day', () => {
    expect(window('today')).toEqual({ start: at(2026, 10, 8), end: at(2026, 10, 9) });
    expect(window('tonight')).toEqual({ start: at(2026, 10, 8), end: at(2026, 10, 9) });
    expect(window('tomorrow')).toEqual({ start: at(2026, 10, 9), end: at(2026, 10, 10) });
  });

  it('covers Monday-to-Sunday weeks', () => {
    expect(window('this week')).toEqual({ start: at(2026, 10, 8), end: at(2026, 10, 12) });
    expect(window('next week')).toEqual({ start: at(2026, 10, 12), end: at(2026, 10, 19) });
  });

  it('ignores phrases with a clock time', () => {
    expect(window('at 5pm')).toBeNull();
  });
});

describe('calendarDaysBetween', () => {
  it('counts calendar days, not 24-hour spans', () => {
    expect(calendarDaysBetween(at(2026, 10, 8, 23, 59), at(2026, 10, 9, 0, 1))).toBe(1);
    expect(calendarDaysBetween(NOW, at(2026, 10, 7, 9))).toBe(-1);
  });
});
