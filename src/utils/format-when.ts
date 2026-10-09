import { calendarDaysBetween } from './resolve-when';

// Spelled out rather than Intl-formatted: replies are English sentences built
// around these words, and they must read the same on every phone.
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * A due date or reminder time in words: "today at 3:05 PM", "tomorrow",
 * "Fri, Oct 16 at 9:00 AM" or "Tue, Jan 5, 2027". Lowercase, for use mid-sentence.
 */
export function formatWhen(at: number, hasTime: boolean, now: number): string {
  const day = formatDay(at, now);
  return hasTime ? `${day} at ${formatTime(at)}` : day;
}

/** "today", "tomorrow", "yesterday", "Fri, Oct 16" or "Tue, Jan 5, 2027". */
export function formatDay(at: number, now: number): string {
  const days = calendarDaysBetween(now, at);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  const date = new Date(at);
  const label = `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}

/** "3:05 PM" */
export function formatTime(at: number): string {
  const date = new Date(at);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** "in 5 minutes", "in 1 hour 30 minutes", "in 3 days" or "10 minutes ago". */
export function formatRelative(at: number, now: number): string {
  const minutes = Math.round((at - now) / 60_000);
  const size = Math.abs(minutes);
  if (size === 0) return 'now';
  let amount: string;
  if (size < 60) {
    amount = plural(size, 'minute');
  } else if (size < 24 * 60) {
    const hours = Math.floor(size / 60);
    const rest = size % 60;
    amount =
      rest === 0 ? plural(hours, 'hour') : `${plural(hours, 'hour')} ${plural(rest, 'minute')}`;
  } else {
    amount = plural(Math.round(size / (24 * 60)), 'day');
  }
  return minutes > 0 ? `in ${amount}` : `${amount} ago`;
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}
