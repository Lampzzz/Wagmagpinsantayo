import type { NotificationData } from '@/lib/notifications';

import type { Reminder } from '../types';

/**
 * The alert a reminder needs: one notification at `at`, or the phone's daily
 * notification, which rings every day at the time of day of `at`, starting at `at`.
 */
export type AlertPlan = { kind: 'once'; at: number } | { kind: 'daily'; at: number };

/**
 * When a daily reminder rings next: at the hour and minute of `anchor`, on the
 * first day that isn't before `anchor` and whose time is still to come after
 * `now`. Seconds are dropped, as the phone's daily alert rings on the minute.
 */
export function nextDailyOccurrence(anchor: number, now: number): number {
  const { hour, minute } = timeOfDay(anchor);
  const from = new Date(Math.max(anchor, now));
  const sameDay = atTime(from, hour, minute);
  return sameDay > now ? sameDay : atTime(from, hour, minute, 1);
}

/**
 * Where a daily reminder moves when it's marked done or dismissed: today's time
 * is skipped if it's still to come, and the repeat carries on from the next day.
 */
export function skipTodaysOccurrence(anchor: number, now: number): number {
  const next = nextDailyOccurrence(anchor, now);
  if (!isSameLocalDay(next, now)) return next;
  const { hour, minute } = timeOfDay(next);
  return atTime(new Date(next), hour, minute, 1);
}

/**
 * The alert a reminder needs now, or null when it needs none. The phone's daily
 * alert always starts at the next time its hour and minute come round. When the
 * reminder's next time is later than that (today's was skipped, or it starts on a
 * later day), a one-off alert covers the next time instead, and the next sync,
 * once the times line up, swaps it for the daily alert.
 */
export function planAlert(
  reminder: Pick<Reminder, 'status' | 'scheduledAt' | 'repeat'>,
  now: number,
): AlertPlan | null {
  if (reminder.status !== 'scheduled') return null;
  if (reminder.repeat !== 'daily') {
    return reminder.scheduledAt > now ? { kind: 'once', at: reminder.scheduledAt } : null;
  }
  const at = nextDailyOccurrence(reminder.scheduledAt, now);
  return at === firstDailyRing(at, now) ? { kind: 'daily', at } : { kind: 'once', at };
}

// When the phone's daily alert for the time of day of `at` would first ring, if set at `now`.
function firstDailyRing(at: number, now: number): number {
  const { hour, minute } = timeOfDay(at);
  const today = new Date(now);
  const sameDay = atTime(today, hour, minute);
  return sameDay > now ? sameDay : atTime(today, hour, minute, 1);
}

/**
 * The data a reminder's notification carries, which `isAlertCurrent` reads back.
 * An alarm's data says so; a plain reminder's data has no `alarm` key.
 */
export function alertData(reminderId: number, plan: AlertPlan, alarm = false): NotificationData {
  const data: NotificationData =
    plan.kind === 'daily'
      ? { reminderId, scheduledAt: plan.at, repeat: 'daily' }
      : { reminderId, scheduledAt: plan.at };
  return alarm ? { ...data, alarm: true } : data;
}

/**
 * Whether a pending notification, read back through its data, already does what
 * `plan` needs, as an alarm or a plain notification. A daily alert matches on its
 * time of day only, so it isn't rescheduled every day.
 */
export function isAlertCurrent(plan: AlertPlan, data: NotificationData, alarm = false): boolean {
  const { scheduledAt, repeat } = data;
  if (typeof scheduledAt !== 'number') return false;
  if ((data.alarm === true) !== alarm) return false;
  if (plan.kind === 'once') return repeat !== 'daily' && scheduledAt === plan.at;
  return repeat === 'daily' && isSameTimeOfDay(scheduledAt, plan.at);
}

function timeOfDay(at: number): { hour: number; minute: number } {
  const date = new Date(at);
  return { hour: date.getHours(), minute: date.getMinutes() };
}

// `day`'s date, `addDays` later, at hour:minute local time.
function atTime(day: Date, hour: number, minute: number, addDays = 0): number {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() + addDays,
    hour,
    minute,
  ).getTime();
}

function isSameLocalDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameTimeOfDay(a: number, b: number): boolean {
  const first = timeOfDay(a);
  const second = timeOfDay(b);
  return first.hour === second.hour && first.minute === second.minute;
}
