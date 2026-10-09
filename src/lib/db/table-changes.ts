export type Table = 'tasks' | 'reminders';

const listeners = new Map<Table, Set<() => void>>();

/** Calls `listener` after rows in `table` change. Returns an unsubscribe function. */
export function subscribeToTable(table: Table, listener: () => void): () => void {
  let tableListeners = listeners.get(table);
  if (!tableListeners) {
    tableListeners = new Set();
    listeners.set(table, tableListeners);
  }
  tableListeners.add(listener);
  return () => {
    tableListeners.delete(listener);
  };
}

/**
 * Tells subscribers that rows changed. A change can touch several tables, such as
 * deleting a task, which also unlinks its reminders.
 */
export function notifyTableChanged(...tables: Table[]): void {
  for (const table of tables) {
    listeners.get(table)?.forEach((listener) => listener());
  }
}
