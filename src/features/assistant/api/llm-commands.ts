import type { TaskPriority } from '@/features/tasks';
import { normalizeWhenText } from '@/utils/parse-when';

import type { Command, ReminderListStatus, TaskListStatus } from '../types';

const MAX_ACTIONS = 5;

/**
 * Instructions for the on-device model. Kept short because every request loads
 * the model and reads them again. The rules already handle the usual wordings,
 * so the examples are paraphrases.
 */
export const LLM_SYSTEM_PROMPT = `You turn a request about tasks and reminders into actions.
Reply with one JSON object and nothing else: {"actions": [...]}

Actions and their fields:
add_task: title, when?, priority?, notes?
add_reminder: title, when
list_tasks: when?, target?
list_reminders: when?, target?
complete_task: target
delete_task: target
edit_task: target, title?, when?, priority?, notes?
complete_reminder: target
cancel_reminder: target
delete_reminder: target
edit_reminder: target, title?, when?

Rules:
- "remind me", "alert me" and "reminder" mean reminder actions. Other to-dos are tasks.
- when: copy the user's time words exactly, like "tomorrow at 8 am" or "in 2 hours". Never work out dates.
- title: what to do, in the user's words, without the time words.
- target: the user's words that name an existing item, or "it".
- priority: "high", "normal" or "low".
- One action for each thing asked, in order. If nothing is about tasks or reminders, reply {"actions": []}.

Examples:
I need to pick up the dry cleaning on Friday, put that on my list
{"actions":[{"do":"add_task","title":"pick up the dry cleaning","when":"on Friday"}]}
Don't let me forget to call Ana tonight
{"actions":[{"do":"add_reminder","title":"call Ana","when":"tonight"}]}
I'm done with the slides
{"actions":[{"do":"complete_task","target":"slides"}]}
Push the dentist reminder to Monday at 9
{"actions":[{"do":"edit_reminder","target":"dentist","when":"Monday at 9"}]}
Add buy milk and ping me at 6 about it
{"actions":[{"do":"add_task","title":"buy milk"},{"do":"add_reminder","title":"","when":"at 6"}]}
What's the weather like?
{"actions":[]}`;

// Small words the model may add or drop without changing which time or item is meant.
const LOOSE_WORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'my',
  'of',
  'on',
  'the',
  'to',
  'with',
  'your',
]);

export type ModelReply = { actions: unknown[] };

type Fields = {
  title?: string;
  when?: string;
  target?: string;
  priority?: string;
  notes?: string;
};

/** A check for `generateJson`, so a reply that can't be used gets the one retry. */
export function isModelReplyFor(utterance: string) {
  return (value: unknown): value is ModelReply => toCommands(value, utterance) !== null;
}

/**
 * Checks the model's reply and turns it into commands. Returns null when anything
 * is off — an unknown action, a missing field, or a time or item the user never
 * mentioned — because a partly garbled reply means the sentence was misread.
 */
export function toCommands(value: unknown, utterance: string): Command[] | null {
  if (!isRecord(value) || !Array.isArray(value.actions)) return null;
  if (value.actions.length > MAX_ACTIONS) return null;
  const said = new Set(wordsOf(utterance));
  const impliedEntity = !/\b(?:tasks?|to-?dos?|reminders?|remind)\b/i.test(utterance);

  const commands: Command[] = [];
  for (const raw of value.actions) {
    const command = toCommand(raw, utterance, said, impliedEntity);
    if (!command) return null;
    commands.push(command);
  }
  return commands;
}

function toCommand(
  raw: unknown,
  utterance: string,
  said: Set<string>,
  impliedEntity: boolean,
): Command | null {
  if (!isRecord(raw) || typeof raw.do !== 'string') return null;
  const fields = readFields(raw);
  if (!fields) return null;
  const { title, when, target, notes } = fields;
  if (when !== undefined && !wasSaid(when, said)) return null;
  if (target !== undefined && !wasSaid(target, said)) return null;
  const priority = fields.priority === undefined ? undefined : toPriority(fields.priority);
  if (priority === null) return null;

  switch (raw.do) {
    case 'add_task':
      return title ? { kind: 'add-task', title, when, priority, notes } : null;
    case 'add_reminder':
      // An empty title means "it": the item just mentioned.
      return title !== undefined || when
        ? { kind: 'add-reminder', title: title ?? '', when }
        : null;
    case 'list_tasks':
      return { kind: 'list-tasks', status: taskStatus(utterance), when, search: target };
    case 'list_reminders':
      return { kind: 'list-reminders', status: reminderStatus(utterance), when, search: target };
    case 'complete_task':
      return target ? { kind: 'complete-task', target, impliedEntity } : null;
    case 'delete_task':
      return target ? { kind: 'delete-task', target, impliedEntity } : null;
    case 'edit_task':
      return target && (title || when || priority || notes !== undefined)
        ? { kind: 'edit-task', target, impliedEntity, title, when, priority, notes }
        : null;
    case 'complete_reminder':
      return target ? { kind: 'complete-reminder', target, impliedEntity } : null;
    case 'cancel_reminder':
      return target ? { kind: 'cancel-reminder', target, impliedEntity } : null;
    case 'delete_reminder':
      return target ? { kind: 'delete-reminder', target, impliedEntity } : null;
    case 'edit_reminder':
      return target && (title || when)
        ? { kind: 'edit-reminder', target, impliedEntity, title, when }
        : null;
    default:
      return null;
  }
}

// Optional string fields. Null and "" mean "not given", except an empty title.
function readFields(raw: Record<string, unknown>): Fields | null {
  const fields: Fields = {};
  for (const key of ['title', 'when', 'target', 'priority', 'notes'] as const) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed || key === 'title') fields[key] = trimmed;
  }
  return fields;
}

// Every meaningful word of `phrase` must come from the user, so the model can't invent a time.
function wasSaid(phrase: string, said: Set<string>): boolean {
  return wordsOf(phrase).every((word) => LOOSE_WORDS.has(word) || said.has(word));
}

function wordsOf(text: string): string[] {
  return normalizeWhenText(text)
    .replace(/[^a-z0-9:'-]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function toPriority(word: string): TaskPriority | null {
  switch (word.toLowerCase()) {
    case 'high':
    case 'urgent':
    case 'important':
    case 'top':
      return 'high';
    case 'normal':
    case 'medium':
      return 'normal';
    case 'low':
      return 'low';
    default:
      return null;
  }
}

function taskStatus(utterance: string): TaskListStatus {
  const text = utterance.toLowerCase();
  if (/\b(?:done|completed|finished)\b/.test(text)) return 'done';
  if (/\b(?:overdue|late)\b/.test(text)) return 'overdue';
  if (/\ball\b/.test(text) && !/\b(?:pending|open|left|need|still)\b/.test(text)) return 'all';
  return 'pending';
}

function reminderStatus(utterance: string): ReminderListStatus {
  const text = utterance.toLowerCase();
  if (/\b(?:past due|overdue|missed)\b/.test(text)) return 'past-due';
  if (/\ball\b/.test(text)) return 'all';
  return 'upcoming';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
