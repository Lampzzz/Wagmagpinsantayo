import type { Task } from '../types';
import { groupTasks, isTaskOverdue, taskGroup } from './group-tasks';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// Thursday, Oct 8, 2026, 2:30 PM.
const NOW = at(2026, 10, 8, 14, 30);
const END_OF_TODAY = new Date(2026, 9, 8, 23, 59, 59, 999).getTime();

function task(id: number, changes: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: '',
    status: 'pending',
    priority: 'normal',
    dueAt: null,
    dueHasTime: false,
    completedAt: null,
    createdAt: at(2026, 10, 1),
    updatedAt: at(2026, 10, 1),
    ...changes,
  };
}

describe('taskGroup', () => {
  it('keeps an all-day task due today out of Overdue until the day ends', () => {
    const allDay = task(1, { dueAt: END_OF_TODAY });
    expect(taskGroup(allDay, NOW)).toBe('today');
    expect(isTaskOverdue(allDay, NOW)).toBe(false);
  });

  it('marks a timed task from earlier today as overdue', () => {
    const morning = task(1, { dueAt: at(2026, 10, 8, 9), dueHasTime: true });
    expect(taskGroup(morning, NOW)).toBe('overdue');
    expect(isTaskOverdue(morning, NOW)).toBe(true);
  });

  it('puts later days in Upcoming, undated tasks in No date, and finished tasks in Done', () => {
    expect(taskGroup(task(1, { dueAt: at(2026, 10, 9, 9) }), NOW)).toBe('upcoming');
    expect(taskGroup(task(2), NOW)).toBe('no-date');
    expect(taskGroup(task(3, { status: 'done', dueAt: at(2026, 10, 1) }), NOW)).toBe('done');
  });

  it('never calls a finished task overdue', () => {
    expect(isTaskOverdue(task(1, { status: 'done', dueAt: at(2026, 10, 1) }), NOW)).toBe(false);
  });
});

describe('groupTasks', () => {
  it('orders groups and the tasks inside them', () => {
    const tasks = [
      task(1, { status: 'done', completedAt: at(2026, 10, 2) }),
      task(2, { dueAt: at(2026, 10, 12) }),
      task(3, { dueAt: at(2026, 10, 10) }),
      task(4, { createdAt: at(2026, 10, 3) }),
      task(5, { createdAt: at(2026, 10, 5) }),
      task(6, { status: 'done', completedAt: at(2026, 10, 6) }),
      task(7, { dueAt: at(2026, 10, 7) }),
    ];
    const groups = groupTasks(tasks, NOW).map(({ group, tasks: members }) => [
      group,
      members.map((member) => member.id),
    ]);
    expect(groups).toEqual([
      ['overdue', [7]],
      ['upcoming', [3, 2]],
      ['no-date', [5, 4]],
      ['done', [6, 1]],
    ]);
  });
});
