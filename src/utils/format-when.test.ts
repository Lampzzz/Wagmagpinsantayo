import { formatRelative, formatTime, formatWhen } from './format-when';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// Thursday, Oct 8, 2026, 2:30 PM.
const NOW = at(2026, 10, 8, 14, 30);
const MINUTE = 60_000;

describe('formatWhen', () => {
  it('names today, tomorrow and yesterday', () => {
    expect(formatWhen(at(2026, 10, 8, 15, 5), true, NOW)).toBe('today at 3:05 PM');
    expect(formatWhen(at(2026, 10, 9, 8), true, NOW)).toBe('tomorrow at 8:00 AM');
    expect(formatWhen(at(2026, 10, 7, 9), true, NOW)).toBe('yesterday at 9:00 AM');
  });

  it('leaves the time out of all-day dates', () => {
    expect(formatWhen(at(2026, 10, 9, 23, 59), false, NOW)).toBe('tomorrow');
    expect(formatWhen(at(2026, 10, 16, 23, 59), false, NOW)).toBe('Fri, Oct 16');
  });

  it('shows the weekday and date further out, and the year when it differs', () => {
    expect(formatWhen(at(2026, 10, 16, 9), true, NOW)).toBe('Fri, Oct 16 at 9:00 AM');
    expect(formatWhen(at(2027, 1, 5), false, NOW)).toBe('Tue, Jan 5, 2027');
  });
});

describe('formatTime', () => {
  it('uses a 12-hour clock', () => {
    expect(formatTime(at(2026, 10, 8, 0, 0))).toBe('12:00 AM');
    expect(formatTime(at(2026, 10, 8, 12, 0))).toBe('12:00 PM');
    expect(formatTime(at(2026, 10, 8, 20, 7))).toBe('8:07 PM');
  });
});

describe('formatRelative', () => {
  it.each([
    [0, 'now'],
    [1, 'in 1 minute'],
    [5, 'in 5 minutes'],
    [90, 'in 1 hour 30 minutes'],
    [120, 'in 2 hours'],
    [3 * 24 * 60, 'in 3 days'],
    [-10, '10 minutes ago'],
  ])('describes %p minutes as %p', (minutes, expected) => {
    expect(formatRelative(NOW + minutes * MINUTE, NOW)).toBe(expected);
  });
});
