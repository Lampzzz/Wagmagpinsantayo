import { createLLMChatSession } from 'react-native-executorch';
import type { ChatMessage, LLMGenerationConfig } from 'react-native-executorch/llm';

import { TEXT_MODEL } from './ai-models';
import { localModel } from './model-files';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_GENERATION: LLMGenerationConfig = { temperature: 0.2, maxNewTokens: 512 };
const RETRY_GENERATION: LLMGenerationConfig = { temperature: 0.5 };

export type AiTaskFailure = 'timeout' | 'invalid-output' | 'failed';

export class AiTaskError extends Error {
  readonly reason: AiTaskFailure;

  constructor(reason: AiTaskFailure, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiTaskError';
    this.reason = reason;
  }
}

export type TextTask = {
  /** Instructions for the model. */
  system: string;
  /** The user's text the instructions apply to. */
  input: string;
  generation?: LLMGenerationConfig;
  timeoutMs?: number;
};

// Tasks run one at a time so the model is never loaded twice.
let queue: Promise<unknown> = Promise.resolve();

function generateText(task: TextTask): Promise<string> {
  const run = queue.then(() => runTextTask(task));
  queue = run.catch(() => undefined);
  return run;
}

/** Runs a task that must answer with one JSON object, retrying once on a malformed reply. */
export async function generateJson<T>(
  task: TextTask,
  isValid: (value: unknown) => value is T,
): Promise<T> {
  for (const generation of [task.generation, { ...task.generation, ...RETRY_GENERATION }]) {
    const value = parseJsonObject(await generateText({ ...task, generation }));
    if (isValid(value)) return value;
  }
  throw new AiTaskError('invalid-output', 'The AI reply was not in the expected format.');
}

async function runTextTask({
  system,
  input,
  generation,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: TextTask) {
  // A fresh session per task gives each task a clean context and frees the
  // model's memory as soon as the task ends.
  const session = await createLLMChatSession(await localModel(TEXT_MODEL), {
    generationConfig: { ...DEFAULT_GENERATION, ...generation },
    initialMessages: [{ role: 'system', content: system }],
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    session.stop();
  }, timeoutMs);
  try {
    const turn = await session.sendMessage(input);
    if (timedOut) throw new AiTaskError('timeout', 'The AI took too long to answer.');
    return replyText(turn.messages);
  } catch (error) {
    if (error instanceof AiTaskError) throw error;
    throw new AiTaskError(timedOut ? 'timeout' : 'failed', 'The AI could not finish.', {
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    session.dispose();
  }
}

function replyText(messages: readonly ChatMessage[]): string {
  const reply = messages.findLast((message) => message.role === 'assistant');
  const content = reply?.content ?? '';
  const text = typeof content === 'string' ? content : content.filter(isString).join('');
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}
