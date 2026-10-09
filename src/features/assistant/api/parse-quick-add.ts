import { parseWhen, splitLeadingWhen, splitTrailingWhen } from '@/utils/parse-when';

import type { Command } from '../types';
import { splitTrailingPriority, tidySentence, tidyWhen } from './parse-command-rules';

// Verbs a to-do starts with. Verbs that change saved items ("move", "cancel",
// "mark", "add") are left out, so those requests reach the rules or the model.
const TODO_VERBS = new Set([
  'ask',
  'attend',
  'bake',
  'book',
  'bring',
  'buy',
  'call',
  'charge',
  'check',
  'clean',
  'collect',
  'confirm',
  'contact',
  'cook',
  'deliver',
  'deposit',
  'do',
  'donate',
  'draft',
  'drink',
  'drop',
  'email',
  'e-mail',
  'exercise',
  'feed',
  'fetch',
  'file',
  'fill',
  'fix',
  'follow',
  'get',
  'give',
  'go',
  'grab',
  'hand',
  'invite',
  'iron',
  'join',
  'leave',
  'mail',
  'make',
  'meet',
  'message',
  'order',
  'organize',
  'pack',
  'pay',
  'phone',
  'pick',
  'plan',
  'practice',
  'prepare',
  'print',
  'read',
  'refill',
  'register',
  'renew',
  'repair',
  'reply',
  'reserve',
  'return',
  'review',
  'schedule',
  'see',
  'sell',
  'send',
  'sign',
  'study',
  'submit',
  'take',
  'talk',
  'tell',
  'text',
  'thank',
  'throw',
  'tidy',
  'transfer',
  'visit',
  'vote',
  'walk',
  'wash',
  'watch',
  'water',
  'wish',
  'write',
]);

// These also mean ticking off a saved task, so they read as a new one only with a date.
const DATED_TODO_VERBS = new Set(['complete', 'finish']);

// Things that happen at a time. With a date or time they read as a to-do:
// "Meeting with Carlo Monday 10am", "Dentist appointment Friday at 2".
const EVENTS = [
  'anniversary',
  'appointment',
  'bill',
  'birthday',
  'breakfast',
  'brunch',
  'checkup',
  'check-up',
  'class',
  'concert',
  'conference',
  'consultation',
  'date',
  'deadline',
  'demo',
  'dentist',
  'dinner',
  'doctor',
  'exam',
  'flight',
  'game',
  'graduation',
  'gym',
  'haircut',
  'interview',
  'lecture',
  'lesson',
  'lunch',
  'match',
  'meeting',
  'meetup',
  'party',
  'payment',
  'practice',
  'presentation',
  'quiz',
  'rehearsal',
  'reunion',
  'review',
  'seminar',
  'session',
  'shift',
  'standup',
  'surgery',
  'test',
  'therapy',
  'training',
  'trip',
  'wedding',
  'webinar',
  'workout',
  'workshop',
];
// Up to two words before the event ("Team", "Doctor's"), then nothing or a
// preposition: "Team meeting", "Lunch with Ana". "The meeting moved to …" doesn't fit.
const EVENT_TITLE = new RegExp(
  `^(?:(?:the|a|an|my|our)\\s+)?(?:\\S+\\s+){0,2}?(?:${EVENTS.join('|')})s?(?:\\s+(?:with|at|for|about|on|in|of|to|from)\\b.*)?$`,
  'i',
);

const TODO_LEAD = /^(?:(?:don't|do not) forget to\s+|remember to\s+|(?:to-?do|task)\s*[:–-]\s*)/i;
const QUESTION_START =
  /^(?:what|when|where|who|whose|why|how|which|is|are|am|was|were|do|does|did|can|could|would|will|should|shall)\b/i;
// About saved items ("finish my React task", "take it off my list").
const ABOUT_ITEMS =
  /\b(?:tasks?|to-?dos?|reminders?|remind)\b|\b(?:on|to|off|from) (?:my|the) list\b|\bmy (?:schedule|agenda|calendar)\b/i;
// About the item just mentioned: "finish it".
const ONLY_A_PRONOUN = /^\S+\s+(?:it|that|this|them|these|those)$/i;
// Asking Pinsan for something: "tell me a joke", "give me a summary".
const ASKS_PINSAN = /^\S+\s+me\b/i;
const SEVERAL_REQUESTS = /;|\.\s|\b(?:then|also)\b/i;
const MAX_TITLE_WORDS = 12;

/**
 * Reads a bare to-do sentence such as "Pay electric bill tomorrow 5pm" or "Buy
 * groceries": a to-do verb or an event, with an optional date or time at either end.
 * Returns an add-task command marked `quickAdd`, or null when the sentence isn't
 * clearly a to-do, so the model (when set up) decides what it means.
 */
export function parseQuickAdd(text: string): Command | null {
  // A question is never a to-do: "Pay the bill tomorrow?"
  if (/\?\s*$/.test(text)) return null;
  const sentence = tidySentence(text).replace(TODO_LEAD, '');
  if (!sentence || QUESTION_START.test(sentence)) return null;

  const { rest: undated, priority: endPriority } = splitTrailingPriority(sentence);
  const split = splitWhen(undated);
  const { rest, priority } = splitTrailingPriority(split.title);
  const title = rest.replace(/[\s,;:.-]+$/, '');
  if (
    !title ||
    title.split(/\s+/).length > MAX_TITLE_WORDS ||
    ABOUT_ITEMS.test(title) ||
    ONLY_A_PRONOUN.test(title) ||
    ASKS_PINSAN.test(title) ||
    SEVERAL_REQUESTS.test(title) ||
    mentionsTime(title) ||
    !readsAsTodo(title, split.when !== undefined)
  ) {
    return null;
  }

  const taskPriority = priority ?? endPriority;
  return {
    kind: 'add-task',
    title,
    ...(split.when ? { when: split.when } : {}),
    ...(taskPriority ? { priority: taskPriority } : {}),
    quickAdd: true,
  };
}

function readsAsTodo(title: string, dated: boolean): boolean {
  const words = title.split(/\s+/);
  const verb = words[0].toLowerCase().replace(/[^a-z-]/g, '');
  // A verb alone ("Check", "Go") needs a date to read as a to-do.
  if (TODO_VERBS.has(verb)) return words.length > 1 || dated;
  if (DATED_TODO_VERBS.has(verb)) return dated;
  return dated && EVENT_TITLE.test(title);
}

// A day or time left inside the title, which neither end could take:
// "Pay the bill tomorrow at the bank". "For 2" is more often people than a time.
function mentionsTime(title: string): boolean {
  const words = title.split(/\s+/);
  for (let start = 0; start < words.length; start++) {
    for (let end = start + 1; end <= Math.min(words.length, start + 4); end++) {
      const phrase = words.slice(start, end).join(' ');
      if (!/^for \d+$/i.test(phrase) && parseWhen(phrase)) return true;
    }
  }
  return false;
}

// The time words at the end, the start, or both: "Tomorrow call mom at 5pm".
function splitWhen(sentence: string): { title: string; when?: string } {
  const trailing = splitTrailingWhen(sentence);
  const rest = trailing ? trailing.rest : sentence;
  const leading = splitLeadingWhen(rest);
  if (leading && trailing) {
    const both = `${tidyWhen(leading.when)} ${tidyWhen(trailing.when)}`;
    return parseWhen(both)
      ? { title: leading.rest, when: both }
      : { title: rest, when: tidyWhen(trailing.when) };
  }
  if (leading) return { title: leading.rest, when: tidyWhen(leading.when) };
  if (trailing) return { title: trailing.rest, when: tidyWhen(trailing.when) };
  return { title: sentence };
}
