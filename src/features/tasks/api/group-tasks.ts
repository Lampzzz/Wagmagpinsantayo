import { calendarDaysBetween } from '@/utils/resolve-when';

import type { Task, TaskGroup } from '../types';

const GROUP_ORDER: readonly TaskGroup[] = ['overdue', 'today', 'upcoming', 'no-date', 'done'];

export const TASK_GROUP_TITLES: Record<TaskGroup, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  'no-date': 'No date',
  done: 'Done',
};

/** A pending task is overdue once its deadline has passed. An all-day deadline ends at midnight. */
export function isTaskOverdue(task: Task, now: number): boolean {
  return task.status === 'pending' && task.dueAt !== null && task.dueAt < now;
}

export function taskGroup(task: Task, now: number): TaskGroup {
  if (task.status === 'done') return 'done';
  if (task.dueAt === null) return 'no-date';
  if (task.dueAt < now) return 'overdue';
  return calendarDaysBetween(now, task.dueAt) === 0 ? 'today' : 'upcoming';
}

/**
 * Sorts tasks into Overdue, Today, Upcoming, No date and Done, leaving out empty
 * groups. Deadlines come soonest first, undated tasks newest first, and done
 * tasks most recently finished first.
 */
export function groupTasks(
  tasks: readonly Task[],
  now: number,
): { group: TaskGroup; tasks: Task[] }[] {
  const byGroup = new Map<TaskGroup, Task[]>();
  for (const task of tasks) {
    const group = taskGroup(task, now);
    const members = byGroup.get(group);
    if (members) members.push(task);
    else byGroup.set(group, [task]);
  }
  return GROUP_ORDER.flatMap((group) => {
    const members = byGroup.get(group);
    return members ? [{ group, tasks: members.sort(ORDER_WITHIN[group]) }] : [];
  });
}

type Compare = (a: Task, b: Task) => number;

const byDeadline: Compare = (a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0) || a.id - b.id;
const newestFirst: Compare = (a, b) => b.createdAt - a.createdAt || b.id - a.id;
const lastDoneFirst: Compare = (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0) || b.id - a.id;

const ORDER_WITHIN: Record<TaskGroup, Compare> = {
  overdue: byDeadline,
  today: byDeadline,
  upcoming: byDeadline,
  'no-date': newestFirst,
  done: lastDoneFirst,
};
