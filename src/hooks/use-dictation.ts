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

// Set while a thrown-away recording frees its speech model. There is one speech model
// app-wide, so the next start() waits for it, on this screen or another.
let freeing: Promise<void> | null = null;

/**
 * Records speech with a live transcript. `stop()` resolves with the final text
 * ("" when nothing was heard), or null when it failed and `state` says why. The
 * speech model is out of memory by then, so the text model can run next.
 *
 * `discard()` throws the recording away instead: the state is idle at once, and
 * nothing it heard shows. Its model is freed in the background, and a `start()`
 * meanwhile waits for that, so two speech models are never in memory.
 *
 * Stopping or discarding while the speech model still loads calls the start off:
 * the mic never opens, `stop()` resolves with "", and the state goes back to idle
 * once the model has loaded and been freed.
 */
export function useDictation() {
  const [state, setState] = useState<DictationState>({ phase: 'idle' });
  const recordingRef = useRef<Recording | null>(null);
  // Set while start() waits for the speech model; stop() and discard() mark it cancelled.
  const loadingRef = useRef<{ cancelled: boolean } | null>(null);
  const mountedRef = useRef(true);

  // Stops the mic, frees the speech model and resolves with the final transcript.
  // `throwAway` is for words nobody wants: the transcription in progress is cut short.
  const finishRecording = useCallback(async (throwAway = false) => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return '';
    // Keep going if the mic fails to stop, so the speech model is still released.
    await recording.mic?.stop().catch(() => undefined);
    recording.stt.streamStop();
    // Mid-sentence, Whisper still runs one last pass: each pass starts by clearing the stop.
    if (throwAway) recording.stt.transcribeStop();
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
      finishRecording(true).catch(() => undefined);
    };
  }, [finishRecording]);

  const start = useCallback(async () => {
    // A second model loading meanwhile would never be freed, and could open a second mic.
    if (recordingRef.current || loadingRef.current) return;
    const loading = { cancelled: false };
    loadingRef.current = loading;
    setState({ phase: 'loading' });
    try {
      if (freeing) {
        // A recording thrown away just now still holds its model: two don't fit in memory.
        await freeing;
        // Called off, or unmounted, meanwhile: no model needs to load at all.
        if (!mountedRef.current || loading.cancelled) {
          loadingRef.current = null;
          if (mountedRef.current) setState({ phase: 'idle' });
          return;
        }
      }
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

  /**
   * Throws the recording away: idle at once, and nothing it heard comes back. True only
   * when a recording was thrown away, so a late tap can't start over words that stop()
   * is already sending.
   */
  const discard = useCallback((): boolean => {
    const loading = loadingRef.current;
    if (loading) {
      // Nothing was heard yet: call the start off, before it opens the mic.
      loading.cancelled = true;
      return false;
    }
    if (!recordingRef.current) return false;
    setState({ phase: 'idle' });
    // Freed in the background; the next start() waits for it.
    const done: Promise<void> = finishRecording(true)
      .catch(() => undefined)
      .then(() => {
        if (freeing === done) freeing = null;
      });
    freeing = done;
    return true;
  }, [finishRecording]);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return { state, start, stop, discard, reset };
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
