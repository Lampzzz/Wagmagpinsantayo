import { capitalize } from '@/utils/capitalize';
import { formatTime, formatWhen } from '@/utils/format-when';

import type { Reminder, ReminderGroup } from '../types';
import { nextDailyOccurrence } from './repeat-rules';

const GROUP_ORDER: readonly ReminderGroup[] = ['past-due', 'upcoming', 'finished'];

export const REMINDER_GROUP_TITLES: Record<ReminderGroup, string> = {
  'past-due': 'Past due',
  upcoming: 'Upcoming',
  finished: 'Finished',
};

/**
 * A scheduled reminder whose time has come is past due until it's marked done or
 * dismissed. A daily reminder never is: once today's time passes, it's due tomorrow.
 */
export function isReminderPastDue(reminder: Reminder, now: number): boolean {
  return (
    reminder.status === 'scheduled' && reminder.repeat !== 'daily' && reminder.scheduledAt <= now
  );
}

/** When a reminder rings next. A daily reminder's time moves on a day once it passes. */
export function reminderNextAt(
  reminder: Pick<Reminder, 'scheduledAt' | 'repeat'>,
  now: number,
): number {
  return reminder.repeat === 'daily'
    ? nextDailyOccurrence(reminder.scheduledAt, now)
    : reminder.scheduledAt;
}

/** "Every day at 8:00 AM" for a daily reminder, otherwise its time, as "Tomorrow at 9:00 AM". */
export function describeReminderTime(
  reminder: Pick<Reminder, 'scheduledAt' | 'repeat'>,
  now: number,
): string {
  if (reminder.repeat === 'daily') return `Every day at ${formatTime(reminder.scheduledAt)}`;
  return capitalize(formatWhen(reminder.scheduledAt, true, now));
}

export function reminderGroup(reminder: Reminder, now: number): ReminderGroup {
  if (reminder.status !== 'scheduled') return 'finished';
  return isReminderPastDue(reminder, now) ? 'past-due' : 'upcoming';
}

/**
 * Sorts reminders into Past due, Upcoming and Finished, leaving out empty groups.
 * Scheduled reminders come soonest first, a daily one at the next time it rings;
 * finished ones come most recently changed first.
 */
export function groupReminders(
  reminders: readonly Reminder[],
  now: number,
): { group: ReminderGroup; reminders: Reminder[] }[] {
  const byGroup = new Map<ReminderGroup, Reminder[]>();
  for (const reminder of reminders) {
    const group = reminderGroup(reminder, now);
    const members = byGroup.get(group);
    if (members) members.push(reminder);
    else byGroup.set(group, [reminder]);
  }
  return GROUP_ORDER.flatMap((group) => {
    const members = byGroup.get(group);
    if (!members) return [];
    const sorted =
      group === 'finished'
        ? members.sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id)
        : members.sort((a, b) => reminderNextAt(a, now) - reminderNextAt(b, now) || a.id - b.id);
    return [{ group, reminders: sorted }];
  });
}
