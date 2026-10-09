import { generateJson } from '@/lib/ai';
import { countWords } from '@/utils/count-words';
import { findNewFacts } from '@/utils/find-new-facts';

import type { NoteDraft } from '../types';

const SYSTEM_PROMPT = `You turn a spoken note into a tidy written note.
Reply with one JSON object and nothing else: {"title": string, "body": string}

Rules:
- Use only what the speaker said. Never add, guess or change facts, names, numbers or dates.
- Remove filler words (um, uh, like), false starts and repeated words.
- Remove instructions to you, such as "list this", "make a note", "note that", "write down".
- When the speaker lists things, put each item on its own line starting with "- ".
- Otherwise write short, plain sentences in the speaker's own words.
- Keep date and time words exactly as spoken, for example "tomorrow" or "next Friday".
- title: 2 to 6 words naming the topic, or "" if there is no clear topic.`;

const MIN_NEW_TOKENS = 128;
const MAX_NEW_TOKENS = 2048;
const TOKENS_PER_WORD = 2;
const BASE_TIMEOUT_MS = 30_000;
const TIMEOUT_MS_PER_TOKEN = 100;

/**
 * Asks the text model to turn a transcript into a note draft. Throws `AiTaskError`
 * on failure, including when the body keeps adding a number or date the speaker
 * never said.
 */
export async function draftNoteFromSpeech(transcript: string): Promise<NoteDraft> {
  const maxNewTokens = Math.min(
    MAX_NEW_TOKENS,
    MIN_NEW_TOKENS + countWords(transcript) * TOKENS_PER_WORD,
  );
  // A body that adds facts counts as invalid, so the model gets one more try.
  const isFaithfulDraft = (value: unknown): value is NoteDraft =>
    isNoteDraft(value) && findNewFacts(transcript, value.body).length === 0;
  const draft = await generateJson(
    {
      system: SYSTEM_PROMPT,
      input: transcript,
      generation: { maxNewTokens },
      timeoutMs: BASE_TIMEOUT_MS + maxNewTokens * TIMEOUT_MS_PER_TOKEN,
    },
    isFaithfulDraft,
  );
  const body = draft.body.trim();
  // The title only names the topic, so one that adds a fact is dropped, not retried.
  const title = findNewFacts(transcript, draft.title).length === 0 ? draft.title.trim() : '';
  return { title, body: body || transcript };
}

function isNoteDraft(value: unknown): value is NoteDraft {
  if (typeof value !== 'object' || value === null) return false;
  const { title, body } = value as Record<string, unknown>;
  return typeof title === 'string' && typeof body === 'string';
}
