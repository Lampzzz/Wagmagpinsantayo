import { useLiveQuery } from '@/hooks/use-live-query';

import { listHistory, subscribeToHistory } from '../history/history-store';

/**
 * Every saved line of every conversation, oldest first, reloaded as each new line is
 * saved, from Home or the Conversations screen, or when the history is cleared.
 */
export function useConversationHistory() {
  return useLiveQuery(listHistory, subscribeToHistory);
}
