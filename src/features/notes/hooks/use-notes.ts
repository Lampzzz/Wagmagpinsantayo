import { useCallback, useEffect, useState } from 'react';

import { getNoteSummaries, subscribeToNotes } from '../api/notes';
import type { NoteSummary } from '../types';

type NotesState = {
  status: 'loading' | 'ready' | 'error';
  notes: NoteSummary[];
};

/**
 * Every note, last edited first. Reloads whenever a note is created, changed or
 * deleted, including by an editor that saves as it closes.
 */
export function useNotes() {
  const [state, setState] = useState<NotesState>({ status: 'loading', notes: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let loading = false;
    let pending = false;

    // One load at a time. Changes made during a load trigger exactly one more.
    const load = async () => {
      if (loading) {
        pending = true;
        return;
      }
      loading = true;
      do {
        pending = false;
        try {
          const notes = await getNoteSummaries();
          if (active) setState({ status: 'ready', notes });
        } catch {
          // Keep showing notes that already loaded. Only an empty list shows the error.
          if (active) {
            setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', notes: [] }));
          }
        }
      } while (pending && active);
      loading = false;
    };

    // Subscribe before the first load so no change is missed.
    const unsubscribe = subscribeToNotes(load);
    load();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
