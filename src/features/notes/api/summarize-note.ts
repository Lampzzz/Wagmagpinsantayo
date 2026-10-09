import { generateJson } from '@/lib/ai';

import { aiTimeoutMs, LONG_NOTE_WORDS, limitWords } from '../note-ai-rules';
import { cleanSummary, isUsableSummary, type SummaryReply } from '../summary';
import { SUMMARIZE_PROMPT } from './ai-prompts';

// Five short bullets in JSON fit in about 200 tokens.
const MAX_NEW_TOKENS = 320;

/**
 * Asks the text model for 3–5 bullets with the main points of `text`. Bullets that
 * add a number or date the note never mentions are dropped. Throws `AiTaskError`
 * when the model fails, times out or keeps answering with too few usable bullets.
 */
export async function summarizeNote(text: string): Promise<string[]> {
  const input = limitWords(text, LONG_NOTE_WORDS);
  const isUsable = (value: unknown): value is SummaryReply => isUsableSummary(value, input);
  const reply = await generateJson(
    {
      system: SUMMARIZE_PROMPT,
      input,
      generation: { maxNewTokens: MAX_NEW_TOKENS },
      timeoutMs: aiTimeoutMs(input, MAX_NEW_TOKENS),
    },
    isUsable,
  );
  return cleanSummary(reply.bullets, input);
}
