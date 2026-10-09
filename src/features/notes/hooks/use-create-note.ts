import { useCallback, useRef, useState } from 'react';

import { createNote } from '../api/notes';
import { isEmptyNote } from '../note-rules';
import type { NoteContent } from '../types';

export type CreateNoteStatus = 'idle' | 'saving' | 'saved' | 'empty' | 'failed';

/** Saves a new note on request, for content the user reviews first, like a voice draft. */
export function useCreateNote() {
  const [status, setStatus] = useState<CreateNoteStatus>('idle');
  const busyRef = useRef(false);

  /** Resolves true once the note is stored. Each hook saves at most one note. */
  const save = useCallback(async (content: NoteContent) => {
    if (busyRef.current) return false;
    if (isEmptyNote(content)) {
      setStatus('empty');
      return false;
    }
    busyRef.current = true;
    setStatus('saving');
    try {
      await createNote(content);
      setStatus('saved');
      return true;
    } catch {
      busyRef.current = false;
      setStatus('failed');
      return false;
    }
  }, []);

  return { status, save };
}
