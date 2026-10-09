import type { Reminder, ReminderGroup } from '../types';

const GROUP_ORDER: readonly ReminderGroup[] = ['past-due', 'upcoming', 'finished'];

export const REMINDER_GROUP_TITLES: Record<ReminderGroup, string> = {
  'past-due': 'Past due',
  upcoming: 'Upcoming',
  finished: 'Finished',
};

/** A scheduled reminder whose time has come is past due until it's marked done or dismissed. */
export function isReminderPastDue(reminder: Reminder, now: number): boolean {
  return reminder.status === 'scheduled' && reminder.scheduledAt <= now;
}

export function reminderGroup(reminder: Reminder, now: number): ReminderGroup {
  if (reminder.status !== 'scheduled') return 'finished';
  return reminder.scheduledAt <= now ? 'past-due' : 'upcoming';
}

/**
 * Sorts reminders into Past due, Upcoming and Finished, leaving out empty groups.
 * Scheduled reminders come soonest first; finished ones most recently changed first.
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
        : members.sort((a, b) => a.scheduledAt - b.scheduledAt || a.id - b.id);
    return [{ group, reminders: sorted }];
  });
}
