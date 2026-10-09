import { useCallback } from 'react';

import { useLiveQuery } from '@/hooks/use-live-query';

import { getTask, subscribeToTasks } from '../api/tasks';

/** One task, kept up to date. `data` is null when it doesn't exist. */
export function useTask(id: number) {
  const load = useCallback(() => getTask(id), [id]);
  return useLiveQuery(load, subscribeToTasks);
}
