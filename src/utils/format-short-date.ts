const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const FULL_DATE = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * A compact time stamp: the time for today, "Oct 9" for earlier this year and
 * "Oct 9, 2025" for older dates, in the phone's locale and time zone.
 */
export function formatShortDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  if (date.getFullYear() !== today.getFullYear()) return FULL_DATE.format(date);
  if (date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
    return TIME.format(date);
  }
  return MONTH_DAY.format(date);
}
