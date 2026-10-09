import type { AiAvailability } from '@/features/ai-setup';
import { createNote } from '@/features/notes';
import {
  createReminder,
  deleteReminder,
  listReminders,
  setReminderStatus,
  updateReminder,
} from '@/features/reminders';
import { createTask, deleteTask, listTasks, setTaskDone, updateTask } from '@/features/tasks';
import { generateJson } from '@/lib/ai';
import { callEmergency } from '@/lib/phone';

import type { AssistantDeps, DataAction, ModelReading, Outcome, Snapshot } from '../types';
import { isModelReplyFor, LLM_SYSTEM_PROMPT, toReading } from './llm-commands';

const MODEL_GENERATION = { temperature: 0.2, maxNewTokens: 200 };
// Every request loads the model first, which takes a few seconds on most phones.
const MODEL_TIMEOUT_MS = 45_000;

/** The real world the assistant works in. The model is left out until it's downloaded. */
export function createAssistantDeps(availability: AiAvailability): AssistantDeps {
  return {
    interpretWithModel: availability === 'ready' ? interpretWithModel : null,
    canSetUpModel: availability === 'needs-setup',
    loadSnapshot,
    execute,
    callEmergency,
    now: Date.now,
  };
}

/** Asks the on-device model what the user wants. Throws `AiTaskError` when it can't tell. */
async function interpretWithModel(text: string): Promise<ModelReading> {
  const reply = await generateJson(
    {
      system: LLM_SYSTEM_PROMPT,
      input: text,
      generation: MODEL_GENERATION,
      timeoutMs: MODEL_TIMEOUT_MS,
    },
    isModelReplyFor(text),
  );
  return toReading(reply, text) ?? { commands: [], reply: null };
}

async function loadSnapshot(): Promise<Snapshot> {
  const [tasks, reminders] = await Promise.all([listTasks(), listReminders()]);
  return { tasks, reminders };
}

async function execute(action: DataAction): Promise<Outcome> {
  switch (action.kind) {
    case 'create-task':
      return { kind: 'task-saved', task: await createTask(action.task) };
    case 'update-task':
      return { kind: 'task-saved', task: await updateTask(action.task.id, action.changes) };
    case 'set-task-done':
      return { kind: 'task-saved', task: await setTaskDone(action.task.id, action.done) };
    case 'delete-task':
      await deleteTask(action.task.id);
      return { kind: 'task-deleted' };
    case 'create-reminder': {
      const { reminder, alert } = await createReminder(action.reminder);
      return { kind: 'reminder-saved', reminder, alert };
    }
    case 'update-reminder': {
      const { reminder, alert } = await updateReminder(action.reminder.id, action.changes);
      return { kind: 'reminder-saved', reminder, alert };
    }
    case 'close-reminder': {
      const { reminder, alertCleared } = await setReminderStatus(action.reminder.id, action.status);
      return { kind: 'reminder-closed', reminder, alertCleared };
    }
    case 'delete-reminder': {
      const { alertCleared } = await deleteReminder(action.reminder.id);
      return { kind: 'reminder-deleted', alertCleared };
    }
    case 'create-note':
      return { kind: 'note-saved', note: await createNote(action.note) };
  }
}
