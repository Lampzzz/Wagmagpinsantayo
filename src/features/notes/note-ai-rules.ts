import { countWords } from '@/utils/count-words';

import type { NoteContent } from './types';

/** A note under this many words is already short, so Summarize doesn't call the AI. */
export const MIN_SUMMARY_WORDS = 50;
/** Over this many words the AI tools warn that they may miss details. It's also all the AI reads. */
export const LONG_NOTE_WORDS = 1500;

// A phone answers in 10–30 s. These leave room for a slow phone and a long note
// while still stopping a reply that runs away.
const BASE_TIMEOUT_MS = 30_000;
const TIMEOUT_MS_PER_NEW_TOKEN = 100;
const TIMEOUT_MS_PER_INPUT_WORD = 20;

export type NoteLength = {
  words: number;
  /** Nothing to read. */
  empty: boolean;
  /** Too short to be worth summarizing. */
  short: boolean;
  /** Long enough that the AI tools may miss details. */
  long: boolean;
};

/** The text the AI tools read: the title, then the body. */
export function noteText({ title, body }: NoteContent): string {
  return [title.trim(), body.trim()].filter(Boolean).join('\n\n');
}

export function measureNote(text: string): NoteLength {
  const words = countWords(text);
  return {
    words,
    empty: words === 0,
    short: words < MIN_SUMMARY_WORDS,
    long: words > LONG_NOTE_WORDS,
  };
}

/** Keeps the first `max` words of `text`, line breaks included. */
export function limitWords(text: string, max: number): string {
  let count = 0;
  for (const match of text.matchAll(/\S+/g)) {
    count += 1;
    if (count === max) return text.slice(0, (match.index ?? 0) + match[0].length);
  }
  return text;
}

/** How long an AI task on `input` may run before it's stopped. */
export function aiTimeoutMs(input: string, maxNewTokens: number): number {
  return (
    BASE_TIMEOUT_MS +
    maxNewTokens * TIMEOUT_MS_PER_NEW_TOKEN +
    countWords(input) * TIMEOUT_MS_PER_INPUT_WORD
  );
}
