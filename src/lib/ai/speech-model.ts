import { createWhisperSpeechToText, WHISPER_SAMPLE_RATE_HZ } from 'react-native-executorch';

import { SPEECH_MODEL } from './ai-models';
import { localModel } from './model-files';

export const SPEECH_SAMPLE_RATE_HZ = WHISPER_SAMPLE_RATE_HZ;

/**
 * Loads the speech model. Call `dispose()` on the result when recording ends,
 * so it is out of memory before the text model runs.
 */
export async function loadSpeechToText() {
  return createWhisperSpeechToText(await localModel(SPEECH_MODEL));
}

export type SpeechToText = Awaited<ReturnType<typeof loadSpeechToText>>;
