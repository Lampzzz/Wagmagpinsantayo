import type { Reminder } from '@/features/reminders';
import type { Task, TaskChanges } from '@/features/tasks';
import { EMERGENCY_NUMBER } from '@/lib/phone';
import { capitalize } from '@/utils/capitalize';
import { formatDay, formatTime, formatWhen } from '@/utils/format-when';
import { parseWhen, type DayRef, type WhenParts } from '@/utils/parse-when';
import { dayWindow, resolveWhen, type WhenPurpose } from '@/utils/resolve-when';

import type {
  Action,
  ClosedReminderStatus,
  Command,
  Entity,
  Focus,
  Listing,
  PickOption,
  Problem,
  Question,
  Snapshot,
} from '../types';
import { reminderWhen } from './compose-reply';
import { isBlankQuery, matchTitle } from './match-title';

export type Resolution =
  | { kind: 'ready'; action: Action }
  | { kind: 'listed'; listing: Listing }
  | { kind: 'ask'; question: Question }
  | { kind: 'problem'; problem: Problem };

export type ResolveContext = {
  now: number;
  focus: Focus | null;
  /** The record the user picked from the options offered. */
  targetId?: number;
  /** The user already agreed to this delete. */
  confirmed?: boolean;
};

type TargetCommand = Extract<Command, { target: string }>;
type CreateTask = Extract<Action, { kind: 'create-task' }>;
type Item = Task | Reminder;

const MAX_OPTIONS = 4;
const MAX_TITLE_LENGTH = 200;
const PRONOUN_TARGET = /^(?:it|that|this|that one|this one)$/i;
const NO_DATE = /^(?:no date|no due date|no deadline|none|no|nope|skip|without a date)$/i;
const REMINDER_TIME_SUGGESTIONS = ['In 10 minutes', 'In 1 hour', 'Tonight', 'Tomorrow 9 AM'];
const DAILY_TIME_SUGGESTIONS = ['At 8 AM', 'At 12 PM', 'At 6 PM', 'At 9 PM'];
const TODAY_TIME_SUGGESTIONS = ['In 1 hour', 'At 6 PM', 'Tonight'];
const DUE_SUGGESTIONS = ['Today', 'Tomorrow', 'Next week', 'No date'];

const CLOSED_STATUS: Record<string, ClosedReminderStatus> = {
  'complete-reminder': 'completed',
  'dismiss-reminder': 'dismissed',
  'cancel-reminder': 'cancelled',
};

const STATE_WORDS: Record<Reminder['status'], string> = {
  scheduled: 'scheduled',
  completed: 'done',
  dismissed: 'dismissed',
  cancelled: 'cancelled',
};

/**
 * Checks a command against the saved tasks and reminders. Returns an action that
 * is safe to run, a list to show, a question for the user, or the reason it can't run.
 */
export function resolveCommand(
  command: Command,
  snapshot: Snapshot,
  context: ResolveContext,
): Resolution {
  switch (command.kind) {
    case 'add-task':
      return resolveAddTask(command, context.now);
    case 'add-reminder':
      return resolveAddReminder(command, snapshot, context);
    case 'list-tasks':
      return listTasks(command, snapshot.tasks, context.now);
    case 'list-reminders':
      return listReminders(command, snapshot.reminders, context.now);
    case 'call-emergency':
      return confirmEmergencyCall();
    case 'add-note':
      return resolveAddNote(command);
    default:
      return resolveTargeted(command, snapshot, context);
  }
}

// The entry keeps the user's words and is shown back before it's saved. It has no
// title, so the journal heads it with its first line.
function resolveAddNote(command: Extract<Command, { kind: 'add-note' }>): Resolution {
  const entry = cleanEntry(command.text);
  if (!entry) return askFor(command, 'text', 'What should I write in your journal?', []);
  return {
    kind: 'ask',
    question: {
      kind: 'confirm',
      prompt: `Save this to today's journal?\n"${entry}"`,
      action: { kind: 'create-note', note: { title: '', body: entry } },
      yesLabel: 'Save',
      noLabel: 'Cancel',
    },
  };
}

/** Tidies only the ends of an entry: "“today was good.”" → "Today was good." */
function cleanEntry(raw: string): string {
  let entry = raw.trim();
  if (/^["“][\s\S]*["”]$/.test(entry)) entry = entry.slice(1, -1).trim();
  // Punctuation alone ("…") isn't an entry.
  return entry.replace(/[\s.,;:!?'"“”‘’()…—–-]+/g, '') ? capitalize(entry) : '';
}

// Never dials by itself: the user says yes here, then taps Call in the dialer.
function confirmEmergencyCall(): Resolution {
  return {
    kind: 'ask',
    question: {
      kind: 'confirm',
      prompt: `Call emergency services (${EMERGENCY_NUMBER})?`,
      action: { kind: 'call-emergency', number: EMERGENCY_NUMBER },
      yesLabel: `Call ${EMERGENCY_NUMBER}`,
      noLabel: 'Cancel',
    },
  };
}

/** Tidies a title the user said: "to call mom." → "Call mom". */
export function cleanTitle(raw: string): string {
  let title = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/, '');
  // Only quotes around the whole title go; `Read "Dune"` keeps its own.
  if (/^["“'‘].*["”'’]$/.test(title)) title = title.slice(1, -1).trim();
  title = title.replace(/^(?:to|(?:that )?i (?:need|have|must|should|want) to)\s+/i, '').trim();
  return capitalize(title).slice(0, MAX_TITLE_LENGTH);
}

function resolveAddTask(command: Extract<Command, { kind: 'add-task' }>, now: number): Resolution {
  const title = cleanTitle(command.title);
  if (!title) return askFor(command, 'title', "What's the task?", []);

  const build = (dueAt: number | null, dueHasTime: boolean): CreateTask => {
    const action: CreateTask = {
      kind: 'create-task',
      task: {
        title,
        description: command.notes?.trim() ?? '',
        priority: command.priority ?? 'normal',
        dueAt,
        dueHasTime,
      },
    };
    const remindAt =
      command.quickAdd && dueAt !== null && command.when
        ? quickAddReminderTime(dueAt, dueHasTime, command.when, now)
        : null;
    return remindAt === null ? action : { ...action, remindAt };
  };
  // Quick Add shows the task back for a yes; other wordings save it right away.
  const finish = (action: CreateTask): Resolution =>
    command.quickAdd ? proposeTask(action, now, false) : ready(action);

  if (!command.when || NO_DATE.test(command.when.trim())) return finish(build(null, false));
  const time = readWhen(command, command.when, 'task', now, null, (at, hasTime) =>
    build(at, hasTime),
  );
  if (!('kind' in time)) return finish(build(time.at, time.hasTime));
  // The time has passed today: the offer of tomorrow becomes the proposal.
  if (
    command.quickAdd &&
    time.kind === 'ask' &&
    time.question.kind === 'confirm' &&
    time.question.action.kind === 'create-task'
  ) {
    return proposeTask(time.question.action, now, true);
  }
  return time;
}

/**
 * Quick Add reminds at the due time. A date said without a time reminds at the
 * usual reminder hour that day (9:00 AM), unless that has already passed.
 */
function quickAddReminderTime(dueAt: number, hasTime: boolean, when: string, now: number) {
  if (hasTime) return dueAt;
  const parts = parseWhen(when, { loose: true });
  const resolved = parts && resolveWhen(parts, { now, purpose: 'reminder' });
  return resolved?.kind === 'ok' ? resolved.at : null;
}

// "Add "Pay electric bill" for tomorrow at 5:00 PM? I'll remind you then."
function proposeTask(action: CreateTask, now: number, timePassed: boolean): Resolution {
  const { title, dueAt = null, dueHasTime = false } = action.task;
  let prompt: string;
  if (dueAt === null) {
    prompt = `Add "${title}" with no due date? I won't set a reminder.`;
  } else if (dueHasTime) {
    prompt = `Add "${title}" for ${formatWhen(dueAt, true, now)}? I'll remind you then.`;
  } else {
    const reminder =
      action.remindAt === undefined
        ? "It's already past 9:00 AM, so I won't set a reminder."
        : `I'll remind you at ${formatTime(action.remindAt)} that day.`;
    prompt = `Add "${title}" for ${formatWhen(dueAt, false, now)}? ${reminder}`;
  }
  return {
    kind: 'ask',
    question: {
      kind: 'confirm',
      prompt: timePassed ? `That time has already passed today. ${prompt}` : prompt,
      action,
      yesLabel: timePassed ? 'Yes, tomorrow' : 'Save',
      noLabel: timePassed ? 'No' : 'Cancel',
    },
  };
}

function resolveAddReminder(
  command: Extract<Command, { kind: 'add-reminder' }>,
  snapshot: Snapshot,
  { now, focus }: ResolveContext,
): Resolution {
  let title = cleanTitle(command.title);
  let taskId: number | null = null;

  // "remind me at 8" or "remind me in 5 minutes to review it" is about the item just touched.
  const focused = focus ? findById(snapshot, focus.entity, focus.id) : null;
  if (focused && (title === '' || mentionsIt(title))) {
    title = title === '' ? focused.title : replaceIt(title, focused.title);
    if (focus?.entity === 'task') taskId = focused.id;
  }
  if (!title) return askFor(command, 'title', 'What should I remind you about?', []);
  if (command.repeat === 'daily') return proposeDailyReminder(command, title, taskId, now);
  if (!command.when) {
    return askFor(command, 'when', 'When should I remind you?', REMINDER_TIME_SUGGESTIONS);
  }

  const build = (at: number): Action => ({
    kind: 'create-reminder',
    reminder: { title, scheduledAt: at, taskId },
  });
  const time = readWhen(command, command.when, 'reminder', now, null, (at) => build(at));
  return 'kind' in time ? time : ready(build(time.at));
}

// "Remind you every day at 8:00 AM: "Take my medicine"? The first one is tomorrow."
function proposeDailyReminder(
  command: Extract<Command, { kind: 'add-reminder' }>,
  title: string,
  taskId: number | null,
  now: number,
): Resolution {
  if (!command.when) {
    return askFor(command, 'when', 'What time every day?', DAILY_TIME_SUGGESTIONS);
  }
  const parts = parseWhen(command.when, { loose: true });
  const at = parts && firstDailyTime(parts, now);
  if (!at) {
    return askFor(
      command,
      'when',
      `I couldn't read "${command.when.trim()}" as a time of day. What time every day?`,
      DAILY_TIME_SUGGESTIONS,
    );
  }
  return {
    kind: 'ask',
    question: {
      kind: 'confirm',
      prompt: `Remind you ${reminderWhen({ scheduledAt: at, repeat: 'daily' }, now)}: "${title}"? The first one is ${formatDay(at, now)}.`,
      action: {
        kind: 'create-reminder',
        reminder: { title, scheduledAt: at, taskId, repeat: 'daily' },
      },
      yesLabel: 'Save',
      noLabel: 'Cancel',
    },
  };
}

/**
 * When a daily reminder first rings: on the day the user named, if any, otherwise
 * today, or tomorrow once today's time has passed. A bare hour reads as on any named
 * day, so "every day at 8" is 8 AM and "every day at 5" is 5 PM.
 */
function firstDailyTime(parts: WhenParts, now: number): number | null {
  if (parts.kind !== 'moment' || !parts.time) return null;
  const today: DayRef = { kind: 'in-days', days: 0 };
  const tomorrow: DayRef = { kind: 'in-days', days: 1 };
  for (const day of [parts.day ?? today, today, tomorrow]) {
    const resolved = resolveWhen(
      { kind: 'moment', day, time: parts.time },
      { now, purpose: 'reminder' },
    );
    if (resolved.kind === 'ok') return resolved.at;
  }
  return null;
}

function listTasks(
  command: Extract<Command, { kind: 'list-tasks' }>,
  tasks: readonly Task[],
  now: number,
): Resolution {
  const status = command.summary ? 'pending' : (command.status ?? 'pending');
  let found = tasks.filter((task) => {
    switch (status) {
      case 'pending':
        return task.status === 'pending';
      case 'overdue':
        return task.status === 'pending' && task.dueAt !== null && task.dueAt < now;
      case 'done':
        return task.status === 'done';
      case 'all':
        return true;
    }
  });

  let qualifier = '';
  if (command.when) {
    const parts = parseWhen(command.when, { loose: true });
    const window = parts && dayWindow(parts, now);
    if (!window) return problem({ kind: 'bad-time', when: command.when });
    // "What do I still need to finish today?" includes what's already overdue.
    const coversToday = window.start <= now && now < window.end;
    found = found.filter(
      ({ dueAt, status: taskStatus }) =>
        dueAt !== null &&
        ((dueAt >= window.start && dueAt < window.end) ||
          (coversToday && taskStatus === 'pending' && dueAt < now)),
    );
    qualifier = `due ${dayWords(command.when)}`;
  }
  if (command.search) {
    const matches = matchTitle(command.search, found);
    found = [...matches.strong, ...matches.weak];
    qualifier = `matching "${command.search.trim()}"`;
  }

  found.sort(status === 'done' ? byLastDone : byDeadline);
  const adjective = { pending: 'pending', overdue: 'overdue', done: 'done', all: '' }[status];
  return {
    kind: 'listed',
    listing: {
      entity: 'task',
      tasks: found,
      adjective: command.summary ? 'open' : adjective,
      qualifier,
      summary: Boolean(command.summary),
    },
  };
}

function listReminders(
  command: Extract<Command, { kind: 'list-reminders' }>,
  reminders: readonly Reminder[],
  now: number,
): Resolution {
  const status = command.status ?? 'upcoming';
  let found = reminders.filter((reminder) => {
    switch (status) {
      case 'upcoming':
        return reminder.status === 'scheduled';
      case 'past-due':
        return reminder.status === 'scheduled' && reminder.scheduledAt <= now;
      case 'all':
        return true;
    }
  });

  let qualifier = '';
  if (command.when) {
    const parts = parseWhen(command.when, { loose: true });
    const window = parts && dayWindow(parts, now);
    if (!window) return problem({ kind: 'bad-time', when: command.when });
    found = found.filter(
      ({ scheduledAt }) => scheduledAt >= window.start && scheduledAt < window.end,
    );
    qualifier = `for ${dayWords(command.when)}`;
  }
  if (command.search) {
    const matches = matchTitle(command.search, found);
    found = [...matches.strong, ...matches.weak];
    qualifier = `matching "${command.search.trim()}"`;
  }

  found.sort((a, b) => a.scheduledAt - b.scheduledAt || a.id - b.id);
  const adjective = { upcoming: '', 'past-due': 'past-due', all: '' }[status];
  return {
    kind: 'listed',
    listing: { entity: 'reminder', reminders: found, adjective, qualifier },
  };
}

function resolveTargeted(
  command: TargetCommand,
  snapshot: Snapshot,
  context: ResolveContext,
): Resolution {
  const found = findTarget(command, snapshot, context);
  if ('kind' in found) return found;
  const { item, command: resolved } = found;

  switch (resolved.kind) {
    case 'complete-task':
    case 'reopen-task': {
      const task = item as Task;
      const done = resolved.kind === 'complete-task';
      if ((task.status === 'done') === done) {
        return problem({
          kind: 'already',
          entity: 'task',
          title: task.title,
          state: done ? 'done' : 'not done',
        });
      }
      return ready({ kind: 'set-task-done', task, done });
    }
    case 'delete-task':
    case 'delete-reminder': {
      const action: Action =
        resolved.kind === 'delete-task'
          ? { kind: 'delete-task', task: item as Task }
          : { kind: 'delete-reminder', reminder: item as Reminder };
      if (context.confirmed) return ready(action);
      const noun = resolved.kind === 'delete-task' ? 'task' : 'reminder';
      return {
        kind: 'ask',
        question: {
          kind: 'confirm',
          prompt: `Delete the ${noun} "${item.title}"? This can't be undone.`,
          action,
          yesLabel: 'Delete',
          noLabel: 'Keep',
        },
      };
    }
    case 'complete-reminder':
    case 'dismiss-reminder':
    case 'cancel-reminder': {
      const reminder = item as Reminder;
      if (reminder.status !== 'scheduled') {
        return problem({
          kind: 'already',
          entity: 'reminder',
          title: reminder.title,
          state: STATE_WORDS[reminder.status],
        });
      }
      return ready({ kind: 'close-reminder', reminder, status: CLOSED_STATUS[resolved.kind] });
    }
    case 'edit-task':
      return editTask(resolved, item as Task, context.now);
    case 'edit-reminder':
      return editReminder(resolved, item as Reminder, context.now);
  }
}

function editTask(
  command: Extract<Command, { kind: 'edit-task' }>,
  task: Task,
  now: number,
): Resolution {
  const changes: TaskChanges = {};
  if (command.title !== undefined) {
    const title = cleanTitle(command.title);
    if (title && title !== task.title) changes.title = title;
  }
  if (command.priority && command.priority !== task.priority) changes.priority = command.priority;
  if (command.notes !== undefined && command.notes.trim() !== task.description) {
    changes.description = command.notes.trim();
  }
  if (command.when !== undefined) {
    if (NO_DATE.test(command.when.trim())) {
      if (task.dueAt !== null) Object.assign(changes, { dueAt: null, dueHasTime: false });
    } else {
      const base = task.dueAt === null ? null : { at: task.dueAt, hasTime: task.dueHasTime };
      const time = readWhen(command, command.when, 'task', now, base, (at, hasTime) => ({
        kind: 'update-task',
        task,
        changes: { ...changes, dueAt: at, dueHasTime: hasTime },
      }));
      if ('kind' in time) return time;
      if (time.at !== task.dueAt || time.hasTime !== task.dueHasTime) {
        Object.assign(changes, { dueAt: time.at, dueHasTime: time.hasTime });
      }
    }
  }
  if (Object.keys(changes).length === 0) {
    return problem({ kind: 'nothing-to-change', title: task.title });
  }
  return ready({ kind: 'update-task', task, changes });
}

function editReminder(
  command: Extract<Command, { kind: 'edit-reminder' }>,
  reminder: Reminder,
  now: number,
): Resolution {
  const title = command.title === undefined ? '' : cleanTitle(command.title);
  const newTitle = title && title !== reminder.title ? { title } : {};
  if (command.when === undefined) {
    if (!newTitle.title) return problem({ kind: 'nothing-to-change', title: reminder.title });
    return ready({ kind: 'update-reminder', reminder, changes: newTitle });
  }
  const base = { at: reminder.scheduledAt, hasTime: true };
  const build = (at: number): Action => ({
    kind: 'update-reminder',
    reminder,
    changes: { ...newTitle, scheduledAt: at },
  });
  const time = readWhen(command, command.when, 'reminder', now, base, (at) => build(at));
  return 'kind' in time ? time : ready(build(time.at));
}

type Found = { item: Item; command: TargetCommand };

function findTarget(
  command: TargetCommand,
  snapshot: Snapshot,
  context: ResolveContext,
): Found | Resolution {
  const entity = entityOf(command);
  const items: readonly Item[] = entity === 'task' ? snapshot.tasks : snapshot.reminders;

  if (context.targetId !== undefined) {
    const item = items.find(({ id }) => id === context.targetId);
    return item
      ? { item, command }
      : problem({ kind: 'not-found', entity, target: command.target || 'that' });
  }

  const target = command.target.trim();
  const { focus } = context;
  if (PRONOUN_TARGET.test(target) && focus && (focus.entity === entity || command.impliedEntity)) {
    const item = findById(snapshot, focus.entity, focus.id);
    const switched = focus.entity === entity ? command : switchEntity(command);
    if (item && switched) return { item, command: switched };
  }

  const pool = poolFor(command, items, context.now);
  if (PRONOUN_TARGET.test(target) || isBlankQuery(target)) {
    if (pool.length === 1) return { item: pool[0], command };
    if (pool.length === 0) return problem({ kind: 'none', entity, which: poolWords(command) });
    return pick(command, pool, `Which ${entity}?`, context.now);
  }

  const matches = matchTitle(target, pool);
  if (matches.exact.length === 1) return { item: matches.exact[0], command };
  if (matches.strong.length === 1) return { item: matches.strong[0], command };
  if (matches.strong.length > 1) {
    return pick(command, matches.strong, `Which ${entity} do you mean?`, context.now);
  }
  if (matches.weak.length > 0) {
    const prompt =
      matches.weak.length === 1
        ? `Did you mean "${matches.weak[0].title}"?`
        : 'Did you mean one of these?';
    return pick(command, matches.weak, prompt, context.now);
  }

  // Honest about matches outside the pool: "'Study' is already done."
  const anywhere = matchTitle(target, items);
  const outside = anywhere.exact[0] ?? anywhere.strong[0];
  if (outside) {
    const state =
      entity === 'task'
        ? (outside as Task).status === 'done'
          ? 'done'
          : 'not done'
        : STATE_WORDS[(outside as Reminder).status];
    return problem({ kind: 'already', entity, title: outside.title, state });
  }

  if (command.impliedEntity) {
    const other = switchEntity(command);
    if (other) {
      const found = findTarget(other, snapshot, { ...context, focus: null });
      if (!('kind' in found) || found.kind === 'ask') return found;
    }
  }
  return problem({ kind: 'not-found', entity, target });
}

// The items a command can act on: you complete pending tasks and cancel scheduled reminders.
function poolFor(command: TargetCommand, items: readonly Item[], now: number): Item[] {
  const pool = items.filter((item) => {
    switch (command.kind) {
      case 'complete-task':
        return (item as Task).status === 'pending';
      case 'reopen-task':
        return (item as Task).status === 'done';
      case 'complete-reminder':
      case 'dismiss-reminder':
      case 'cancel-reminder':
      case 'edit-reminder':
        return (item as Reminder).status === 'scheduled';
      default:
        return true;
    }
  });
  return pool.sort((a, b) => soonest(a, now) - soonest(b, now) || b.id - a.id);
}

function poolWords(command: TargetCommand): string {
  switch (command.kind) {
    case 'complete-task':
      return 'pending tasks';
    case 'reopen-task':
      return 'finished tasks';
    case 'delete-task':
    case 'edit-task':
      return 'tasks';
    case 'delete-reminder':
      return 'reminders';
    default:
      return 'scheduled reminders';
  }
}

function pick(
  command: TargetCommand,
  items: readonly Item[],
  prompt: string,
  now: number,
): Resolution {
  const entity = entityOf(command);
  const options: PickOption[] = items.slice(0, MAX_OPTIONS).map((item) => ({
    entity,
    id: item.id,
    label: item.title,
    detail: describeItem(entity, item, now),
  }));
  const deleting = command.kind === 'delete-task' || command.kind === 'delete-reminder';
  return { kind: 'ask', question: { kind: 'pick', prompt, command, options, deleting } };
}

function describeItem(entity: Entity, item: Item, now: number): string {
  if (entity === 'reminder') return capitalize(reminderWhen(item as Reminder, now));
  const task = item as Task;
  if (task.status === 'done') return 'Done';
  return task.dueAt === null ? 'No date' : `Due ${formatWhen(task.dueAt, task.dueHasTime, now)}`;
}

/**
 * Reads a time phrase for an action. Returns the time, or the question or problem
 * to return instead: an unreadable phrase, a time that has passed, or "what time?".
 */
function readWhen(
  command: Command,
  when: string,
  purpose: WhenPurpose,
  now: number,
  base: { at: number; hasTime: boolean } | null,
  build: (at: number, hasTime: boolean) => Action,
): { at: number; hasTime: boolean } | Resolution {
  const parts = parseWhen(when, { loose: true });
  if (!parts) {
    return purpose === 'task'
      ? askFor(
          command,
          'when',
          `I couldn't read "${when.trim()}" as a date. When is it due?`,
          DUE_SUGGESTIONS,
        )
      : askFor(
          command,
          'when',
          `I couldn't read "${when.trim()}" as a time. When should I remind you?`,
          REMINDER_TIME_SUGGESTIONS,
        );
  }
  const resolved = resolveWhen(parts, { now, purpose, base });
  switch (resolved.kind) {
    case 'ok':
      return { at: resolved.at, hasTime: resolved.hasTime };
    case 'passed':
      if (resolved.suggestion === null) return problem({ kind: 'time-passed', when: when.trim() });
      return {
        kind: 'ask',
        question: {
          kind: 'confirm',
          prompt: `That time has already passed today. Did you mean ${formatWhen(resolved.suggestion, true, now)}?`,
          action: build(resolved.suggestion, true),
          yesLabel: 'Yes, tomorrow',
          noLabel: 'No',
        },
      };
    case 'needs-time':
      return askFor(command, 'when', 'What time today?', TODAY_TIME_SUGGESTIONS);
    case 'invalid':
      return problem({ kind: 'bad-time', when: when.trim() });
  }
}

function askFor(
  command: Command,
  field: 'title' | 'when' | 'text',
  prompt: string,
  suggestions: string[],
): Resolution {
  return { kind: 'ask', question: { kind: 'fill', prompt, command, field, suggestions } };
}

function ready(action: Action): Resolution {
  return { kind: 'ready', action };
}

function problem(value: Problem): Resolution {
  return { kind: 'problem', problem: value };
}

function entityOf(command: TargetCommand): Entity {
  return command.kind.endsWith('-task') ? 'task' : 'reminder';
}

// The same request about the other kind of item, for when the user didn't say which.
function switchEntity(command: TargetCommand): TargetCommand | null {
  const { target } = command;
  switch (command.kind) {
    case 'complete-task':
      return { kind: 'complete-reminder', target };
    case 'complete-reminder':
      return { kind: 'complete-task', target };
    case 'delete-task':
      return { kind: 'delete-reminder', target };
    case 'delete-reminder':
      return { kind: 'delete-task', target };
    case 'edit-task':
      return command.priority || command.notes !== undefined
        ? null
        : { kind: 'edit-reminder', target, title: command.title, when: command.when };
    case 'edit-reminder':
      return { kind: 'edit-task', target, title: command.title, when: command.when };
    default:
      return null;
  }
}

function findById(snapshot: Snapshot, entity: Entity, id: number): Item | null {
  const items: readonly Item[] = entity === 'task' ? snapshot.tasks : snapshot.reminders;
  return items.find((item) => item.id === id) ?? null;
}

// "review it" → "review "Finish my assignment"".
function mentionsIt(title: string): boolean {
  return /\bit\b/i.test(title) || /\b(?:that|this)$/i.test(title);
}

function replaceIt(title: string, focusTitle: string): string {
  const quoted = `"${focusTitle}"`;
  return /\bit\b/i.test(title)
    ? title.replace(/\bit\b/i, quoted)
    : title.replace(/\b(?:that|this)$/i, quoted);
}

function dayWords(when: string): string {
  return when
    .trim()
    .toLowerCase()
    .replace(/^(?:for|due|on|by)\s+/, '');
}

function soonest(item: Item, now: number): number {
  if ('scheduledAt' in item) return Math.abs(item.scheduledAt - now);
  return item.dueAt === null ? Number.MAX_SAFE_INTEGER : Math.abs(item.dueAt - now);
}

const byDeadline = (a: Task, b: Task) =>
  (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER) || b.id - a.id;

const byLastDone = (a: Task, b: Task) => (b.completedAt ?? 0) - (a.completedAt ?? 0) || b.id - a.id;
