import type { Reminder } from '../types';
import { groupReminders, isReminderPastDue } from './group-reminders';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// Thursday, Oct 8, 2026, 2:30 PM.
const NOW = at(2026, 10, 8, 14, 30);

function reminder(id: number, changes: Partial<Reminder> = {}): Reminder {
  return {
    id,
    title: `Reminder ${id}`,
    scheduledAt: at(2026, 10, 9, 9),
    status: 'scheduled',
    notificationId: `reminder-${id}`,
    taskId: null,
    taskTitle: null,
    createdAt: at(2026, 10, 1),
    updatedAt: at(2026, 10, 1),
    ...changes,
  };
}

describe('isReminderPastDue', () => {
  it('is true for a scheduled reminder whose time has come', () => {
    expect(isReminderPastDue(reminder(1, { scheduledAt: NOW }), NOW)).toBe(true);
    expect(isReminderPastDue(reminder(2, { scheduledAt: NOW + 60_000 }), NOW)).toBe(false);
  });

  it('is false once the reminder is done, dismissed or cancelled', () => {
    for (const status of ['completed', 'dismissed', 'cancelled'] as const) {
      expect(isReminderPastDue(reminder(1, { status, scheduledAt: at(2026, 10, 1) }), NOW)).toBe(
        false,
      );
    }
  });
});

describe('groupReminders', () => {
  it('orders past-due and upcoming reminders soonest first, finished ones latest first', () => {
    const reminders = [
      reminder(1, { scheduledAt: at(2026, 10, 10, 9) }),
      reminder(2, { scheduledAt: at(2026, 10, 8, 9) }),
      reminder(3, { status: 'completed', updatedAt: at(2026, 10, 2) }),
      reminder(4, { scheduledAt: at(2026, 10, 9, 9) }),
      reminder(5, { scheduledAt: at(2026, 10, 7, 9) }),
      reminder(6, { status: 'cancelled', updatedAt: at(2026, 10, 5) }),
    ];
    const groups = groupReminders(reminders, NOW).map(({ group, reminders: members }) => [
      group,
      members.map((member) => member.id),
    ]);
    expect(groups).toEqual([
      ['past-due', [5, 2]],
      ['upcoming', [4, 1]],
      ['finished', [6, 3]],
    ]);
  });
});
