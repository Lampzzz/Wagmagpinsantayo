import { getDatabase } from '@/lib/db';

import { isEmptyNote } from '../note-rules';
import type { JournalEntry, Note, NoteContent, NoteSummary } from '../types';

type NoteRow = {
  id: number;
  title: string;
  body: string;
  created_at: number;
  updated_at: number;
};

type NoteSummaryRow = Pick<NoteRow, 'id' | 'title' | 'updated_at'> & { excerpt: string };

// Enough of the body to fill the list's two-line preview.
const EXCERPT_LENGTH = 300;

const listeners = new Set<() => void>();

/** Calls `listener` after a note is created, changed or deleted. Returns an unsubscribe function. */
export function subscribeToNotes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyNotesChanged() {
  listeners.forEach((listener) => listener());
}

/**
 * Every note, last edited first, with only the start of each body. Notes are
 * personal and the rows are small, so the list loads at once rather than in pages.
 */
export async function getNoteSummaries(): Promise<NoteSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NoteSummaryRow>(
    `SELECT id, title, substr(body, 1, ?) AS excerpt, updated_at
     FROM notes ORDER BY updated_at DESC, id DESC`,
    EXCERPT_LENGTH,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    updatedAt: row.updated_at,
  }));
}

/**
 * Every note as a journal entry, newest written first, with its whole body so the
 * journal can search it. Like the notes list, it loads at once.
 */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<NoteRow, 'updated_at'>>(
    'SELECT id, title, body, created_at FROM notes ORDER BY created_at DESC, id DESC',
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function getNote(id: number): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<NoteRow>(
    'SELECT id, title, body, created_at, updated_at FROM notes WHERE id = ?',
    id,
  );
  return row && toNote(row);
}

/** Stores a new note. Throws for an empty note, since those are never stored. */
export async function createNote(content: NoteContent): Promise<Note> {
  assertNotEmpty(content);
  const db = await getDatabase();
  const now = Date.now();
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)',
    content.title,
    content.body,
    now,
    now,
  );
  notifyNotesChanged();
  return { ...content, id: lastInsertRowId, createdAt: now, updatedAt: now };
}

/**
 * Stores new content for a note and returns its new last-edited time. Returns
 * null when the content is unchanged, so a note never moves up the list just
 * because it was opened.
 */
export async function updateNote(id: number, content: NoteContent): Promise<number | null> {
  assertNotEmpty(content);
  const db = await getDatabase();
  const now = Date.now();
  const { changes } = await db.runAsync(
    `UPDATE notes SET title = ?, body = ?, updated_at = ?
     WHERE id = ? AND (title IS NOT ? OR body IS NOT ?)`,
    content.title,
    content.body,
    now,
    id,
    content.title,
    content.body,
  );
  if (changes === 0) return null;
  notifyNotesChanged();
  return now;
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDatabase();
  const { changes } = await db.runAsync('DELETE FROM notes WHERE id = ?', id);
  if (changes > 0) notifyNotesChanged();
}

function assertNotEmpty(content: NoteContent) {
  if (isEmptyNote(content)) throw new Error('An empty note is never stored.');
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
