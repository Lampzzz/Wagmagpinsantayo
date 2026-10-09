import { formatShortDate } from './format-short-date';

// Expected strings use the same Intl options, so the tests pass in any locale.
function format(timestamp: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(timestamp);
}

// Oct 9, 2026, 3:30 PM in the local time zone.
const NOW = new Date(2026, 9, 9, 15, 30).getTime();

describe('formatShortDate', () => {
  it('shows only the time for today', () => {
    const morning = new Date(2026, 9, 9, 8, 5).getTime();
    expect(formatShortDate(morning, NOW)).toBe(
      format(morning, { hour: 'numeric', minute: '2-digit' }),
    );
  });

  it('shows the month and day for earlier this year', () => {
    const yesterday = new Date(2026, 9, 8, 23, 59).getTime();
    expect(formatShortDate(yesterday, NOW)).toBe(
      format(yesterday, { month: 'short', day: 'numeric' }),
    );
  });

  it('adds the year for older dates, even on the same day of the year', () => {
    const lastYear = new Date(2025, 9, 9, 15, 30).getTime();
    expect(formatShortDate(lastYear, NOW)).toBe(
      format(lastYear, { month: 'short', day: 'numeric', year: 'numeric' }),
    );
  });
});
