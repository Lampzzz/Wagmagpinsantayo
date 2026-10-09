import type { AlertOutcome, Reminder } from '@/features/reminders';
import type { Task } from '@/features/tasks';
import { capitalize } from '@/utils/capitalize';
import { formatRelative, formatWhen } from '@/utils/format-when';
import { calendarDaysBetween } from '@/utils/resolve-when';

import type {
  Action,
  AssistantReply,
  Command,
  Listing,
  Problem,
  Question,
  ReplyButton,
  ReplyItem,
  Step,
} from '../types';

const MAX_ITEMS = 8;
const MAX_SPOKEN_NAMES = 3;
// Reminders closer than this also say how long until they go off: "(in 5 minutes)".
const SOON_MS = 24 * 60 * 60 * 1000;

const EXAMPLES = 'Try "Remind me in 10 minutes to stretch" or "What tasks do I have today?"';

type Line = { text: string; speech: string };

type ReplyParts = {
  steps: readonly Step[];
  question: Question | null;
  /** Lines to say first, such as "I dropped the earlier question." */
  preface?: readonly string[];
  now: number;
};

/** Words the reply, line by line, from what actually happened. */
export function composeReply({ steps, question, preface = [], now }: ReplyParts): AssistantReply {
  const lines: Line[] = preface.map(same);
  const items: ReplyItem[] = [];
  const buttons = new Set<ReplyButton>();
  const notAttempted: Command[] = [];

  for (const step of steps) {
    switch (step.kind) {
      case 'ran': {
        lines.push(ranLine(step, now));
        const item = ranItem(step, now);
        if (item) items.push(item);
        if (step.outcome.kind === 'reminder-saved' && step.outcome.alert === 'no-permission') {
          buttons.add('open-settings');
        }
        break;
      }
      case 'listed':
        lines.push(listingLine(step.listing, now));
        items.push(...listingItems(step.listing, now));
        break;
      case 'problem':
        lines.push(same(problemText(step.problem)));
        break;
      case 'skipped':
        lines.push(same(skippedText(step.action)));
        break;
      case 'failed':
        lines.push(same(`Something went wrong, so I couldn't ${actionWords(step.action)}.`));
        break;
      case 'not-attempted':
        notAttempted.push(step.command);
        break;
    }
  }
  if (notAttempted.length > 0) {
    lines.push(same(`I didn't get to: ${notAttempted.map(commandWords).join('; ')}.`));
  }
  if (question) lines.push(same(question.prompt));

  const onlyTrouble = steps.every(
    (step) => step.kind === 'problem' || step.kind === 'failed' || step.kind === 'not-attempted',
  );
  return {
    text: lines.map((line) => line.text).join('\n'),
    speech: lines.map((line) => line.speech).join(' '),
    items,
    question,
    buttons: [...buttons],
    isError: steps.length > 0 && onlyTrouble && !question,
  };
}

/** A plain reply with no items or question. */
export function composeMessage(
  text: string,
  { buttons = [], isError = false }: { buttons?: ReplyButton[]; isError?: boolean } = {},
): AssistantReply {
  return { text, speech: text, items: [], question: null, buttons, isError };
}

export function composeNotUnderstood({
  preface = [],
  modelFailed,
  suggestSetup,
}: {
  preface?: readonly string[];
  modelFailed: boolean;
  suggestSetup: boolean;
}): AssistantReply {
  const lines = [
    ...preface,
    modelFailed ? "Sorry, I couldn't work that out." : "I'm not sure what you mean.",
    `I can add, change, finish or delete tasks, and set, move or cancel reminders. ${EXAMPLES}`,
  ];
  if (suggestSetup) {
    lines.push('Setting up on-device AI lets me understand more ways of saying things.');
  }
  return composeMessage(lines.join('\n'), {
    buttons: suggestSetup ? ['set-up-ai'] : [],
    isError: true,
  });
}

export function composeRecurring(preface: readonly string[] = []): AssistantReply {
  return composeMessage(
    [
      ...preface,
      'Repeating reminders aren\'t supported yet. I can set a one-time reminder instead, like "Remind me tomorrow at 8 AM to take my medicine".',
    ].join('\n'),
    { isError: true },
  );
}

function ranLine(step: Extract<Step, { kind: 'ran' }>, now: number): Line {
  const { action, outcome } = step;
  switch (outcome.kind) {
    case 'task-saved':
      return same(taskSavedText(action, outcome.task, step.remindersStillOn, now));
    case 'task-deleted':
      return same(
        `Deleted the task "${titleOf(action)}".${stillOnText(step.remindersStillOn, now)}`,
      );
    case 'reminder-saved':
      return same(reminderSavedText(action, outcome.reminder, outcome.alert, now));
    case 'reminder-closed': {
      const { title, status } = outcome.reminder;
      const done =
        status === 'completed'
          ? `Marked the reminder "${title}" as done.`
          : status === 'dismissed'
            ? `Dismissed the reminder "${title}".`
            : `Cancelled the reminder "${title}".`;
      return same(outcome.alertCleared ? done : `${done} Its alert may still go off.`);
    }
    case 'reminder-deleted':
      return same(
        `Deleted the reminder "${titleOf(action)}".${outcome.alertCleared ? '' : ' Its alert may still go off.'}`,
      );
  }
}

function taskSavedText(action: Action, task: Task, stillOn: readonly Reminder[], now: number) {
  switch (action.kind) {
    case 'create-task': {
      const due =
        task.dueAt === null ? '' : `, due ${formatWhen(task.dueAt, task.dueHasTime, now)}`;
      const priority = task.priority === 'high' ? ' It’s marked high priority.' : '';
      return `Added the task "${task.title}"${due}.${priority}`;
    }
    case 'set-task-done':
      return action.done
        ? `Marked "${task.title}" as done.${stillOnText(stillOn, now)}`
        : `Marked "${task.title}" as not done.`;
    case 'update-task': {
      const { changes } = action;
      const sentences: string[] = [];
      if (changes.title !== undefined) {
        sentences.push(`Renamed "${action.task.title}" to "${task.title}".`);
      }
      if (changes.dueAt !== undefined) {
        sentences.push(
          task.dueAt === null
            ? `Removed the deadline from "${task.title}".`
            : `"${task.title}" is now due ${formatWhen(task.dueAt, task.dueHasTime, now)}.`,
        );
      }
      if (changes.priority !== undefined) {
        sentences.push(`"${task.title}" is now ${task.priority} priority.`);
      }
      if (changes.description !== undefined) {
        sentences.push(
          task.description
            ? `Updated the notes on "${task.title}".`
            : `Cleared the notes on "${task.title}".`,
        );
      }
      return sentences.join(' ') || `Updated "${task.title}".`;
    }
    default:
      return `Saved "${task.title}".`;
  }
}

function reminderSavedText(action: Action, reminder: Reminder, alert: AlertOutcome, now: number) {
  const when = formatWhen(reminder.scheduledAt, true, now);
  const untilIt = reminder.scheduledAt - now;
  const soon =
    untilIt > 0 && untilIt < SOON_MS ? ` (${formatRelative(reminder.scheduledAt, now)})` : '';
  const noAlert =
    alert === 'no-permission'
      ? "Notifications are off, so it can't alert you."
      : alert === 'failed'
        ? "I couldn't schedule its alert, so I'll try again next time you open the app."
        : '';

  if (action.kind === 'create-reminder') {
    const saved = `I saved the reminder "${reminder.title}" for ${when}`;
    if (alert === 'no-permission') {
      return `${saved}, but notifications are off, so it can't alert you.`;
    }
    if (alert === 'failed') {
      return `${saved}, but couldn't schedule its alert. I'll try again next time you open the app.`;
    }
    if (alert === 'none') return `${saved}, but that time has already passed.`;
    return `Reminder set for ${when}${soon}: ${reminder.title}.`;
  }

  const sentences: string[] = [];
  if (action.kind === 'update-reminder') {
    if (action.changes.title !== undefined) {
      sentences.push(`Renamed the reminder "${action.reminder.title}" to "${reminder.title}".`);
    }
    if (action.changes.scheduledAt !== undefined) {
      sentences.push(`Moved "${reminder.title}" to ${when}${soon}.`);
    }
  }
  if (sentences.length === 0) sentences.push(`Updated the reminder "${reminder.title}".`);
  if (noAlert) sentences.push(noAlert);
  return sentences.join(' ');
}

function stillOnText(reminders: readonly Reminder[], now: number): string {
  if (reminders.length === 0) return '';
  if (reminders.length === 1) {
    return ` Its reminder for ${formatWhen(reminders[0].scheduledAt, true, now)} is still on.`;
  }
  return ` Its ${reminders.length} reminders are still on.`;
}

function listingLine(listing: Listing, now: number): Line {
  if (listing.entity === 'task' && listing.summary) return summaryLine(listing.tasks, now);
  const records: readonly (Task | Reminder)[] =
    listing.entity === 'task' ? listing.tasks : listing.reminders;
  const count = records.length;
  const phrase = [
    listing.adjective,
    count === 1 ? listing.entity : `${listing.entity}s`,
    listing.qualifier,
  ]
    .filter(Boolean)
    .join(' ');
  if (count === 0) return same(`You have no ${phrase}.`);

  const names = records.slice(0, MAX_SPOKEN_NAMES).map((record) => `"${record.title}"`);
  const more = count > MAX_SPOKEN_NAMES ? `, and ${count - MAX_SPOKEN_NAMES} more` : '';
  const shown = count > MAX_ITEMS ? ` Here are the first ${MAX_ITEMS}.` : '';
  return {
    text: `You have ${count} ${phrase}:${shown}`,
    speech: `You have ${count} ${phrase}: ${joinWords(names)}${more}.`,
  };
}

function summaryLine(tasks: readonly Task[], now: number): Line {
  if (tasks.length === 0) return same('You have no open tasks.');
  let overdue = 0;
  let today = 0;
  let later = 0;
  let undated = 0;
  for (const task of tasks) {
    if (task.dueAt === null) undated++;
    else if (task.dueAt < now) overdue++;
    else if (calendarDaysBetween(now, task.dueAt) === 0) today++;
    else later++;
  }
  const parts = [
    overdue && `${overdue} overdue`,
    today && `${today} due today`,
    later && `${later} due later`,
    undated && `${undated} with no date`,
  ].filter((part): part is string => Boolean(part));
  const noun = tasks.length === 1 ? 'task' : 'tasks';
  let text = `You have ${tasks.length} open ${noun}: ${joinWords(parts)}.`;
  const next = tasks
    .filter((task) => task.dueAt !== null)
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))[0];
  if (next && next.dueAt !== null) {
    text += ` Next up: "${next.title}", due ${formatWhen(next.dueAt, next.dueHasTime, now)}.`;
  }
  return same(text);
}

function listingItems(listing: Listing, now: number): ReplyItem[] {
  if (listing.entity === 'task') {
    if (listing.summary) return [];
    const single = listing.tasks.length === 1;
    return listing.tasks.slice(0, MAX_ITEMS).map((task) => taskItem(task, now, single));
  }
  return listing.reminders.slice(0, MAX_ITEMS).map((reminder) => reminderItem(reminder, now));
}

function ranItem(step: Extract<Step, { kind: 'ran' }>, now: number): ReplyItem | null {
  const { outcome } = step;
  switch (outcome.kind) {
    case 'task-saved':
      return taskItem(outcome.task, now, false);
    case 'reminder-saved':
    case 'reminder-closed':
      return reminderItem(outcome.reminder, now);
    default:
      return null;
  }
}

function taskItem(task: Task, now: number, withNotes: boolean): ReplyItem {
  const parts: string[] = [];
  if (task.status === 'done') parts.push('Done');
  else if (task.dueAt === null) parts.push('No date');
  else {
    const due = `Due ${formatWhen(task.dueAt, task.dueHasTime, now)}`;
    parts.push(task.dueAt < now ? `Overdue · ${due}` : due);
  }
  if (task.priority === 'high') parts.push('High priority');
  if (withNotes && task.description) parts.push(task.description);
  return { entity: 'task', id: task.id, title: task.title, detail: parts.join(' · ') };
}

function reminderItem(reminder: Reminder, now: number): ReplyItem {
  const parts = [capitalize(formatWhen(reminder.scheduledAt, true, now))];
  if (reminder.status === 'scheduled' && reminder.scheduledAt <= now) parts.push('Past due');
  if (reminder.status === 'completed') parts.push('Done');
  if (reminder.status === 'dismissed') parts.push('Dismissed');
  if (reminder.status === 'cancelled') parts.push('Cancelled');
  return { entity: 'reminder', id: reminder.id, title: reminder.title, detail: parts.join(' · ') };
}

function problemText(problem: Problem): string {
  switch (problem.kind) {
    case 'not-found':
      return `I couldn't find a ${problem.entity} matching "${problem.target}".`;
    case 'none':
      return `You don't have any ${problem.which}.`;
    case 'already':
      if (problem.entity === 'task') {
        return problem.state === 'done'
          ? `"${problem.title}" is already done.`
          : `"${problem.title}" isn't marked done.`;
      }
      return `The reminder "${problem.title}" is already ${problem.state}.`;
    case 'time-passed':
      return `"${problem.when}" has already passed.`;
    case 'bad-time':
      return `I can't use "${problem.when}" as a time for that.`;
    case 'nothing-to-change':
      return `I'm not sure what to change about "${problem.title}".`;
  }
}

function skippedText(action: Action): string {
  switch (action.kind) {
    case 'create-task':
    case 'create-reminder':
      return `Okay, I didn't add "${titleOf(action)}".`;
    case 'delete-task':
    case 'delete-reminder':
      return `Okay, I kept "${titleOf(action)}".`;
    default:
      return `Okay, I left "${titleOf(action)}" as it was.`;
  }
}

function actionWords(action: Action): string {
  const title = `"${titleOf(action)}"`;
  switch (action.kind) {
    case 'create-task':
      return `add the task ${title}`;
    case 'update-task':
      return `change ${title}`;
    case 'set-task-done':
      return action.done ? `mark ${title} as done` : `mark ${title} as not done`;
    case 'delete-task':
      return `delete ${title}`;
    case 'create-reminder':
      return `set the reminder ${title}`;
    case 'update-reminder':
      return `change the reminder ${title}`;
    case 'close-reminder':
      return action.status === 'completed'
        ? `mark ${title} as done`
        : action.status === 'dismissed'
          ? `dismiss ${title}`
          : `cancel ${title}`;
    case 'delete-reminder':
      return `delete the reminder ${title}`;
  }
}

function commandWords(command: Command): string {
  switch (command.kind) {
    case 'add-task':
      return `add "${command.title}"`;
    case 'add-reminder':
      return command.title ? `set a reminder to ${command.title}` : 'set the reminder';
    case 'list-tasks':
      return 'list your tasks';
    case 'list-reminders':
      return 'list your reminders';
    case 'complete-task':
    case 'complete-reminder':
      return `mark "${command.target}" as done`;
    case 'reopen-task':
      return `reopen "${command.target}"`;
    case 'delete-task':
    case 'delete-reminder':
      return `delete "${command.target}"`;
    case 'dismiss-reminder':
      return `dismiss "${command.target}"`;
    case 'cancel-reminder':
      return `cancel "${command.target}"`;
    case 'edit-task':
    case 'edit-reminder':
      return `change "${command.target}"`;
  }
}

function titleOf(action: Action): string {
  switch (action.kind) {
    case 'create-task':
    case 'update-task':
    case 'set-task-done':
    case 'delete-task':
      return action.task.title;
    default:
      return action.reminder.title;
  }
}

// "a", "a and b", "a, b and c".
function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function same(text: string): Line {
  return { text, speech: text };
}
