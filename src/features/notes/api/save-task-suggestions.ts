import { createReminder, type AlertOutcome } from '@/features/reminders';
import { createTask } from '@/features/tasks';

import type { TaskSuggestion } from '../types';

export type SaveTaskSuggestionsResult = {
  /** Keys of the suggestions saved as tasks. */
  savedKeys: string[];
  /** One entry per reminder set for a saved task with a due time. */
  alerts: AlertOutcome[];
};

/**
 * Saves each suggestion as a task, and sets a reminder at the due time for those
 * that have one. Keeps going past a task that fails, so the caller can offer to
 * retry just the ones left. A reminder that can't be set never undoes its task.
 */
export async function saveTaskSuggestions(
  suggestions: readonly TaskSuggestion[],
): Promise<SaveTaskSuggestionsResult> {
  const savedKeys: string[] = [];
  const alerts: AlertOutcome[] = [];
  for (const suggestion of suggestions) {
    let taskId: number;
    try {
      const task = await createTask({
        title: suggestion.title,
        dueAt: suggestion.dueAt,
        dueHasTime: suggestion.dueHasTime,
      });
      taskId = task.id;
    } catch {
      continue;
    }
    savedKeys.push(suggestion.key);

    const { dueAt, dueHasTime } = suggestion;
    if (dueAt === null || !dueHasTime || dueAt <= Date.now()) continue;
    try {
      const { alert } = await createReminder({
        title: suggestion.title,
        scheduledAt: dueAt,
        taskId,
      });
      alerts.push(alert);
    } catch {
      alerts.push('failed');
    }
  }
  return { savedKeys, alerts };
}
