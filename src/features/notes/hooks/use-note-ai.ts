import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Share } from 'react-native';

import { useMascot } from '@/features/mascot';
import { AiTaskError, type AiTaskFailure } from '@/lib/ai';

import { extractTasks } from '../api/extract-tasks';
import { summarizeNote } from '../api/summarize-note';
import { measureNote, noteText } from '../note-ai-rules';
import { formatSummary, prependSummary } from '../summary';
import type { NoteContent } from '../types';
import { noteRouteKey, useTaskReviewStore } from './use-task-review';

export type NoteAiTool = 'summarize' | 'extract';

export type NoteAiState =
  | { phase: 'idle' }
  | { phase: 'working'; tool: NoteAiTool; long: boolean }
  | { phase: 'summary'; bullets: string[]; long: boolean }
  | { phase: 'empty' }
  | { phase: 'too-short' }
  | { phase: 'no-tasks' }
  | { phase: 'failed'; tool: NoteAiTool; reason: AiTaskFailure };

type UseNoteAiOptions = {
  /** The note as the editor shows it now. */
  getContent: () => NoteContent;
  /** The stored note's id, or null while it has no row yet. */
  getNoteId: () => number | null;
  /** Shows new content in the editor and saves it like any other edit. */
  onReplace: (content: NoteContent) => void;
};

/**
 * Runs Summarize and Extract tasks on the note, one at a time. The note only
 * changes when the user inserts the summary. Extracted tasks go to the review
 * sheet, and nothing is saved until the user confirms there.
 */
export function useNoteAi({ getContent, getNoteId, onReplace }: UseNoteAiOptions) {
  const [state, setState] = useState<NoteAiState>({ phase: 'idle' });
  const { setMood } = useMascot();
  const startReview = useTaskReviewStore((store) => store.startReview);
  const clearOutcome = useTaskReviewStore((store) => store.clearOutcome);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (tool: NoteAiTool) => {
      if (busyRef.current) return;
      Keyboard.dismiss();
      clearOutcome();
      const text = noteText(getContent());
      const length = measureNote(text);
      if (length.empty) {
        setState({ phase: 'empty' });
        return;
      }
      if (tool === 'summarize' && length.short) {
        setState({ phase: 'too-short' });
        return;
      }

      busyRef.current = true;
      setState({ phase: 'working', tool, long: length.long });
      setMood('thinking');
      try {
        if (tool === 'summarize') {
          const bullets = await summarizeNote(text);
          if (!mountedRef.current) return;
          setState({ phase: 'summary', bullets, long: length.long });
          setMood('done');
          return;
        }
        const suggestions = await extractTasks(text);
        if (!mountedRef.current) return;
        if (suggestions.length === 0) {
          setState({ phase: 'no-tasks' });
          setMood('idle');
          return;
        }
        const noteKey = noteRouteKey(getNoteId());
        startReview({ noteKey, suggestions, long: length.long });
        setState({ phase: 'idle' });
        setMood('done');
        // Typed routes learn about /extract-tasks the next time Metro regenerates them.
        router.push(`/extract-tasks?noteId=${noteKey}` as Href);
      } catch (error) {
        if (!mountedRef.current) return;
        const reason = error instanceof AiTaskError ? error.reason : 'failed';
        setState({ phase: 'failed', tool, reason });
        setMood('oops');
      } finally {
        busyRef.current = false;
        // Pinsan stops thinking even when the user left the note meanwhile.
        if (!mountedRef.current) setMood('idle');
      }
    },
    [clearOutcome, getContent, getNoteId, setMood, startReview],
  );

  const summarize = useCallback(() => run('summarize'), [run]);
  const extract = useCallback(() => run('extract'), [run]);

  const retry = useCallback(() => {
    if (state.phase === 'failed') run(state.tool);
  }, [state, run]);

  const dismiss = useCallback(() => setState({ phase: 'idle' }), []);

  const insertSummary = useCallback(() => {
    if (state.phase !== 'summary') return;
    onReplace(prependSummary(getContent(), state.bullets));
    setState({ phase: 'idle' });
    setMood('done');
  }, [state, getContent, onReplace, setMood]);

  const shareSummary = useCallback(() => {
    if (state.phase !== 'summary') return;
    // The app has no clipboard module; the share sheet offers Copy.
    Share.share({ message: formatSummary(state.bullets) }).catch(() => undefined);
  }, [state]);

  return { state, summarize, extract, retry, dismiss, insertSummary, shareSummary };
}
