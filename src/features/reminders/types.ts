export type ReminderStatus = 'scheduled' | 'completed' | 'dismissed' | 'cancelled';

/** A saved reminder. Times are milliseconds since the epoch. */
export type Reminder = {
  id: number;
  title: string;
  scheduledAt: number;
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
  taskId?: number | null;
};

export type ReminderChanges = Partial<Pick<Reminder, 'title' | 'scheduledAt'>>;

/**
 * Whether the phone will alert at the reminder's time: `scheduled`, `no-permission`
 * (notifications are off), `failed`, or `none` when no alert is due because the
 * reminder is finished or its time has passed.
 */
export type AlertOutcome = 'scheduled' | 'no-permission' | 'failed' | 'none';

/** A reminder that was saved, and whether its alert was scheduled. */
export type SavedReminder = { reminder: Reminder; alert: AlertOutcome };

export type ReminderGroup = 'past-due' | 'upcoming' | 'finished';
