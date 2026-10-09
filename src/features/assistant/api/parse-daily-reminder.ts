import { isRecurring, type DayPart } from '@/utils/parse-when';

import type { Command } from '../types';
import { parseCommandRules } from './parse-command-rules';
import { parseQuickAdd } from './parse-quick-add';

// "every day", "everyday", "daily", "each morning", "every night" …
const DAILY =
  /\b(?:every ?day|each day|every single day|daily|(?:every|each) (morning|afternoon|evening|night))\b/i;

// Said as a part of today, the time words read like any other: "every morning at 8"
// becomes "this morning at 8", which the time parser knows is 8 AM.
const PART_OF_TODAY: Record<DayPart, string> = {
  morning: 'this morning',
  afternoon: 'this afternoon',
  evening: 'this evening',
  night: 'tonight',
};

/**
 * Reads a reminder that repeats every day: "Remind me to take my medicine every day
 * at 8 AM", "Remind me every morning at 8 to stretch", "Take my vitamins daily at
 * 9pm". Returns an add-reminder command with `repeat: 'daily'` and the time words,
 * or null when the message isn't one reminder or repeats on another schedule
 * ("every Monday", "every 2 hours"), which stay unsupported.
 */
export function parseDailyReminder(text: string): Command | null {
  const match = DAILY.exec(text);
  if (!match) return null;
  const part = match[1]?.toLowerCase() as DayPart | undefined;
  const sentence = [
    text.slice(0, match.index),
    part ? PART_OF_TODAY[part] : '',
    text.slice(match.index + match[0].length),
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (isRecurring(sentence)) return null;

  const commands = parseCommandRules(sentence);
  if (commands) {
    const [only] = commands;
    return commands.length === 1 && only.kind === 'add-reminder'
      ? { ...only, repeat: 'daily' }
      : null;
  }
  // A bare to-do that repeats is a daily reminder: "Take my medicine every day at 8 AM".
  const todo = parseQuickAdd(sentence);
  if (todo?.kind !== 'add-task') return null;
  return {
    kind: 'add-reminder',
    title: todo.title,
    ...(todo.when ? { when: todo.when } : {}),
    repeat: 'daily',
  };
}
