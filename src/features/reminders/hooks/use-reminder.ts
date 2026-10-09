import { useCallback } from 'react';

import { useLiveQuery } from '@/hooks/use-live-query';

import { getReminder, subscribeToReminders } from '../api/reminders';

/** One reminder, kept up to date. `data` is null when it doesn't exist. */
export function useReminder(id: number) {
  const load = useCallback(() => getReminder(id), [id]);
  return useLiveQuery(load, subscribeToReminders);
}
