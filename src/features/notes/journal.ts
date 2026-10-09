import { capitalize } from '@/utils/capitalize';
import { formatDay } from '@/utils/format-when';

import type { JournalDay, JournalEntry } from './types';

// Spelled out, like the rest of the app's dates, so labels read the same on every phone.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The heading and preview never need more of the body than this.
const PREVIEW_SOURCE_LENGTH = 1_000;

/**
 * Groups journal entries by the local calendar day they were written: newest day
 * first, and newest first within a day. Days without entries are left out.
 */
export function groupByDay(entries: readonly JournalEntry[], now: number): JournalDay[] {
  const newestFirst = [...entries].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  const days: JournalDay[] = [];
  for (const entry of newestFirst) {
    const key = dayKey(entry.createdAt);
    const current = days[days.length - 1];
    if (current?.key === key) {
      current.entries.push(entry);
    } else {
      days.push({
        key,
        title: journalDayTitle(entry.createdAt, now),
        startsAt: startOfLocalDay(entry.createdAt),
        entries: [entry],
      });
    }
  }
  return days;
}

/** "Today", "Yesterday", "Mon, Oct 6", or "Mon, Oct 6, 2025" when it isn't this year. */
export function journalDayTitle(at: number, now: number): string {
  return capitalize(formatDay(at, now));
}

/** The pieces of a day for the journal's strip of days: "Mon", "6" and "Oct". */
export function dayTile(at: number): { weekday: string; day: string; month: string } {
  const date = new Date(at);
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()),
    month: MONTHS[date.getMonth()],
  };
}

/** The local calendar date of a time, such as "2026-10-06". */
export function dayKey(at: number): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local midnight at the start of the day `at` falls on. */
export function startOfLocalDay(at: number): number {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * What an entry shows: its title, or its first line when it has no title, and the
 * rest of its text on one line.
 */
export function entryText({ title, body }: Pick<JournalEntry, 'title' | 'body'>): {
  heading: string;
  preview: string;
} {
  const lines = body
    .slice(0, PREVIEW_SOURCE_LENGTH)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const heading = title.trim();
  if (heading) return { heading, preview: lines.join(' ') };
  return { heading: lines[0] ?? 'Untitled', preview: lines.slice(1).join(' ') };
}

/**
 * The entries whose title or text contains every word of `query`, ignoring case,
 * in their original order. A blank query keeps every entry.
 */
export function filterEntries(entries: readonly JournalEntry[], query: string): JournalEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...entries];
  return entries.filter((entry) => {
    const text = `${entry.title}\n${entry.body}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
