import { getDatabase } from '@/lib/db';

import type { HistoryMessage, NewHistoryMessage } from './types';

type HistoryRow = {
  id: number;
  role: string;
  text: string;
  spoken: number;
  created_at: number;
};

const listeners = new Set<() => void>();

// Saves run one after another, so lines are stored in the order they were said.
let saving: Promise<void> = Promise.resolve();

/** Calls `listener` after a line is saved or the history is cleared. Returns an unsubscribe function. */
export function subscribeToHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyHistoryChanged() {
  listeners.forEach((listener) => listener());
}

/**
 * Keeps a line of the conversation on the phone, stamped with the time it was said. Returns
 * at once and never throws: a failed save is only logged in development, because the history
 * must never break a turn.
 */
export function saveToHistory(message: NewHistoryMessage): void {
  const createdAt = Date.now();
  saving = saving
    .then(() => insertMessage(message, createdAt))
    .catch((error: unknown) => {
      if (__DEV__) console.warn("Couldn't save a line of the conversation history.", error);
    });
}

/** Resolves once every save asked for so far has finished or failed. */
export function historySaved(): Promise<void> {
  return saving;
}

/**
 * Every saved line, oldest first. Lines are short and only the history screen reads
 * them, so they load at once rather than in pages.
 */
export async function listHistory(): Promise<HistoryMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<HistoryRow>(
    'SELECT id, role, text, spoken, created_at FROM conversation_messages ORDER BY created_at, id',
  );
  return rows.map(toMessage);
}

/** Deletes every saved line. */
export async function clearHistory(): Promise<void> {
  // After any save still on its way, so a line said just before can't come back.
  await saving;
  const db = await getDatabase();
  const { changes } = await db.runAsync('DELETE FROM conversation_messages');
  if (changes > 0) notifyHistoryChanged();
}

async function insertMessage({ role, text, spoken }: NewHistoryMessage, createdAt: number) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO conversation_messages (role, text, spoken, created_at) VALUES (?, ?, ?, ?)',
    role,
    trimmed,
    role === 'user' && spoken ? 1 : 0,
    createdAt,
  );
  notifyHistoryChanged();
}

function toMessage(row: HistoryRow): HistoryMessage {
  const role = row.role === 'pinsan' ? 'pinsan' : 'user';
  return {
    id: row.id,
    role,
    text: row.text,
    spoken: role === 'user' && row.spoken === 1,
    createdAt: row.created_at,
  };
}
