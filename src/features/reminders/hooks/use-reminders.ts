import { useLiveQuery } from '@/hooks/use-live-query';

import { listReminders, subscribeToReminders } from '../api/reminders';

/** Every reminder, kept up to date as reminders change anywhere in the app. */
export function useReminders() {
  return useLiveQuery(listReminders, subscribeToReminders);
}
