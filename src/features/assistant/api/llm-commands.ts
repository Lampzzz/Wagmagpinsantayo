import type { TaskPriority } from '@/features/tasks';
import { normalizeWhenText, parseWhen } from '@/utils/parse-when';

import type { Command, ModelReading, ReminderListStatus, TaskListStatus } from '../types';

const MAX_ACTIONS = 5;
// A chat answer has to fit in Pinsan's speech bubble.
const MAX_REPLY_LENGTH = 200;
// The longest time phrase looked for in a sentence: "tomorrow at 5:30 in the morning".
const MAX_TIME_WORDS = 6;
// A chat answer made mostly of the user's own words only says them back.
const ECHO_SHARE = 0.75;

/**
 * Instructions for the on-device model. Kept short because every request loads
 * the model and reads them again. The rules already handle the usual wordings,
 * so the examples are paraphrases. Examples that answer with words the user never
 * said are rejected by `toReading`, so a copied example can't become a task.
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
say: text

Rules:
- "remind me", "don't let me forget", "wake me up", "alarm", "ping me" and "alert me" mean add_reminder. Other to-dos are add_task.
- A question about what is due or planned means list_tasks and list_reminders.
- Saying a to-do is already done means complete_task.
- when: copy the user's time words exactly, like "tomorrow at 8 am" or "in 2 hours". Never work out dates.
- title: what to do, in the user's words, without the time words.
- target: the user's words that name an existing item, or "it".
- priority: "high", "normal" or "low", only when the user says how important it is.
- One action for each thing asked, in order.
- If the user is only chatting, reply with one say action: a short, friendly answer as Pinsan. Never say you did or saved anything.

Examples:
I've got to return the library books on Friday, put that on my list
{"actions":[{"do":"add_task","title":"return the library books","when":"on Friday"}]}
Don't let me forget to call Ana tonight
{"actions":[{"do":"add_reminder","title":"call Ana","when":"tonight"}]}
Anything planned for Thursday?
{"actions":[{"do":"list_tasks","when":"Thursday"},{"do":"list_reminders","when":"Thursday"}]}
I already sent the slides
{"actions":[{"do":"complete_task","target":"slides"}]}
Push the dentist reminder to Monday at 9
{"actions":[{"do":"edit_reminder","target":"dentist","when":"Monday at 9"}]}
Add the car wash and ping me at 4 about it
{"actions":[{"do":"add_task","title":"the car wash"},{"do":"add_reminder","title":"","when":"at 4"}]}
I had a rough day at work
{"actions":[{"do":"say","text":"I'm sorry to hear that. I'm here for you, so take it easy tonight."}]}
What's the weather like?
{"actions":[{"do":"say","text":"I can't check the weather, but I can keep track of your tasks and reminders."}]}`;

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

// "it" names the item just mentioned, whatever the user called it.
const PRONOUN = /^(?:it|that|this|them)$/i;
// The user said how important it is. Otherwise a priority from the model is dropped.
const SAYS_PRIORITY = /\b(?:urgent|important|priority|asap|high|low|top|critical)\b/i;
// A chat answer can't say Pinsan did something: nothing was done.
const CLAIMS_ACTION =
  /\b(?:i'?ve|i have|i'?ll|i will|i just)\s+(?:\w+\s+)?(?:added|saved|set|scheduled|created|deleted|removed|marked|moved|updated|changed|cancell?ed|noted|put|remind(?:ed)?)\b|\b(?:is|are|has been|have been)\s+(?:added|saved|set|scheduled|created|deleted|removed|done)\b/i;

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
  return (value: unknown): value is ModelReply => toReading(value, utterance) !== null;
}

/**
 * Checks the model's reply and reads it: the commands in it, or Pinsan's chat answer
 * when there are none. Returns null when anything is off — an unknown action, a missing
 * field, or an item or title the user never mentioned — because a partly garbled reply
 * means the sentence was misread. A time the model reworded is looked up in the sentence
 * instead, and a priority or notes the user never gave are left out.
 */
export function toReading(value: unknown, utterance: string): ModelReading | null {
  if (!isRecord(value) || !Array.isArray(value.actions)) return null;
  if (value.actions.length > MAX_ACTIONS) return null;
  const said = new Set(wordsOf(utterance));
  const impliedEntity = !/\b(?:tasks?|to-?dos?|reminders?|remind)\b/i.test(utterance);

  const commands: Command[] = [];
  let reply: string | null = null;
  for (const raw of value.actions) {
    if (isRecord(raw) && raw.do === 'say') {
      reply ??= chatAnswer(raw.text, said);
      continue;
    }
    const command = toCommand(raw, utterance, said, impliedEntity);
    if (!command) return null;
    commands.push(command);
  }
  // Pinsan chats only when nothing was asked.
  return { commands, reply: commands.length === 0 ? reply : null };
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
  const { title } = fields;
  // A title the user never said is made up, often copied from the examples.
  if (title && saidPart(title, said) === null) return null;
  // "7 PM" for "at 7 tonight": the user's own time words are used instead.
  const when =
    fields.when === undefined || wasSaid(fields.when, said) ? fields.when : findWhen(utterance);
  const target = fields.target === undefined ? undefined : saidPart(fields.target, said);
  if (target === null) return null;
  const notes =
    fields.notes !== undefined && saidPart(fields.notes, said) !== null ? fields.notes : undefined;
  const rawPriority = fields.priority === undefined ? undefined : toPriority(fields.priority);
  if (rawPriority === null) return null;
  const priority = SAYS_PRIORITY.test(utterance) ? rawPriority : undefined;

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

// Pinsan's answer to chatting, if it fits the bubble, doesn't claim anything was done and
// doesn't just say the user's words back ("The weather is nice today" for the same).
function chatAnswer(text: unknown, said: Set<string>): string | null {
  if (typeof text !== 'string') return null;
  const answer = text.replace(/\s+/g, ' ').trim();
  if (!answer || answer.length > MAX_REPLY_LENGTH || CLAIMS_ACTION.test(answer)) return null;
  const words = wordsOf(answer).filter((word) => !LOOSE_WORDS.has(word));
  const echoed = words.filter((word) => said.has(word)).length;
  return echoed >= words.length * ECHO_SHARE ? null : answer;
}

// Every meaningful word of `phrase` must come from the user, so the model can't invent a time.
function wasSaid(phrase: string, said: Set<string>): boolean {
  return wordsOf(phrase).every((word) => LOOSE_WORDS.has(word) || said.has(word));
}

/**
 * The words of `phrase` the user said, when they said at least half of the ones that
 * matter: "buy milk" for "I don't need the milk task anymore" is "milk". Null otherwise.
 */
function saidPart(phrase: string, said: Set<string>): string | null {
  const text = phrase.trim();
  if (PRONOUN.test(text)) return text;
  const kept: string[] = [];
  let meaningful = 0;
  let heard = 0;
  for (const token of text.split(/\s+/)) {
    const words = wordsOf(token);
    const wasHeard = words.every((word) => LOOSE_WORDS.has(word) || said.has(word));
    if (!words.every((word) => LOOSE_WORDS.has(word))) {
      meaningful++;
      if (wasHeard) heard++;
    }
    if (wasHeard) kept.push(token);
  }
  return meaningful > 0 && heard * 2 >= meaningful ? kept.join(' ') : null;
}

// The time words in the user's sentence: the longest phrase the time parser reads.
// "For 2" is more often people than a time.
function findWhen(utterance: string): string | undefined {
  const words = utterance
    .replace(/[,;!?]|\.(?=\s|$)/g, ' ')
    .trim()
    .split(/\s+/);
  for (let size = Math.min(MAX_TIME_WORDS, words.length); size > 0; size--) {
    for (let start = 0; start + size <= words.length; start++) {
      const phrase = words.slice(start, start + size).join(' ');
      if (!/^for \d+$/i.test(phrase) && parseWhen(phrase)) return phrase;
    }
  }
  return undefined;
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
