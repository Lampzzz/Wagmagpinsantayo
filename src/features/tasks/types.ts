export type TaskStatus = 'pending' | 'done';

export type TaskPriority = 'low' | 'normal' | 'high';

/** A saved task. Times are milliseconds since the epoch. */
export type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** The deadline. For an all-day deadline, the last millisecond of that day. */
  dueAt: number | null;
  /** False for an all-day deadline. */
  dueHasTime: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type NewTask = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: number | null;
  dueHasTime?: boolean;
};

/** Fields to change. A `dueAt` of null clears the deadline. */
export type TaskChanges = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'dueAt' | 'dueHasTime'>
>;

export type TaskGroup = 'overdue' | 'today' | 'upcoming' | 'no-date' | 'done';
