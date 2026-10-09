import { generateJson } from '@/lib/ai';

import { aiTimeoutMs, LONG_NOTE_WORDS, limitWords } from '../note-ai-rules';
import { isTaskReply, toTaskSuggestions } from '../task-suggestions';
import type { TaskSuggestion } from '../types';
import { EXTRACT_TASKS_PROMPT } from './ai-prompts';

// About 30 tokens per task, so room for about 15. A small model that starts
// repeating itself stops here rather than running on.
const MAX_NEW_TOKENS = 512;

/**
 * Asks the text model for the to-dos in `text`. The model gives titles and date
 * words; code works out the due dates. Nothing is saved here. Throws `AiTaskError`
 * when the model fails, times out or keeps answering in the wrong shape.
 */
export async function extractTasks(text: string): Promise<TaskSuggestion[]> {
  const input = limitWords(text, LONG_NOTE_WORDS);
  const reply = await generateJson(
    {
      system: EXTRACT_TASKS_PROMPT,
      input,
      generation: { maxNewTokens: MAX_NEW_TOKENS },
      timeoutMs: aiTimeoutMs(input, MAX_NEW_TOKENS),
    },
    isTaskReply,
  );
  // Dates are worked out once the reply is in, since the model can take a while.
  return toTaskSuggestions(reply, input, Date.now());
}
