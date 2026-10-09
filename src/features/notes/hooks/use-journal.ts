import { useLiveQuery } from '@/hooks/use-live-query';

import { getJournalEntries, subscribeToNotes } from '../api/notes';

/** Every journal entry, newest first, reloaded whenever a note is created, changed or deleted. */
export function useJournal() {
  return useLiveQuery(getJournalEntries, subscribeToNotes);
}
