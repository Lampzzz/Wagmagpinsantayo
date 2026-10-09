import type { Reminder } from '../types';
import {
  describeReminderTime,
  groupReminders,
  isReminderPastDue,
  reminderNextAt,
} from './group-reminders';

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
    repeat: null,
    alarm: false,
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

describe('daily reminders', () => {
  // Saved a week ago for 8:00 AM, so today's 8:00 AM has already rung.
  const morning = reminder(10, { repeat: 'daily', scheduledAt: at(2026, 10, 1, 8) });
  // 6:00 PM, still to come today.
  const evening = reminder(11, { repeat: 'daily', scheduledAt: at(2026, 10, 1, 18) });

  it('are never past due', () => {
    expect(isReminderPastDue(morning, NOW)).toBe(false);
    expect(isReminderPastDue(reminder(12, { repeat: 'daily', scheduledAt: NOW }), NOW)).toBe(false);
  });

  it('ring next at their time of day, today or tomorrow', () => {
    expect(reminderNextAt(evening, NOW)).toBe(at(2026, 10, 8, 18));
    expect(reminderNextAt(morning, NOW)).toBe(at(2026, 10, 9, 8));
    expect(reminderNextAt(reminder(13, { scheduledAt: at(2026, 10, 1, 8) }), NOW)).toBe(
      at(2026, 10, 1, 8),
    );
  });

  it('sit under Upcoming at their next time, among one-off reminders', () => {
    const reminders = [
      morning,
      reminder(1, { scheduledAt: at(2026, 10, 9, 9) }),
      evening,
      reminder(2, { scheduledAt: at(2026, 10, 8, 20) }),
      reminder(3, { scheduledAt: at(2026, 10, 8, 9) }),
      reminder(14, { repeat: 'daily', status: 'cancelled', scheduledAt: at(2026, 10, 1, 7) }),
    ];
    const groups = groupReminders(reminders, NOW).map(({ group, reminders: members }) => [
      group,
      members.map((member) => member.id),
    ]);
    expect(groups).toEqual([
      ['past-due', [3]],
      ['upcoming', [11, 2, 10, 1]],
      ['finished', [14]],
    ]);
  });

  it('read "Every day at" their time; one-off reminders read their day and time', () => {
    expect(describeReminderTime(morning, NOW)).toBe('Every day at 8:00 AM');
    expect(describeReminderTime(evening, NOW)).toBe('Every day at 6:00 PM');
    expect(describeReminderTime(reminder(1, { scheduledAt: at(2026, 10, 9, 9) }), NOW)).toBe(
      'Tomorrow at 9:00 AM',
    );
  });
});
