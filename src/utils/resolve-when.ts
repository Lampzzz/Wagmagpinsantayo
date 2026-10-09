import type { DayPart, DayRef, WhenParts } from './parse-when';

/** A date without a time means "all day" for a task and 9:00 AM for a reminder. */
export type WhenPurpose = 'task' | 'reminder';

export type ResolvedWhen =
  /** `at` is epoch milliseconds. `hasTime` is false for an all-day task deadline. */
  | { kind: 'ok'; at: number; hasTime: boolean }
  /** Already past. `suggestion` is the same time tomorrow when no day was named. */
  | { kind: 'passed'; suggestion: number | null }
  /** A reminder for today without a time, after 9:00 AM has passed. */
  | { kind: 'needs-time' }
  /** A day that can't be a deadline ("this week") or doesn't exist (Feb 29, 2027). */
  | { kind: 'invalid' };

type ResolveWhenOptions = {
  now: number;
  purpose: WhenPurpose;
  /**
   * The item's current time when editing it. A time-only phrase keeps the item's day
   * ("move it to 3 PM") and a date-only phrase keeps its time ("move it to Friday").
   */
  base?: { at: number; hasTime: boolean } | null;
};

const PART_HOURS: Record<DayPart, number> = { morning: 9, afternoon: 14, evening: 18, night: 20 };
const REMINDER_DEFAULT_HOUR = 9;
// A bare hour ("at 3") lands inside this window, so it never means 3 AM.
const DAYTIME_FIRST_HOUR = 6;
const DAYTIME_LAST_HOUR = 23;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Turns parsed time words into a time in the phone's time zone. */
export function resolveWhen(
  parts: WhenParts,
  { now, purpose, base = null }: ResolveWhenOptions,
): ResolvedWhen {
  if (parts.kind === 'offset') {
    return { kind: 'ok', at: now + parts.minutes * 60_000, hasTime: true };
  }

  const today = startOfDay(now);
  let day: Date;
  let dayImplied = false;
  if (parts.day) {
    const named = dayFor(parts.day, today);
    if (!named) return { kind: 'invalid' };
    day = named;
  } else if (base && parts.time) {
    // Keep the item's day, unless that day is already over.
    const baseDay = startOfDay(base.at);
    day = baseDay > today ? baseDay : today;
    dayImplied = day.getTime() === today.getTime();
  } else {
    day = today;
    dayImplied = true;
  }

  const { time } = parts;
  if (!time) {
    if (base?.hasTime) {
      const at = atTime(day, new Date(base.at).getHours(), new Date(base.at).getMinutes());
      return at > now ? { kind: 'ok', at, hasTime: true } : { kind: 'passed', suggestion: null };
    }
    if (purpose === 'task') return { kind: 'ok', at: endOfDay(day), hasTime: false };
    const at = atTime(day, REMINDER_DEFAULT_HOUR, 0);
    return at > now ? { kind: 'ok', at, hasTime: true } : { kind: 'needs-time' };
  }

  let hour: number;
  let minute = 0;
  switch (time.kind) {
    case 'clock':
      hour = time.hour;
      minute = time.minute;
      break;
    case 'part':
      hour = PART_HOURS[time.part];
      break;
    case 'bare':
      if (dayImplied) return nextDaytime(day, time.hour, time.minute, now);
      // On a named day, 7–11 is morning and 12–6 is afternoon or evening.
      hour = time.hour >= 7 && time.hour <= 11 ? time.hour : (time.hour % 12) + 12;
      minute = time.minute;
      break;
  }

  // Hour 24 (midnight) rolls over to 00:00 the next day.
  const at = atTime(day, hour, minute);
  if (at > now) return { kind: 'ok', at, hasTime: true };
  return { kind: 'passed', suggestion: dayImplied ? atTime(addDays(day, 1), hour, minute) : null };
}

/** The days a list filter covers ("today", "friday", "this week"), or null for anything else. */
export function dayWindow(parts: WhenParts, now: number): { start: number; end: number } | null {
  if (parts.kind !== 'moment' || !parts.day) return null;
  if (parts.time && parts.time.kind !== 'part') return null;
  const today = startOfDay(now);
  if (parts.day.kind === 'this-week' || parts.day.kind === 'next-week') {
    const nextMonday = addDays(today, daysToNextMonday(today));
    return parts.day.kind === 'this-week'
      ? { start: today.getTime(), end: nextMonday.getTime() }
      : { start: nextMonday.getTime(), end: addDays(nextMonday, 7).getTime() };
  }
  const day = dayFor(parts.day, today);
  if (!day) return null;
  return { start: day.getTime(), end: addDays(day, 1).getTime() };
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function calendarDaysBetween(from: number, to: number): number {
  // Rounding absorbs the 23- and 25-hour days around daylight-saving changes.
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

// The next time this hour comes round in the daytime, or tomorrow's first if both have passed.
function nextDaytime(today: Date, hour: number, minute: number, now: number): ResolvedWhen {
  const hours = [hour % 12, (hour % 12) + 12].filter(
    (candidate) => candidate >= DAYTIME_FIRST_HOUR && candidate <= DAYTIME_LAST_HOUR,
  );
  for (const candidate of hours) {
    const at = atTime(today, candidate, minute);
    if (at > now) return { kind: 'ok', at, hasTime: true };
  }
  return { kind: 'passed', suggestion: atTime(addDays(today, 1), hours[0], minute) };
}

function dayFor(day: DayRef, today: Date): Date | null {
  switch (day.kind) {
    case 'in-days':
      return addDays(today, day.days);
    case 'weekday':
      if (!day.next) return addDays(today, (day.weekday - today.getDay() + 7) % 7);
      // "next Friday" is the Friday of next week, with weeks starting on Monday.
      return addDays(today, daysToNextMonday(today) + ((day.weekday + 6) % 7));
    case 'date': {
      const year = day.year ?? today.getFullYear();
      let date = new Date(year, day.month, day.day);
      if (day.year === undefined && date < today) date = new Date(year + 1, day.month, day.day);
      // Feb 29 in a year without one would roll into March.
      return date.getMonth() === day.month ? date : null;
    }
    case 'next-week':
      return addDays(today, 7);
    case 'this-week':
      return null;
  }
}

function daysToNextMonday(today: Date): number {
  return (8 - today.getDay()) % 7 || 7;
}

function startOfDay(ms: number): Date {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Calendar arithmetic, so a day stays a day across daylight-saving changes.
function addDays(day: Date, days: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
}

function atTime(day: Date, hour: number, minute: number): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
}

function endOfDay(day: Date): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
}
