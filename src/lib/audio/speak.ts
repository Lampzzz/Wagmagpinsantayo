import { speak as speakText, stop } from 'expo-speech';

/**
 * Reads text aloud with the phone's own voice, replacing anything already being
 * read. iOS gets its own audio session for speech, because recording leaves the
 * app's session in a mode that can't play sound.
 */
export function speak(text: string): void {
  stop()
    .catch(() => undefined)
    .finally(() => speakText(text, { language: 'en-US', useApplicationAudioSession: false }));
}

/** Stops reading aloud, so the microphone never hears the app. */
export function stopSpeaking(): Promise<void> {
  return stop().catch(() => undefined);
}
