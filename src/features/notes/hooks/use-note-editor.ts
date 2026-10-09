import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createNote, deleteNote, getNote, updateNote } from '../api/notes';
import { parseNoteId, planNoteSave } from '../note-rules';
import type { NoteContent } from '../types';

// Save once typing pauses, and at least this often while it doesn't.
const SAVE_DELAY_MS = 600;
const MAX_SAVE_DELAY_MS = 3000;

const EMPTY_NOTE: NoteContent = { title: '', body: '' };

export type NoteEditorStatus = 'loading' | 'ready' | 'missing' | 'error';

type Phase = 'loading' | 'editing' | 'removing' | 'removed';
type StoredNote = { id: number; content: NoteContent };
type NoteTimes = { createdAt: number; updatedAt: number };

/**
 * Opens a note and saves edits automatically. Without `noteIdParam` it starts a
 * new note, stored once it has text. Empty notes are never stored: a note the
 * user empties is deleted when they leave. The param is read once, so give the
 * component a `key` per note.
 */
export function useNoteEditor(noteIdParam?: string) {
  const isNew = noteIdParam === undefined;
  const navigation = useNavigation();
  const [status, setStatus] = useState(() => initialStatus(noteIdParam));
  const [initial, setInitial] = useState<NoteContent>(EMPTY_NOTE);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [times, setTimes] = useState<NoteTimes | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Saves read these refs when they run, not when they are queued, so each one
  // acts on the latest content and the latest stored row.
  const phaseRef = useRef<Phase>(isNew ? 'editing' : 'loading');
  const storedRef = useRef<StoredNote | null>(null);
  const latestRef = useRef<NoteContent>(EMPTY_NOTE);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsavedSinceRef = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const id = isNew ? null : parseNoteId(noteIdParam);
    // A new note has nothing to load, and an invalid id starts out 'missing'.
    if (id === null) return;
    let active = true;
    getNote(id).then(
      (note) => {
        if (!active) return;
        if (!note) {
          setStatus('missing');
          return;
        }
        const content = { title: note.title, body: note.body };
        storedRef.current = { id: note.id, content };
        latestRef.current = content;
        phaseRef.current = 'editing';
        setInitial(content);
        setNoteId(note.id);
        setTimes({ createdAt: note.createdAt, updatedAt: note.updatedAt });
        setStatus('ready');
      },
      () => {
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [isNew, noteIdParam, attempt]);

  // Saves run one at a time, so a new note's create finishes before any update.
  const persist = useCallback((leaving: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    unsavedSinceRef.current = null;
    queueRef.current = queueRef.current
      .then(async () => {
        // Nothing to save before the note loads, or once it is being deleted.
        if (phaseRef.current !== 'editing') return;
        const content = latestRef.current;
        const stored = storedRef.current;
        const plan = planNoteSave({ content, saved: stored?.content ?? null, leaving });
        // 'skip' writes nothing but still clears an old failure: storage is in step.
        if (plan === 'create') {
          const note = await createNote(content);
          storedRef.current = { id: note.id, content };
          if (mountedRef.current) {
            setNoteId(note.id);
            setTimes({ createdAt: note.createdAt, updatedAt: note.updatedAt });
          }
        } else if (stored && plan === 'update') {
          const updatedAt = await updateNote(stored.id, content);
          storedRef.current = { id: stored.id, content };
          if (updatedAt !== null && mountedRef.current) {
            setTimes((prev) => prev && { ...prev, updatedAt });
          }
        } else if (stored && plan === 'delete') {
          await deleteNote(stored.id);
          storedRef.current = null;
        }
        if (mountedRef.current) setSaveFailed(false);
      })
      .catch(() => {
        // The content stays unsaved, so the next save tries it again.
        if (mountedRef.current) setSaveFailed(true);
      });
  }, []);

  const onChange = useCallback(
    (content: NoteContent) => {
      latestRef.current = content;
      const now = Date.now();
      unsavedSinceRef.current ??= now;
      if (timerRef.current) clearTimeout(timerRef.current);
      const delay = Math.min(SAVE_DELAY_MS, unsavedSinceRef.current + MAX_SAVE_DELAY_MS - now);
      timerRef.current = setTimeout(() => persist(false), Math.max(delay, 0));
    },
    [persist],
  );

  // iOS can close an inactive app without reporting 'background', so save on both.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist(false);
    });
    return () => subscription.remove();
  }, [persist]);

  // Being removed from the stack is what tells a real exit from a remount.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        leavingRef.current = true;
      }),
    [navigation],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      persist(leavingRef.current);
    };
  }, [persist]);

  /** Deletes the note. Resolves false if that failed and the note is still there. */
  const remove = useCallback(async () => {
    // Pending and queued saves become no-ops.
    phaseRef.current = 'removing';
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    try {
      await queueRef.current;
      const stored = storedRef.current;
      if (stored) await deleteNote(stored.id);
      storedRef.current = null;
      phaseRef.current = 'removed';
      return true;
    } catch {
      phaseRef.current = 'editing';
      return false;
    }
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((count) => count + 1);
  }, []);

  return {
    status,
    initial,
    noteId,
    createdAt: times?.createdAt,
    updatedAt: times?.updatedAt,
    saveFailed,
    onChange,
    remove,
    retry,
  };
}

function initialStatus(noteIdParam: string | undefined): NoteEditorStatus {
  if (noteIdParam === undefined) return 'ready';
  return parseNoteId(noteIdParam) === null ? 'missing' : 'loading';
}
