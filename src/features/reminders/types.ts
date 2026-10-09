export type ReminderStatus = 'scheduled' | 'completed' | 'dismissed' | 'cancelled';

/** How a reminder repeats. `daily` rings every day at the time of day of `scheduledAt`. */
export type ReminderRepeat = 'daily';

/** A saved reminder. Times are milliseconds since the epoch. */
export type Reminder = {
  id: number;
  title: string;
  scheduledAt: number;
  /** Null for a one-off reminder. */
  repeat: ReminderRepeat | null;
  /** Rings like an alarm (alarm volume, Snooze and Done) instead of a plain notification. */
  alarm: boolean;
  status: ReminderStatus;
  /** The phone's id for the pending notification. Null when no alert is scheduled. */
  notificationId: string | null;
  /** The task this reminder was set for, if the user connected them. */
  taskId: number | null;
  taskTitle: string | null;
  createdAt: number;
  updatedAt: number;
};

export type NewReminder = {
  title: string;
  scheduledAt: number;
  /** Leave it out for a one-off reminder. */
  repeat?: ReminderRepeat;
  /** Leave it out for a plain notification. */
  alarm?: boolean;
  taskId?: number | null;
};

/** `repeat: null` turns a repeating reminder into a one-off. */
export type ReminderChanges = Partial<Pick<Reminder, 'title' | 'scheduledAt' | 'repeat' | 'alarm'>>;

/**
 * Whether the phone will alert at the reminder's time: `scheduled`, `no-permission`
 * (notifications are off), `failed`, or `none` when no alert is due because the
 * reminder is finished or its time has passed.
 */
export type AlertOutcome = 'scheduled' | 'no-permission' | 'failed' | 'none';

/** A reminder that was saved, and whether its alert was scheduled. */
export type SavedReminder = { reminder: Reminder; alert: AlertOutcome };

export type ReminderGroup = 'past-due' | 'upcoming' | 'finished';
