import { capitalize } from '@/utils/capitalize';
import { formatDay } from '@/utils/format-when';

import type { HistoryDay, HistoryMessage } from './types';

/**
 * Groups saved lines by the local calendar day they were said: newest day first, and
 * oldest first within a day, so each day reads like the conversation it was. Days
 * without lines are left out.
 */
export function groupByDay(messages: readonly HistoryMessage[], now: number): HistoryDay[] {
  // Equal times keep the order the lines were saved in: a question before its answer.
  const oldestFirst = [...messages].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  const days: HistoryDay[] = [];
  for (const message of oldestFirst) {
    const key = dayKey(message.createdAt);
    const current = days[days.length - 1];
    if (current?.key === key) {
      current.messages.push(message);
    } else {
      days.push({ key, title: historyDayTitle(message.createdAt, now), messages: [message] });
    }
  }
  return days.reverse();
}

/** "Today", "Yesterday", "Thu, Oct 8", or "Wed, Dec 31, 2025" when it isn't this year. */
export function historyDayTitle(at: number, now: number): string {
  return capitalize(formatDay(at, now));
}

/** The local calendar date of a time, such as "2026-10-08". */
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
