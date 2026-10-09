import { Platform } from 'react-native';
import { models } from 'react-native-executorch';

// The only place model choices live. Changing one changes every AI feature.
export const TEXT_MODEL = models.llm.LFM2_5_1_2B.DEFAULT;
export const SPEECH_MODEL = models.speechToText.WHISPER.EN.BASE.DEFAULT;

// Rough total of both downloads, used for the setup screen and the free-space check.
export const AI_DOWNLOAD_BYTES = 1_100_000_000;

const MIN_ANDROID_API_LEVEL = 33; // Android 13

/** ExecuTorch supports iOS 17+ (the app's deployment target) and Android 13+. */
export function isAiSupportedOnDevice(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'android') return Platform.Version >= MIN_ANDROID_API_LEVEL;
  return false;
}
