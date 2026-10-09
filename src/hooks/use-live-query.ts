import { useCallback, useEffect, useState } from 'react';

type LiveQueryState<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'ready'; data: T }
  | { status: 'error'; data: T | null };

/**
 * Loads data, then reloads it whenever `subscribe` reports a change. One load
 * runs at a time, and changes made during a load trigger exactly one more. A
 * failed reload keeps showing what already loaded. Pass a stable `load`.
 */
export function useLiveQuery<T>(
  load: () => Promise<T>,
  subscribe: (listener: () => void) => () => void,
) {
  const [state, setState] = useState<LiveQueryState<T>>({ status: 'loading', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let loading = false;
    let pending = false;

    const run = async () => {
      if (loading) {
        pending = true;
        return;
      }
      loading = true;
      do {
        pending = false;
        try {
          const data = await load();
          if (active) setState({ status: 'ready', data });
        } catch {
          if (active) {
            setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', data: null }));
          }
        }
      } while (pending && active);
      loading = false;
    };

    // Subscribe before the first load so no change is missed.
    const unsubscribe = subscribe(run);
    run();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, subscribe, attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({ status: 'loading', data: prev.data }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
