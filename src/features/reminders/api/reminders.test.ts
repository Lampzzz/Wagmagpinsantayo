import type { Reminder } from '../types';
import { groupReminders } from './group-reminders';
import {
  createReminder,
  deleteReminder,
  getReminder,
  listReminders,
  setReminderStatus,
  snoozeReminder,
  syncReminderAlerts,
  updateReminder,
} from './reminders';

// In-memory stand-ins for the saved rows and the phone's pending notifications. Jest
// lets mock factories use only names that start with "mock".
type MockReminder = Reminder;
type MockRow = Omit<Reminder, 'taskTitle'>;
type MockRepeatRules = typeof import('./repeat-rules');
type MockAlert = {
  identifier: string;
  title: string;
  body: string;
  at: number;
  repeat?: 'daily';
  alarm?: boolean;
  data: Record<string, unknown>;
};

const mockRows = new Map<number, MockRow>();
const mockAlerts = new Map<string, MockAlert>();
// Notifications taken off the screen, in order.
const mockDismissed: string[] = [];
const mockState = { now: 0, nextId: 1, permission: 'granted', scheduled: 0 };

jest.mock('./reminder-rows', () => {
  const rules: MockRepeatRules = jest.requireActual('./repeat-rules');
  // Like the real rows: a daily reminder reads as the next time it rings.
  const read = (row: MockRow): MockReminder => ({
    ...row,
    taskTitle: null,
    scheduledAt:
      row.repeat === 'daily'
        ? rules.nextDailyOccurrence(row.scheduledAt, mockState.now)
        : row.scheduledAt,
  });
  return {
    selectReminders: async () => [...mockRows.values()].map(read),
    selectReminder: async (id: number) => {
      const row = mockRows.get(id);
      return row ? read(row) : null;
    },
    insertReminder: async (
      input: Pick<MockRow, 'title' | 'scheduledAt' | 'repeat' | 'alarm' | 'taskId'>,
    ) => {
      const id = mockState.nextId++;
      mockRows.set(id, {
        id,
        ...input,
        status: 'scheduled',
        notificationId: null,
        createdAt: mockState.now,
        updatedAt: mockState.now,
      });
      return id;
    },
    updateReminderRow: async (
      id: number,
      fields: Partial<MockRow>,
      { touch = true }: { touch?: boolean } = {},
    ) => {
      const row = mockRows.get(id);
      if (!row) return false;
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) Object.assign(row, { [key]: value });
      }
      if (touch) row.updatedAt = mockState.now;
      return true;
    },
    deleteReminderRow: async (id: number) => mockRows.delete(id),
    selectTaskTitle: async () => null,
  };
});

jest.mock('@/lib/notifications', () => ({
  cancelNotification: async (identifier: string) => {
    mockAlerts.delete(identifier);
  },
  dismissNotification: async (identifier: string) => {
    mockDismissed.push(identifier);
  },
  ensureNotificationPermission: async () => mockState.permission,
  getNotificationPermission: async () => mockState.permission,
  getScheduledNotifications: async () =>
    [...mockAlerts.values()].map(({ identifier, data }) => ({ identifier, data })),
  scheduleNotification: async (input: MockAlert) => {
    mockState.scheduled += 1;
    mockAlerts.set(input.identifier, input);
    return input.identifier;
  },
}));

jest.mock('@/lib/db/table-changes', () => ({
  notifyTableChanged: () => undefined,
  subscribeToTable: () => () => undefined,
}));

// Local-time dates, so the tests pass in any time zone.
function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// Saturday, Oct 10, 2026, 2:30 PM.
const NOW = at(2026, 10, 10, 14, 30);

function setNow(now: number) {
  mockState.now = now;
}

function alertFor(id: number) {
  return mockAlerts.get(`reminder-${id}`);
}

beforeEach(() => {
  mockRows.clear();
  mockAlerts.clear();
  mockDismissed.length = 0;
  Object.assign(mockState, { now: NOW, nextId: 1, permission: 'granted', scheduled: 0 });
  jest.spyOn(Date, 'now').mockImplementation(() => mockState.now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('one-off reminders', () => {
  it('alert once at their time, and finishing one clears its alert', async () => {
    const { reminder, alert } = await createReminder({
      title: 'Call Lola',
      scheduledAt: at(2026, 10, 10, 20),
    });
    expect(alert).toBe('scheduled');
    expect(reminder).toMatchObject({ repeat: null, status: 'scheduled' });
    expect(alertFor(reminder.id)).toMatchObject({
      at: at(2026, 10, 10, 20),
      body: 'Reminder · 8:00 PM',
      data: { reminderId: reminder.id, scheduledAt: at(2026, 10, 10, 20) },
    });
    expect(alertFor(reminder.id)?.repeat).toBeUndefined();

    const done = await setReminderStatus(reminder.id, 'completed');
    expect(done.reminder.status).toBe('completed');
    expect(alertFor(reminder.id)).toBeUndefined();
  });
});

describe('every-day reminders', () => {
  async function createDaily(hour: number, minute = 0) {
    const { reminder, alert } = await createReminder({
      title: 'Take my medicine',
      scheduledAt: at(2026, 10, 10, hour, minute),
      repeat: 'daily',
    });
    expect(alert).toBe('scheduled');
    return reminder;
  }

  it("use the phone's daily alert at their time of day", async () => {
    const reminder = await createDaily(20);
    expect(reminder).toMatchObject({ repeat: 'daily', scheduledAt: at(2026, 10, 10, 20) });
    expect(alertFor(reminder.id)).toMatchObject({
      repeat: 'daily',
      at: at(2026, 10, 10, 20),
      body: 'Every day · 8:00 PM',
      data: { reminderId: reminder.id, repeat: 'daily' },
    });
  });

  it('start tomorrow when the time has already passed today', async () => {
    const reminder = await createDaily(8);
    expect(reminder.scheduledAt).toBe(at(2026, 10, 11, 8));
    expect(alertFor(reminder.id)).toMatchObject({ repeat: 'daily', at: at(2026, 10, 11, 8) });
  });

  it('stay scheduled after they ring, and come up next tomorrow', async () => {
    const reminder = await createDaily(20);
    setNow(at(2026, 10, 10, 20, 5));
    expect(await getReminder(reminder.id)).toMatchObject({
      status: 'scheduled',
      scheduledAt: at(2026, 10, 11, 20),
    });
    const groups = groupReminders(await listReminders(), mockState.now);
    expect(groups.map(({ group }) => group)).toEqual(['upcoming']);
  });

  it("skip only today when marked done before today's time, then go back to daily", async () => {
    const reminder = await createDaily(20);
    const done = await setReminderStatus(reminder.id, 'completed');
    expect(done.alertCleared).toBe(true);
    expect(done.reminder).toMatchObject({
      status: 'scheduled',
      repeat: 'daily',
      scheduledAt: at(2026, 10, 11, 20),
    });
    // Today's 8 PM is skipped: a one-off alert covers tomorrow.
    expect(alertFor(reminder.id)).toMatchObject({ at: at(2026, 10, 11, 20) });
    expect(alertFor(reminder.id)?.repeat).toBeUndefined();

    // Once today's time has passed, the next sync brings back the daily alert.
    setNow(at(2026, 10, 10, 21));
    await syncReminderAlerts();
    expect(alertFor(reminder.id)).toMatchObject({ repeat: 'daily', at: at(2026, 10, 11, 20) });
  });

  it("leave the daily alert alone when dismissed after today's time", async () => {
    const reminder = await createDaily(8);
    setNow(at(2026, 10, 11, 9));
    const dismissed = await setReminderStatus(reminder.id, 'dismissed');
    expect(dismissed.reminder).toMatchObject({
      status: 'scheduled',
      scheduledAt: at(2026, 10, 12, 8),
    });
    expect(alertFor(reminder.id)).toMatchObject({ repeat: 'daily', at: at(2026, 10, 12, 8) });
  });

  it('stop for good when cancelled or deleted', async () => {
    const first = await createDaily(20);
    const second = await createDaily(21);

    const cancelled = await setReminderStatus(first.id, 'cancelled');
    expect(cancelled.reminder.status).toBe('cancelled');
    expect(alertFor(first.id)).toBeUndefined();

    await deleteReminder(second.id);
    expect(alertFor(second.id)).toBeUndefined();

    await syncReminderAlerts();
    expect(mockAlerts.size).toBe(0);
  });

  it('are re-created by the sync when their alert is missing, and kept when current', async () => {
    const reminder = await createDaily(20);
    mockAlerts.clear();
    await syncReminderAlerts();
    expect(alertFor(reminder.id)).toMatchObject({ repeat: 'daily', at: at(2026, 10, 10, 20) });

    // A day later the same daily alert still fits, so nothing is rescheduled.
    const scheduled = mockState.scheduled;
    setNow(at(2026, 10, 11, 10));
    await syncReminderAlerts();
    expect(mockState.scheduled).toBe(scheduled);
  });

  it('come back when the repeat is turned on, and ring once when it is turned off', async () => {
    const { reminder } = await createReminder({
      title: 'Water the plants',
      scheduledAt: at(2026, 10, 10, 20),
    });
    await setReminderStatus(reminder.id, 'cancelled');

    const repeating = await updateReminder(reminder.id, { repeat: 'daily' });
    expect(repeating.alert).toBe('scheduled');
    expect(repeating.reminder).toMatchObject({ status: 'scheduled', repeat: 'daily' });
    expect(alertFor(reminder.id)).toMatchObject({ repeat: 'daily', at: at(2026, 10, 10, 20) });

    const once = await updateReminder(reminder.id, { repeat: null });
    expect(once.reminder.repeat).toBeNull();
    expect(alertFor(reminder.id)).toMatchObject({ at: at(2026, 10, 10, 20) });
    expect(alertFor(reminder.id)?.repeat).toBeUndefined();
  });

  it('are saved without an alert when notifications are off', async () => {
    mockState.permission = 'denied';
    const { reminder, alert } = await createReminder({
      title: 'Stretch',
      scheduledAt: at(2026, 10, 10, 20),
      repeat: 'daily',
    });
    expect(alert).toBe('no-permission');
    expect(reminder).toMatchObject({ repeat: 'daily', notificationId: null });
    expect(mockAlerts.size).toBe(0);
  });
});

describe('alarm reminders', () => {
  function snoozeFor(id: number) {
    return mockAlerts.get(`reminder-${id}-snooze`);
  }

  async function createAlarm(changes: { repeat?: 'daily' } = {}) {
    const { reminder, alert } = await createReminder({
      title: 'Take my medicine',
      scheduledAt: at(2026, 10, 10, 20),
      alarm: true,
      ...changes,
    });
    expect(alert).toBe('scheduled');
    return reminder;
  }

  it('ring as an alarm, while plain reminders stay plain', async () => {
    const alarm = await createAlarm();
    expect(alarm.alarm).toBe(true);
    expect(alertFor(alarm.id)).toMatchObject({
      alarm: true,
      body: 'Alarm · 8:00 PM',
      data: { reminderId: alarm.id, alarm: true },
    });

    const { reminder: plain } = await createReminder({
      title: 'Call Lola',
      scheduledAt: at(2026, 10, 10, 21),
    });
    expect(plain.alarm).toBe(false);
    expect(alertFor(plain.id)?.alarm).toBe(false);
    expect(alertFor(plain.id)?.data).not.toHaveProperty('alarm');
  });

  it('move between alarm and plain when the switch is flipped', async () => {
    const { reminder } = await createReminder({
      title: 'Call Lola',
      scheduledAt: at(2026, 10, 10, 20),
    });
    const ringing = await updateReminder(reminder.id, { alarm: true });
    expect(ringing.reminder.alarm).toBe(true);
    expect(alertFor(reminder.id)).toMatchObject({ alarm: true, data: { alarm: true } });

    const quiet = await updateReminder(reminder.id, { alarm: false });
    expect(quiet.reminder.alarm).toBe(false);
    expect(alertFor(reminder.id)?.data).not.toHaveProperty('alarm');
  });

  it('are re-armed by the sync when the pending alert is a plain one', async () => {
    const reminder = await createAlarm({ repeat: 'daily' });
    const pending = alertFor(reminder.id)!;
    mockAlerts.set(pending.identifier, {
      ...pending,
      alarm: false,
      data: { reminderId: reminder.id, scheduledAt: pending.at, repeat: 'daily' },
    });
    await syncReminderAlerts();
    expect(alertFor(reminder.id)).toMatchObject({ alarm: true, repeat: 'daily' });
  });

  it('snooze for 10 minutes, taking the ringing alert off the screen', async () => {
    const reminder = await createAlarm();
    setNow(at(2026, 10, 10, 20, 1));
    expect(await snoozeReminder(reminder.id)).toBe('scheduled');
    expect(snoozeFor(reminder.id)).toMatchObject({
      alarm: true,
      at: at(2026, 10, 10, 20, 11),
      body: 'Snoozed · 8:11 PM',
      data: { reminderId: reminder.id, snooze: true, alarm: true },
    });
    expect(mockDismissed).toContain(`reminder-${reminder.id}`);
    // The reminder itself is untouched.
    expect(await getReminder(reminder.id)).toMatchObject({
      status: 'scheduled',
      scheduledAt: at(2026, 10, 10, 20),
    });
  });

  it('stop snoozing when marked done or deleted', async () => {
    const first = await createAlarm();
    const second = await createAlarm({ repeat: 'daily' });
    setNow(at(2026, 10, 10, 20, 1));
    await snoozeReminder(first.id);
    await snoozeReminder(second.id);

    mockDismissed.length = 0;
    await setReminderStatus(first.id, 'completed');
    expect(snoozeFor(first.id)).toBeUndefined();
    expect(mockDismissed).toEqual(
      expect.arrayContaining([`reminder-${first.id}`, `reminder-${first.id}-snooze`]),
    );

    await deleteReminder(second.id);
    expect(snoozeFor(second.id)).toBeUndefined();
  });

  it("can't be snoozed once closed", async () => {
    const reminder = await createAlarm();
    await setReminderStatus(reminder.id, 'cancelled');
    await expect(snoozeReminder(reminder.id)).rejects.toThrow();
    expect(snoozeFor(reminder.id)).toBeUndefined();
  });

  it('keep a snooze through the sync only while the reminder is open', async () => {
    const reminder = await createAlarm();
    setNow(at(2026, 10, 10, 20, 1));
    await snoozeReminder(reminder.id);
    await syncReminderAlerts();
    expect(snoozeFor(reminder.id)).toBeDefined();

    // Closed some other way, without going through setReminderStatus.
    mockRows.get(reminder.id)!.status = 'completed';
    await syncReminderAlerts();
    expect(snoozeFor(reminder.id)).toBeUndefined();
  });
});
