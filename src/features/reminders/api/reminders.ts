import { notifyTableChanged, subscribeToTable } from '@/lib/db/table-changes';
import {
  cancelNotification,
  ensureNotificationPermission,
  getNotificationPermission,
  getScheduledNotifications,
  scheduleNotification,
} from '@/lib/notifications';
import { formatTime } from '@/utils/format-when';

import type {
  AlertOutcome,
  NewReminder,
  Reminder,
  ReminderChanges,
  ReminderStatus,
  SavedReminder,
} from '../types';
import {
  deleteReminderRow,
  insertReminder,
  selectReminder,
  selectReminders,
  selectTaskTitle,
  updateReminderRow,
} from './reminder-rows';

const MAX_TITLE_LENGTH = 200;
// iOS keeps only the soonest 64 pending notifications. Leave some room.
const MAX_PENDING_ALERTS = 60;
const ALERT_ID = /^reminder-(\d+)$/;

/** Calls `listener` after any reminder changes. Returns an unsubscribe function. */
export function subscribeToReminders(listener: () => void): () => void {
  return subscribeToTable('reminders', listener);
}

/** Every reminder, with the title of the task it's for. */
export function listReminders(): Promise<Reminder[]> {
  return selectReminders();
}

export function getReminder(id: number): Promise<Reminder | null> {
  return selectReminder(id);
}

/** The title of the task a new reminder would be linked to, or null when there's no such task. */
export function getTaskTitle(id: number): Promise<string | null> {
  return selectTaskTitle(id);
}

/**
 * Saves a reminder, then schedules its alert, asking for notification permission
 * the first time. The reminder is kept even when the alert can't be scheduled;
 * `alert` says what happened, so nobody is told it will ring when it won't.
 */
export async function createReminder(input: NewReminder): Promise<SavedReminder> {
  const title = checkTitle(input.title);
  checkTime(input.scheduledAt);
  const taskId =
    input.taskId !== undefined && input.taskId !== null && (await selectTaskTitle(input.taskId))
      ? input.taskId
      : null;
  const repeat = input.repeat === 'daily' ? 'daily' : null;
  const id = await insertReminder({ title, scheduledAt: input.scheduledAt, repeat, taskId });
  notifyTableChanged('reminders');
  const alert = await armAlert(id, title, input.scheduledAt, { ask: true });
  return { reminder: await requireReminder(id), alert };
}

/**
 * Saves a new title or time and reschedules the alert. A new future time brings
 * back a reminder that was done, dismissed or cancelled.
 */
export async function updateReminder(id: number, changes: ReminderChanges): Promise<SavedReminder> {
  const current = await requireReminder(id);
  const title = changes.title === undefined ? current.title : checkTitle(changes.title);
  const scheduledAt = changes.scheduledAt ?? current.scheduledAt;
  checkTime(scheduledAt);
  const reactivate =
    changes.scheduledAt !== undefined && current.status !== 'scheduled' && scheduledAt > Date.now();

  const repeat = changes.repeat === undefined ? current.repeat : changes.repeat;
  await updateReminderRow(
    id,
    reactivate
      ? { title, scheduledAt, repeat, status: 'scheduled' }
      : { title, scheduledAt, repeat },
  );
  notifyTableChanged('reminders');

  const status: ReminderStatus = reactivate ? 'scheduled' : current.status;
  let alert: AlertOutcome = 'none';
  if (status === 'scheduled' && scheduledAt > Date.now()) {
    alert = await armAlert(id, title, scheduledAt, { ask: true });
  } else {
    await disarmAlert(id);
  }
  return { reminder: await requireReminder(id), alert };
}

/**
 * Marks a reminder done, dismissed or cancelled, and cancels its alert.
 * `alertCleared` is false when the pending alert couldn't be cancelled.
 */
export async function setReminderStatus(
  id: number,
  status: Exclude<ReminderStatus, 'scheduled'>,
): Promise<{ reminder: Reminder; alertCleared: boolean }> {
  const saved = await updateReminderRow(id, { status, notificationId: null });
  if (!saved) throw new Error('That reminder no longer exists.');
  notifyTableChanged('reminders');
  const alertCleared = await disarmAlert(id);
  return { reminder: await requireReminder(id), alertCleared };
}

export async function deleteReminder(id: number): Promise<{ alertCleared: boolean }> {
  const deleted = await deleteReminderRow(id);
  if (!deleted) throw new Error('That reminder no longer exists.');
  notifyTableChanged('reminders');
  return { alertCleared: await disarmAlert(id) };
}

/**
 * Brings the phone's scheduled alerts in line with the saved reminders: schedules
 * the soonest upcoming ones that are missing or out of date, and cancels the rest.
 * The two can drift apart because they can't share a transaction. Never asks for permission.
 */
export async function syncReminderAlerts(): Promise<void> {
  if ((await getNotificationPermission()) !== 'granted') return;
  const now = Date.now();
  const upcoming = (await selectReminders())
    .filter((reminder) => reminder.status === 'scheduled' && reminder.scheduledAt > now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
    .slice(0, MAX_PENDING_ALERTS);
  const wanted = new Map(upcoming.map((reminder) => [reminder.id, reminder]));

  const pending = new Set<number>();
  for (const { identifier, data } of await getScheduledNotifications()) {
    const match = ALERT_ID.exec(identifier);
    if (!match) continue;
    const reminder = wanted.get(Number(match[1]));
    if (reminder && data.scheduledAt === reminder.scheduledAt) {
      pending.add(reminder.id);
    } else {
      await cancelNotification(identifier).catch(() => undefined);
    }
  }

  let changed = false;
  for (const reminder of upcoming) {
    if (pending.has(reminder.id)) {
      if (reminder.notificationId === null) {
        await updateReminderRow(
          reminder.id,
          { notificationId: alertId(reminder.id) },
          { touch: false },
        );
        changed = true;
      }
      continue;
    }
    const alert = await armAlert(reminder.id, reminder.title, reminder.scheduledAt, { ask: false });
    if (alert === 'scheduled' || reminder.notificationId !== null) changed = true;
  }
  if (changed) notifyTableChanged('reminders');
}

/** The id of the reminder a tapped notification belongs to, if it is one of ours. */
export function reminderIdFromNotification(data: Record<string, unknown>): number | null {
  const { reminderId } = data;
  return typeof reminderId === 'number' && Number.isInteger(reminderId) && reminderId > 0
    ? reminderId
    : null;
}

async function armAlert(
  id: number,
  title: string,
  at: number,
  { ask }: { ask: boolean },
): Promise<AlertOutcome> {
  if (at <= Date.now()) {
    await disarmAlert(id);
    return 'none';
  }
  try {
    const permission = ask
      ? await ensureNotificationPermission()
      : await getNotificationPermission();
    if (permission !== 'granted') {
      await updateReminderRow(id, { notificationId: null }, { touch: false });
      return 'no-permission';
    }
    const notificationId = await scheduleNotification({
      identifier: alertId(id),
      title,
      body: `Reminder · ${formatTime(at)}`,
      at,
      data: { reminderId: id, scheduledAt: at },
    });
    await updateReminderRow(id, { notificationId }, { touch: false });
    return 'scheduled';
  } catch {
    await updateReminderRow(id, { notificationId: null }, { touch: false }).catch(() => undefined);
    return 'failed';
  }
}

async function disarmAlert(id: number): Promise<boolean> {
  try {
    await cancelNotification(alertId(id));
    return true;
  } catch {
    return false;
  }
}

function alertId(reminderId: number): string {
  return `reminder-${reminderId}`;
}

async function requireReminder(id: number): Promise<Reminder> {
  const reminder = await selectReminder(id);
  if (!reminder) throw new Error('That reminder no longer exists.');
  return reminder;
}

function checkTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('A reminder needs a title.');
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

function checkTime(scheduledAt: number) {
  if (!Number.isFinite(scheduledAt)) throw new Error('A reminder needs a time.');
}
