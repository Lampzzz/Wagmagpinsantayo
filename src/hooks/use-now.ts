import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

/**
 * The current time, refreshed every minute and whenever the screen comes back
 * into view, so "overdue" and "in 5 minutes" labels stay true.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  useFocusEffect(useCallback(() => setNow(Date.now()), []));
  return now;
}
