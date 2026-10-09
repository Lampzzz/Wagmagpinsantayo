import type { NoteContent } from './types';

/** A note with no title and no body is never stored. Whitespace doesn't count. */
export function isEmptyNote({ title, body }: NoteContent): boolean {
  return title.trim() === '' && body.trim() === '';
}

function isSameContent(a: NoteContent, b: NoteContent): boolean {
  return a.title === b.title && a.body === b.body;
}

/** Reads a note id from a route param. Anything but a plain positive integer gives null. */
export function parseNoteId(param: string | undefined): number | null {
  if (param === undefined || !/^[1-9]\d*$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) ? id : null;
}

export type NoteSavePlan = 'skip' | 'create' | 'update' | 'delete';

type PlanNoteSaveInput = {
  /** What the editor shows now. */
  content: NoteContent;
  /** What is stored, or null when the note has no row yet. */
  saved: NoteContent | null;
  /** True once the user has left the editor. */
  leaving: boolean;
};

/**
 * Picks the write that brings storage in line with the editor. Empty content is
 * never written: a note the user empties is deleted only when they leave, so
 * clearing it and typing again keeps the same note.
 */
export function planNoteSave({ content, saved, leaving }: PlanNoteSaveInput): NoteSavePlan {
  if (isEmptyNote(content)) return leaving && saved ? 'delete' : 'skip';
  if (!saved) return 'create';
  return isSameContent(content, saved) ? 'skip' : 'update';
}
