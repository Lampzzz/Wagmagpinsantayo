import { getDatabase } from '@/lib/db';

import type { Reminder, ReminderRepeat, ReminderStatus } from '../types';
import { nextDailyOccurrence } from './repeat-rules';

type ReminderRow = {
  id: number;
  title: string;
  scheduled_at: number;
  repeat: string | null;
  alarm: number;
  status: string;
  notification_id: string | null;
  task_id: number | null;
  task_title: string | null;
  created_at: number;
  updated_at: number;
};

type ReminderFields = Partial<{
  title: string;
  scheduledAt: number;
  repeat: ReminderRepeat | null;
  alarm: boolean;
  status: ReminderStatus;
  notificationId: string | null;
}>;

const STATUSES: readonly string[] = ['scheduled', 'completed', 'dismissed', 'cancelled'];

// The linked task's title comes along for display.
const SELECT_REMINDERS = `SELECT r.id, r.title, r.scheduled_at, r.repeat, r.alarm, r.status,
    r.notification_id, r.task_id, t.title AS task_title, r.created_at, r.updated_at
  FROM reminders r LEFT JOIN tasks t ON t.id = r.task_id`;

export async function selectReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(`${SELECT_REMINDERS} ORDER BY r.id`);
  const now = Date.now();
  return rows.map((row) => toReminder(row, now));
}

export async function selectReminder(id: number): Promise<Reminder | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReminderRow>(`${SELECT_REMINDERS} WHERE r.id = ?`, id);
  return row && toReminder(row, Date.now());
}

export async function insertReminder(input: {
  title: string;
  scheduledAt: number;
  repeat: ReminderRepeat | null;
  alarm: boolean;
  taskId: number | null;
}): Promise<number> {
  const now = Date.now();
  const db = await getDatabase();
  const { lastInsertRowId } = await db.runAsync(
    `INSERT INTO reminders (title, scheduled_at, repeat, alarm, task_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.scheduledAt,
    input.repeat,
    input.alarm ? 1 : 0,
    input.taskId,
    now,
    now,
  );
  return lastInsertRowId;
}

/**
 * Saves the given fields and reports whether the reminder exists. Bookkeeping
 * (`touch: false`) leaves the last-changed time alone.
 */
export async function updateReminderRow(
  id: number,
  fields: ReminderFields,
  { touch = true }: { touch?: boolean } = {},
): Promise<boolean> {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];
  if (fields.title !== undefined) {
    assignments.push('title = ?');
    values.push(fields.title);
  }
  if (fields.scheduledAt !== undefined) {
    assignments.push('scheduled_at = ?');
    values.push(fields.scheduledAt);
  }
  if (fields.repeat !== undefined) {
    assignments.push('repeat = ?');
    values.push(fields.repeat);
  }
  if (fields.alarm !== undefined) {
    assignments.push('alarm = ?');
    values.push(fields.alarm ? 1 : 0);
  }
  if (fields.status !== undefined) {
    assignments.push('status = ?');
    values.push(fields.status);
  }
  if (fields.notificationId !== undefined) {
    assignments.push('notification_id = ?');
    values.push(fields.notificationId);
  }
  if (touch) {
    assignments.push('updated_at = ?');
    values.push(Date.now());
  }
  if (assignments.length === 0) return true;
  const db = await getDatabase();
  const { changes } = await db.runAsync(
    `UPDATE reminders SET ${assignments.join(', ')} WHERE id = ?`,
    ...values,
    id,
  );
  return changes > 0;
}

export async function deleteReminderRow(id: number): Promise<boolean> {
  const db = await getDatabase();
  const { changes } = await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
  return changes > 0;
}

/** The title of a task a reminder can be linked to, or null when there's no such task. */
export async function selectTaskTitle(id: number): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ title: string }>('SELECT title FROM tasks WHERE id = ?', id);
  return row?.title ?? null;
}

// A daily reminder's saved time is the earliest it may ring. It reads as the next time it
// rings, so every list, reply and alert shows when that is.
function toReminder(row: ReminderRow, now: number): Reminder {
  const repeat = row.repeat === 'daily' ? 'daily' : null;
  return {
    id: row.id,
    title: row.title,
    scheduledAt: repeat ? nextDailyOccurrence(row.scheduled_at, now) : row.scheduled_at,
    repeat,
    alarm: row.alarm === 1,
    status: STATUSES.includes(row.status) ? (row.status as ReminderStatus) : 'scheduled',
    notificationId: row.notification_id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
