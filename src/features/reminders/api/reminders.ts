import { notifyTableChanged, subscribeToTable } from '@/lib/db/table-changes';
import {
  cancelNotification,
  dismissNotification,
  ensureNotificationPermission,
  getNotificationPermission,
  getScheduledNotifications,
  scheduleNotification,
  type NotificationData,
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
import {
  alertData,
  isAlertCurrent,
  nextDailyOccurrence,
  planAlert,
  skipTodaysOccurrence,
  type AlertPlan,
} from './repeat-rules';

const MAX_TITLE_LENGTH = 200;
// iOS keeps only the soonest 64 pending notifications. Leave some room.
const MAX_PENDING_ALERTS = 60;
const ALERT_ID = /^reminder-(\d+)$/;
const SNOOZE_ID = /^reminder-(\d+)-snooze$/;
/** How long Snooze puts off an alarm. */
export const SNOOZE_MINUTES = 10;

/** What an alert needs to know about its reminder. */
type AlertTarget = Pick<Reminder, 'id' | 'title' | 'repeat' | 'alarm'>;

/** Calls `listener` after any reminder changes. Returns an unsubscribe function. */
export function subscribeToReminders(listener: () => void): () => void {
  return subscribeToTable('reminders', listener);
}

/**
 * Every reminder, with the title of the task it's for. A daily reminder's
 * `scheduledAt` is the next time it rings.
 */
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
 * With `repeat: 'daily'` it rings every day at the time of day of `scheduledAt`,
 * from `scheduledAt` on. With `alarm: true` it rings like an alarm.
 */
export async function createReminder(input: NewReminder): Promise<SavedReminder> {
  const title = checkTitle(input.title);
  checkTime(input.scheduledAt);
  const taskId =
    input.taskId !== undefined && input.taskId !== null && (await selectTaskTitle(input.taskId))
      ? input.taskId
      : null;
  const repeat = input.repeat === 'daily' ? 'daily' : null;
  const alarm = input.alarm === true;
  const { scheduledAt } = input;
  const id = await insertReminder({ title, scheduledAt, repeat, alarm, taskId });
  notifyTableChanged('reminders');
  const plan = planAlert({ status: 'scheduled', scheduledAt, repeat }, Date.now());
  const alert = await armAlert({ id, title, repeat, alarm }, plan, { ask: true });
  return { reminder: await requireReminder(id), alert };
}

/**
 * Saves a new title, time, repeat or alarm setting, and reschedules the alert. A new
 * future time, or turning on the daily repeat, brings back a reminder that was done,
 * dismissed or cancelled. An alarm that's ringing or snoozed stops.
 */
export async function updateReminder(id: number, changes: ReminderChanges): Promise<SavedReminder> {
  const current = await requireReminder(id);
  const title = changes.title === undefined ? current.title : checkTitle(changes.title);
  const scheduledAt = changes.scheduledAt ?? current.scheduledAt;
  checkTime(scheduledAt);
  const repeat =
    changes.repeat === undefined ? current.repeat : changes.repeat === 'daily' ? 'daily' : null;
  const alarm = changes.alarm ?? current.alarm;
  const now = Date.now();
  const nextAt = repeat === 'daily' ? nextDailyOccurrence(scheduledAt, now) : scheduledAt;
  const startsAgain =
    changes.scheduledAt !== undefined || (repeat === 'daily' && current.repeat !== 'daily');
  const reactivate = startsAgain && current.status !== 'scheduled' && nextAt > now;

  await updateReminderRow(
    id,
    reactivate
      ? { title, scheduledAt, repeat, alarm, status: 'scheduled' }
      : { title, scheduledAt, repeat, alarm },
  );
  notifyTableChanged('reminders');

  await silenceAlarm(id);
  const status: ReminderStatus = reactivate ? 'scheduled' : current.status;
  const plan = planAlert({ status, scheduledAt, repeat }, now);
  const alert = await armAlert({ id, title, repeat, alarm }, plan, { ask: true });
  return { reminder: await requireReminder(id), alert };
}

/**
 * Marks a reminder done, dismissed or cancelled, cancels its alert and stops an alarm
 * that's ringing or snoozed. A daily reminder that's done or dismissed only skips
 * today: it stays scheduled and rings again tomorrow. Cancelling stops it for good.
 * `alertCleared` is false when an alert that should be gone may still go off.
 */
export async function setReminderStatus(
  id: number,
  status: Exclude<ReminderStatus, 'scheduled'>,
): Promise<{ reminder: Reminder; alertCleared: boolean }> {
  const current = await requireReminder(id);
  await silenceAlarm(id);
  if (current.repeat === 'daily' && current.status === 'scheduled' && status !== 'cancelled') {
    return skipToday(current);
  }
  const saved = await updateReminderRow(id, { status, notificationId: null });
  if (!saved) throw new Error('That reminder no longer exists.');
  notifyTableChanged('reminders');
  const alertCleared = await disarmAlert(id);
  return { reminder: await requireReminder(id), alertCleared };
}

/**
 * Rings a reminder again in `SNOOZE_MINUTES`, as an alarm, and takes the alert that's
 * showing off the screen. The reminder itself doesn't change: Done or Dismiss still
 * closes it, and they cancel the snooze too.
 */
export async function snoozeReminder(id: number): Promise<AlertOutcome> {
  const reminder = await requireReminder(id);
  if (reminder.status !== 'scheduled') throw new Error('That reminder is already closed.');
  await silenceAlarm(id);
  if ((await getNotificationPermission()) !== 'granted') return 'no-permission';
  const at = Date.now() + SNOOZE_MINUTES * 60_000;
  try {
    await scheduleNotification({
      identifier: snoozeId(id),
      title: reminder.title,
      body: `Snoozed · ${formatTime(at)}`,
      at,
      alarm: true,
      data: { reminderId: id, scheduledAt: at, snooze: true, alarm: true },
    });
    return 'scheduled';
  } catch {
    return 'failed';
  }
}

// Done or dismissed, for a daily reminder: today's time is skipped and the repeat carries on.
async function skipToday(
  reminder: Reminder,
): Promise<{ reminder: Reminder; alertCleared: boolean }> {
  const now = Date.now();
  const scheduledAt = skipTodaysOccurrence(reminder.scheduledAt, now);
  const saved = await updateReminderRow(reminder.id, { scheduledAt });
  if (!saved) throw new Error('That reminder no longer exists.');
  notifyTableChanged('reminders');
  const plan = planAlert({ status: 'scheduled', scheduledAt, repeat: 'daily' }, now);
  const alert = await armAlert(reminder, plan, { ask: false });
  return { reminder: await requireReminder(reminder.id), alertCleared: alert !== 'failed' };
}

export async function deleteReminder(id: number): Promise<{ alertCleared: boolean }> {
  const deleted = await deleteReminderRow(id);
  if (!deleted) throw new Error('That reminder no longer exists.');
  notifyTableChanged('reminders');
  await silenceAlarm(id);
  return { alertCleared: await disarmAlert(id) };
}

/**
 * Brings the phone's scheduled alerts in line with the saved reminders: schedules
 * the soonest upcoming ones that are missing or out of date, and cancels the rest.
 * A daily reminder keeps one daily alert, swapped in for a one-off alert once a
 * skipped day has passed. The two can drift apart because they can't share a
 * transaction. A snooze stays only while its reminder is still open. Never asks
 * for permission.
 */
export async function syncReminderAlerts(): Promise<void> {
  if ((await getNotificationPermission()) !== 'granted') return;
  const now = Date.now();
  const reminders = await selectReminders();
  const open = new Set(reminders.filter((r) => r.status === 'scheduled').map((r) => r.id));
  const upcoming = reminders
    .flatMap((reminder) => {
      const plan = planAlert(reminder, now);
      return plan ? [{ reminder, plan }] : [];
    })
    .sort((a, b) => a.plan.at - b.plan.at)
    .slice(0, MAX_PENDING_ALERTS);
  const wanted = new Map(upcoming.map((alert) => [alert.reminder.id, alert]));

  const pending = new Set<number>();
  for (const { identifier, data } of await getScheduledNotifications()) {
    const snooze = SNOOZE_ID.exec(identifier);
    if (snooze) {
      if (!open.has(Number(snooze[1]))) await cancelNotification(identifier).catch(() => undefined);
      continue;
    }
    const match = ALERT_ID.exec(identifier);
    if (!match) continue;
    const alert = wanted.get(Number(match[1]));
    if (alert && isAlertCurrent(alert.plan, data, alert.reminder.alarm)) {
      pending.add(alert.reminder.id);
    } else {
      await cancelNotification(identifier).catch(() => undefined);
    }
  }

  let changed = false;
  for (const { reminder, plan } of upcoming) {
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
    const alert = await armAlert(reminder, plan, { ask: false });
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

/** Whether a notification is a reminder ringing as an alarm, snoozed or not. */
export function isAlarmNotification(data: NotificationData): boolean {
  return reminderIdFromNotification(data) !== null && data.alarm === true;
}

// Schedules the alert `plan` asks for, replacing any pending one; a null plan clears it.
async function armAlert(
  reminder: AlertTarget,
  plan: AlertPlan | null,
  { ask }: { ask: boolean },
): Promise<AlertOutcome> {
  const { id, title, repeat, alarm } = reminder;
  if (plan === null) {
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
    const kind = repeat === 'daily' ? 'Every day' : alarm ? 'Alarm' : 'Reminder';
    const notificationId = await scheduleNotification({
      identifier: alertId(id),
      title,
      body: `${kind} · ${formatTime(plan.at)}`,
      at: plan.at,
      repeat: plan.kind === 'daily' ? 'daily' : undefined,
      alarm,
      data: alertData(id, plan, alarm),
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

// Stops a reminder's alarm: cancels a pending snooze, and takes an alert that's showing
// off the screen, which also stops its sound. Nothing to do is fine.
async function silenceAlarm(id: number): Promise<void> {
  await Promise.all([
    cancelNotification(snoozeId(id)),
    dismissNotification(alertId(id)),
    dismissNotification(snoozeId(id)),
  ]).catch(() => undefined);
}

function alertId(reminderId: number): string {
  return `reminder-${reminderId}`;
}

function snoozeId(reminderId: number): string {
  return `reminder-${reminderId}-snooze`;
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
