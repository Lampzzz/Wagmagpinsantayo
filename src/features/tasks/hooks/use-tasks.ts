import { useLiveQuery } from '@/hooks/use-live-query';

import { listTasks, subscribeToTasks } from '../api/tasks';

/** Every task, kept up to date as tasks change anywhere in the app. */
export function useTasks() {
  return useLiveQuery(listTasks, subscribeToTasks);
}
