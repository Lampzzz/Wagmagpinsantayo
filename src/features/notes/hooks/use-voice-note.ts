import { useCallback, useState } from 'react';

import { useDictation, type DictationState } from '@/hooks/use-dictation';

import { draftNoteFromSpeech } from '../api/draft-note-from-speech';
import type { NoteDraft } from '../types';

export type VoiceNoteState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'listening'; transcript: string }
  | { phase: 'drafting'; transcript: string }
  | { phase: 'draft'; transcript: string; draft: NoteDraft; aiFailed: boolean }
  | { phase: 'empty' }
  | { phase: 'error'; message: string };

// The phases after recording, which this hook owns.
type AfterRecording = Extract<VoiceNoteState, { phase: 'drafting' | 'draft' | 'empty' }>;

/**
 * Records speech with a live transcript, then asks the AI for a note draft.
 * The draft is never saved here; the caller decides what to do with it.
 */
export function useVoiceNote() {
  const dictation = useDictation();
  const [after, setAfter] = useState<AfterRecording | null>(null);
  const { start: startDictation, stop: stopDictation, reset: resetDictation } = dictation;

  const start = useCallback(async () => {
    setAfter(null);
    await startDictation();
  }, [startDictation]);

  const stop = useCallback(async () => {
    const transcript = await stopDictation();
    // null means it failed, and the dictation state already says why.
    if (transcript === null) return;
    if (!transcript) {
      setAfter({ phase: 'empty' });
      return;
    }

    setAfter({ phase: 'drafting', transcript });
    try {
      const draft = await draftNoteFromSpeech(transcript);
      setAfter({ phase: 'draft', transcript, draft, aiFailed: false });
    } catch {
      // The user's words are never lost: fall back to the raw transcript.
      setAfter({
        phase: 'draft',
        transcript,
        draft: { title: '', body: transcript },
        aiFailed: true,
      });
    }
  }, [stopDictation]);

  const reset = useCallback(() => {
    setAfter(null);
    resetDictation();
  }, [resetDictation]);

  return { state: after ?? fromDictation(dictation.state), start, stop, reset };
}

function fromDictation(state: DictationState): VoiceNoteState {
  // While the last words are transcribed, the screen already says it's writing the note.
  return state.phase === 'transcribing'
    ? { phase: 'drafting', transcript: state.transcript }
    : state;
}
