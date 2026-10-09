import type { AlertOutcome } from '@/features/reminders';
import { capitalize } from '@/utils/capitalize';
import { findNewFacts } from '@/utils/find-new-facts';
import { formatWhen } from '@/utils/format-when';
import { isRecurring, parseWhen, splitTrailingWhen } from '@/utils/parse-when';
import { resolveWhen } from '@/utils/resolve-when';

import type { TaskSuggestion } from './types';

/** What the AI answers when asked for a note's to-dos. `when` is the date words as written. */
export type TaskReply = { tasks: { title: string; when?: string | null }[] };

/** What saving the reviewed tasks did: how many were saved, and one entry per reminder set. */
export type SaveReport = { saved: number; alerts: AlertOutcome[] };

const MAX_TASKS = 20;
const NO_DUE = { dueAt: null, dueHasTime: false } as const;
// Words too common to show that a title came from the note.
const COMMON_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'about',
  'into',
  'that',
  'this',
  'these',
  'those',
  'your',
  'our',
  'their',
  'some',
  'get',
  'make',
  'need',
  'have',
  'take',
  'put',
]);

export function isTaskReply(value: unknown): value is TaskReply {
  if (typeof value !== 'object' || value === null) return false;
  const { tasks } = value as Record<string, unknown>;
  return Array.isArray(tasks) && tasks.every(isTaskItem);
}

/**
 * Turns the AI's reply into tasks to review. Code, not the AI, works out each due
 * date from the date words. Titles that aren't from the note are dropped, and so
 * are date words the note never mentions.
 */
export function toTaskSuggestions(reply: TaskReply, note: string, now: number): TaskSuggestion[] {
  const noteWords = [...new Set(wordsOf(note))];
  const seen = new Set<string>();
  const suggestions: TaskSuggestion[] = [];
  for (const task of reply.tasks) {
    let title = tidy(task.title);
    let when = tidy(task.when ?? '');
    // Date words left in the title ("Finish slides by Friday") move out of it. A
    // repeating phrase stays whole, so "every Monday" doesn't become a Monday deadline.
    const split = isRecurring(title) ? null : splitTrailingWhen(title);
    if (split) {
      title = tidy(split.rest);
      when ||= split.when;
    }
    title = capitalize(title);
    const key = title.toLowerCase();
    if (!title || seen.has(key) || parseWhen(title) || !isFromNote(title, note, noteWords)) {
      continue;
    }
    if (findNewFacts(note, when).length > 0) when = '';
    seen.add(key);
    suggestions.push({ key: String(suggestions.length), title, when, ...resolveDue(when, now) });
    if (suggestions.length === MAX_TASKS) break;
  }
  return suggestions;
}

/** "Due tomorrow", "Due Fri, Oct 16 at 5:00 PM" or "No date". */
export function dueLabel({ dueAt, dueHasTime, when }: TaskSuggestion, now: number): string {
  if (dueAt !== null) return `Due ${formatWhen(dueAt, dueHasTime, now)}`;
  return when ? `No exact date (“${when}”)` : 'No date';
}

/** The review sheet's save button: "Save 3 tasks". */
export function saveLabel(count: number): string {
  return count === 0 ? 'Save tasks' : `Save ${plural(count, 'task')}`;
}

/** Why the review sheet is still open after a save that didn't fully work. */
export function saveFailureText(failed: number, savedSoFar: number): string {
  const kept = savedSoFar > 0 ? ` ${plural(savedSoFar, 'task')} saved.` : '';
  return `Couldn't save ${plural(failed, 'task')}.${kept} Tap Save to try again.`;
}

/** What to tell the user once the reviewed tasks are saved. `detail` is '' when there's nothing more. */
export function describeSave({ saved, alerts }: SaveReport): { title: string; detail: string } {
  const count = (outcome: AlertOutcome) => alerts.filter((alert) => alert === outcome).length;
  const scheduled = count('scheduled');
  const noPermission = count('no-permission');
  const failed = count('failed');
  const details: string[] = [];
  if (scheduled > 0) {
    details.push(
      `${scheduled === 1 ? 'Reminder' : 'Reminders'} set for ${plural(scheduled, 'task')}.`,
    );
  }
  if (noPermission > 0) {
    details.push(
      `Notifications are off, so ${plural(noPermission, 'reminder')} can't alert you. Turn them on in Settings.`,
    );
  }
  if (failed > 0) details.push(`Couldn't schedule ${plural(failed, 'reminder')}.`);
  return { title: `Done! ${plural(saved, 'task')} saved.`, detail: details.join(' ') };
}

function isTaskItem(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { title, when } = value as Record<string, unknown>;
  return (
    typeof title === 'string' && (when === undefined || when === null || typeof when === 'string')
  );
}

function resolveDue(when: string, now: number): Pick<TaskSuggestion, 'dueAt' | 'dueHasTime'> {
  // A repeating phrase ("every Monday") has no single due date.
  const parts = when && !isRecurring(when) ? parseWhen(when) : null;
  if (!parts) return NO_DUE;
  const resolved = resolveWhen(parts, { now, purpose: 'task' });
  if (resolved.kind === 'ok') return { dueAt: resolved.at, dueHasTime: resolved.hasTime };
  // A time already gone today ("at 9am", read in the afternoon) means its next turn.
  if (resolved.kind === 'passed' && resolved.suggestion !== null) {
    return { dueAt: resolved.suggestion, dueHasTime: true };
  }
  return NO_DUE;
}

/**
 * A title must not add a number or date, and at least half of its telling words
 * must start a word in the note ("slides" matches "slide", "finish" matches "finishing").
 */
function isFromNote(title: string, note: string, noteWords: readonly string[]): boolean {
  if (findNewFacts(note, title).length > 0) return false;
  const telling = wordsOf(title).filter((word) => word.length >= 3 && !COMMON_WORDS.has(word));
  const found = telling.filter((word) => {
    const stem = word.slice(0, 4);
    return noteWords.some((noteWord) => noteWord.startsWith(stem));
  });
  return found.length * 2 >= telling.length;
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

// Collapses spaces and strips quotes and end punctuation the AI may add.
function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’]+|[\s.,;:!"'“”‘’]+$/g, '')
    .trim();
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
