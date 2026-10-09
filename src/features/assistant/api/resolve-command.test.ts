import type { Reminder } from '@/features/reminders';
import type { Task } from '@/features/tasks';

import type { Command, Focus, Snapshot } from '../types';
import { cleanTitle, resolveCommand, type ResolveContext } from './resolve-command';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function endOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

// Thursday, Oct 8, 2026, 2:30 PM.
const NOW = at(2026, 10, 8, 14, 30);

function task(id: number, title: string, changes: Partial<Task> = {}): Task {
  return {
    id,
    title,
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

function reminder(id: number, title: string, changes: Partial<Reminder> = {}): Reminder {
  return {
    id,
    title,
    scheduledAt: at(2026, 10, 9, 10),
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

function resolve(
  command: Command,
  snapshot: Partial<Snapshot> = {},
  context: Partial<ResolveContext> = {},
) {
  return resolveCommand(
    command,
    { tasks: snapshot.tasks ?? [], reminders: snapshot.reminders ?? [] },
    { now: NOW, focus: null, ...context },
  );
}

const ASSIGNMENT = task(7, 'Finish my assignment');
const FOCUS_ON_ASSIGNMENT: Focus = {
  entity: 'task',
  id: 7,
  title: 'Finish my assignment',
  turnsLeft: 1,
};

describe('cleanTitle', () => {
  it('capitalizes and drops leading "to" and end punctuation', () => {
    expect(cleanTitle('to call mom.')).toBe('Call mom');
    expect(cleanTitle('that I need to renew my passport')).toBe('Renew my passport');
  });

  it('removes quotes around the whole title but keeps quotes inside it', () => {
    expect(cleanTitle('"buy milk"')).toBe('Buy milk');
    expect(cleanTitle('read "Dune"')).toBe('Read "Dune"');
  });
});

describe('resolveCommand: new tasks', () => {
  it('asks for a title when there is none', () => {
    const result = resolve({ kind: 'add-task', title: '' });
    expect(result).toMatchObject({ kind: 'ask', question: { kind: 'fill', field: 'title' } });
  });

  it('makes a date without a time an all-day deadline', () => {
    expect(resolve({ kind: 'add-task', title: 'finish my project', when: 'tomorrow' })).toEqual({
      kind: 'ready',
      action: {
        kind: 'create-task',
        task: {
          title: 'Finish my project',
          description: '',
          priority: 'normal',
          dueAt: endOf(2026, 10, 9),
          dueHasTime: false,
        },
      },
    });
  });

  it('accepts "no date" as an answer', () => {
    expect(resolve({ kind: 'add-task', title: 'read', when: 'no date' })).toMatchObject({
      kind: 'ready',
      action: { task: { dueAt: null } },
    });
  });

  it('asks again when the date is unreadable', () => {
    expect(resolve({ kind: 'add-task', title: 'read', when: 'someday soon' })).toMatchObject({
      kind: 'ask',
      question: { kind: 'fill', field: 'when', prompt: expect.stringContaining("couldn't read") },
    });
  });
});

describe('resolveCommand: new reminders', () => {
  it('asks when there is no time', () => {
    expect(resolve({ kind: 'add-reminder', title: 'call mom' })).toMatchObject({
      kind: 'ask',
      question: { kind: 'fill', field: 'when', prompt: 'When should I remind you?' },
    });
  });

  it('offers tomorrow when the time has passed today', () => {
    expect(resolve({ kind: 'add-reminder', title: 'stretch', when: '9 AM' })).toMatchObject({
      kind: 'ask',
      question: {
        kind: 'confirm',
        prompt: 'That time has already passed today. Did you mean tomorrow at 9:00 AM?',
        action: { kind: 'create-reminder', reminder: { scheduledAt: at(2026, 10, 9, 9) } },
      },
    });
  });

  it('asks for a time when "today" is past 9 AM', () => {
    expect(resolve({ kind: 'add-reminder', title: 'water plants', when: 'today' })).toMatchObject({
      kind: 'ask',
      question: { kind: 'fill', field: 'when', prompt: 'What time today?' },
    });
  });

  it('links a reminder with no title to the task just touched', () => {
    const result = resolve(
      { kind: 'add-reminder', title: '', when: 'at 8 PM' },
      { tasks: [ASSIGNMENT] },
      { focus: FOCUS_ON_ASSIGNMENT },
    );
    expect(result).toEqual({
      kind: 'ready',
      action: {
        kind: 'create-reminder',
        reminder: { title: 'Finish my assignment', scheduledAt: at(2026, 10, 8, 20), taskId: 7 },
      },
    });
  });

  it('fills in "it" with the task just touched', () => {
    const result = resolve(
      { kind: 'add-reminder', title: 'review it', when: 'in 5 minutes' },
      { tasks: [ASSIGNMENT] },
      { focus: FOCUS_ON_ASSIGNMENT },
    );
    expect(result).toMatchObject({
      kind: 'ready',
      action: { reminder: { title: 'Review "Finish my assignment"', taskId: 7 } },
    });
  });
});

describe('resolveCommand: existing items', () => {
  const tasks = [
    task(1, 'Finish project report'),
    task(2, 'Project kickoff prep'),
    task(3, 'Study React Native', { status: 'done' }),
  ];

  it('asks which one when several match, newest first among equals', () => {
    const result = resolve({ kind: 'complete-task', target: 'project' }, { tasks });
    expect(result).toMatchObject({
      kind: 'ask',
      question: { kind: 'pick', options: [{ id: 2 }, { id: 1 }], deleting: false },
    });
  });

  it('acts on the one the user picked', () => {
    const result = resolve(
      { kind: 'complete-task', target: 'project' },
      { tasks },
      { targetId: 2 },
    );
    expect(result).toMatchObject({
      kind: 'ready',
      action: { kind: 'set-task-done', task: { id: 2 } },
    });
  });

  it('says honestly when the item is already done', () => {
    expect(resolve({ kind: 'complete-task', target: 'React Native' }, { tasks })).toEqual({
      kind: 'problem',
      problem: { kind: 'already', entity: 'task', title: 'Study React Native', state: 'done' },
    });
  });

  it('asks before deleting, and deletes once confirmed', () => {
    const command: Command = { kind: 'delete-task', target: 'React Native' };
    expect(resolve(command, { tasks })).toMatchObject({
      kind: 'ask',
      question: {
        kind: 'confirm',
        prompt: 'Delete the task "Study React Native"? This can\'t be undone.',
      },
    });
    expect(resolve(command, { tasks }, { confirmed: true })).toMatchObject({
      kind: 'ready',
      action: { kind: 'delete-task', task: { id: 3 } },
    });
  });

  it('offers a weak match as "did you mean"', () => {
    const result = resolve({ kind: 'complete-task', target: 'kickoff meeting' }, { tasks });
    expect(result).toMatchObject({
      kind: 'ask',
      question: { kind: 'pick', prompt: 'Did you mean "Project kickoff prep"?' },
    });
  });

  it('reports a target that matches nothing', () => {
    expect(resolve({ kind: 'complete-task', target: 'unicorn' }, { tasks })).toEqual({
      kind: 'problem',
      problem: { kind: 'not-found', entity: 'task', target: 'unicorn' },
    });
  });

  it('looks among reminders when the user did not say which kind', () => {
    const reminders = [reminder(9, 'Dentist appointment')];
    const result = resolve(
      { kind: 'delete-task', target: 'dentist appointment', impliedEntity: true },
      { tasks, reminders },
    );
    expect(result).toMatchObject({
      kind: 'ask',
      question: { kind: 'confirm', action: { kind: 'delete-reminder', reminder: { id: 9 } } },
    });
  });

  it('uses the only candidate when the target is blank', () => {
    const reminders = [reminder(9, 'Drink water')];
    expect(resolve({ kind: 'cancel-reminder', target: '' }, { reminders })).toMatchObject({
      kind: 'ready',
      action: { kind: 'close-reminder', status: 'cancelled', reminder: { id: 9 } },
    });
    expect(resolve({ kind: 'cancel-reminder', target: '' })).toEqual({
      kind: 'problem',
      problem: { kind: 'none', entity: 'reminder', which: 'scheduled reminders' },
    });
  });

  it('resolves "it" to the item just touched', () => {
    const result = resolve(
      { kind: 'complete-task', target: 'it', impliedEntity: true },
      { tasks: [ASSIGNMENT, ...tasks] },
      { focus: FOCUS_ON_ASSIGNMENT },
    );
    expect(result).toMatchObject({ kind: 'ready', action: { task: { id: 7 } } });
  });

  it("keeps a reminder's day when only a new time is given", () => {
    const reminders = [reminder(9, 'Team meeting', { scheduledAt: at(2026, 10, 9, 10) })];
    expect(
      resolve({ kind: 'edit-reminder', target: 'meeting', when: '3 PM' }, { reminders }),
    ).toEqual({
      kind: 'ready',
      action: {
        kind: 'update-reminder',
        reminder: reminders[0],
        changes: { scheduledAt: at(2026, 10, 9, 15) },
      },
    });
  });

  it('reports an edit that changes nothing', () => {
    expect(
      resolve(
        { kind: 'edit-task', target: 'project report', title: 'Finish project report' },
        { tasks },
      ),
    ).toEqual({
      kind: 'problem',
      problem: { kind: 'nothing-to-change', title: 'Finish project report' },
    });
  });
});

describe('resolveCommand: lists', () => {
  it("includes overdue tasks in today's list", () => {
    const tasks = [
      task(1, 'Overdue', { dueAt: at(2026, 10, 7, 9), dueHasTime: true }),
      task(2, 'Today', { dueAt: endOf(2026, 10, 8) }),
      task(3, 'Tomorrow', { dueAt: endOf(2026, 10, 9) }),
      task(4, 'Undated'),
    ];
    const result = resolve({ kind: 'list-tasks', status: 'pending', when: 'today' }, { tasks });
    expect(result).toMatchObject({
      kind: 'listed',
      listing: { entity: 'task', tasks: [{ id: 1 }, { id: 2 }], qualifier: 'due today' },
    });
  });

  it('searches titles', () => {
    const tasks = [task(1, 'Buy groceries'), task(2, 'Call mom')];
    const result = resolve({ kind: 'list-tasks', status: 'all', search: 'groceries' }, { tasks });
    expect(result).toMatchObject({
      listing: { tasks: [{ id: 1 }], qualifier: 'matching "groceries"' },
    });
  });

  it("lists today's reminders, soonest first", () => {
    const reminders = [
      reminder(1, 'Later today', { scheduledAt: at(2026, 10, 8, 18) }),
      reminder(2, 'Tomorrow'),
      reminder(3, 'Soon', { scheduledAt: at(2026, 10, 8, 15) }),
    ];
    const result = resolve({ kind: 'list-reminders', when: 'today' }, { reminders });
    expect(result).toMatchObject({
      listing: { entity: 'reminder', reminders: [{ id: 3 }, { id: 1 }], qualifier: 'for today' },
    });
  });
});
