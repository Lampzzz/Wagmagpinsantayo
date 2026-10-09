import { useCallback, useEffect, useRef, useState } from 'react';

import { loadSpeechToText, SPEECH_SAMPLE_RATE_HZ, type SpeechToText } from '@/lib/ai';
import { MicPermissionError, startMicStream, type MicStream } from '@/lib/audio/mic-stream';

export type DictationState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'listening'; transcript: string }
  | { phase: 'transcribing'; transcript: string }
  | { phase: 'error'; message: string };

type Recording = {
  stt: SpeechToText;
  transcript: Promise<string>;
  mic?: MicStream;
};

const MIC_DENIED =
  'Microphone access is off. Turn it on for this app in your phone settings, then try again.';
const START_FAILED = "Couldn't start recording. Please try again.";
const TRANSCRIBE_FAILED = "Couldn't turn your voice into text. Please try again.";

/**
 * Records speech with a live transcript. `stop()` resolves with the final text
 * ("" when nothing was heard), or null when it failed and `state` says why. The
 * speech model is out of memory by then, so the text model can run next.
 *
 * Stopping while the speech model still loads calls the start off: the mic never
 * opens, `stop()` resolves with "", and the state goes back to idle once the model
 * has loaded and been freed.
 */
export function useDictation() {
  const [state, setState] = useState<DictationState>({ phase: 'idle' });
  const recordingRef = useRef<Recording | null>(null);
  // Set while start() waits for the speech model; stop() marks it cancelled.
  const loadingRef = useRef<{ cancelled: boolean } | null>(null);
  const mountedRef = useRef(true);

  // Stops the mic, frees the speech model and resolves with the final transcript.
  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return '';
    // Keep going if the mic fails to stop, so the speech model is still released.
    await recording.mic?.stop().catch(() => undefined);
    recording.stt.streamStop();
    try {
      return await recording.transcript;
    } finally {
      recording.stt.dispose();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      finishRecording().catch(() => undefined);
    };
  }, [finishRecording]);

  const start = useCallback(async () => {
    // A second model loading meanwhile would never be freed, and could open a second mic.
    if (recordingRef.current || loadingRef.current) return;
    const loading = { cancelled: false };
    loadingRef.current = loading;
    setState({ phase: 'loading' });
    try {
      const stt = await loadSpeechToText().finally(() => {
        loadingRef.current = null;
      });
      // Unmounted, or stopped while the model loaded: free it without opening the mic.
      if (!mountedRef.current || loading.cancelled) {
        stt.dispose();
        if (mountedRef.current) setState({ phase: 'idle' });
        return;
      }
      const transcript = readTranscript(stt, (text) =>
        setState((prev) =>
          prev.phase === 'listening' ? { phase: 'listening', transcript: text } : prev,
        ),
      );
      // Rejections are handled where the transcript is awaited.
      transcript.catch(() => undefined);
      const recording: Recording = { stt, transcript };
      recordingRef.current = recording;
      setState({ phase: 'listening', transcript: '' });

      const mic = await startMicStream(SPEECH_SAMPLE_RATE_HZ, stt.streamInsert);
      if (recordingRef.current !== recording) {
        await mic.stop();
        return;
      }
      recording.mic = mic;
    } catch (error) {
      await finishRecording().catch(() => undefined);
      setState(
        // Called off already: a model that failed to load is no news.
        loading.cancelled
          ? { phase: 'idle' }
          : {
              phase: 'error',
              message: error instanceof MicPermissionError ? MIC_DENIED : START_FAILED,
            },
      );
    }
  }, [finishRecording]);

  const stop = useCallback(async (): Promise<string | null> => {
    const loading = loadingRef.current;
    if (loading) {
      // Nothing was heard yet: call the start off, before it opens the mic.
      loading.cancelled = true;
      return '';
    }
    if (!recordingRef.current) return null;
    setState((prev) => ({
      phase: 'transcribing',
      transcript: prev.phase === 'listening' ? prev.transcript : '',
    }));
    try {
      const transcript = await finishRecording();
      setState({ phase: 'idle' });
      return transcript;
    } catch {
      setState({ phase: 'error', message: TRANSCRIBE_FAILED });
      return null;
    }
  }, [finishRecording]);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return { state, start, stop, reset };
}

async function readTranscript(stt: SpeechToText, onUpdate: (text: string) => void) {
  let text = '';
  for await (const { committed, nonCommitted } of stt.stream({ language: 'en' })) {
    text = cleanTranscript(`${committed} ${nonCommitted}`);
    onUpdate(text);
  }
  return text;
}

// Drops Whisper's non-speech tags such as "[BLANK_AUDIO]" and collapses spacing.
function cleanTranscript(text: string) {
  return text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
