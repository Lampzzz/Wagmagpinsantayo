import { File, Paths } from 'expo-file-system';
import { download } from 'react-native-executorch';

import { AI_DOWNLOAD_BYTES, SPEECH_MODEL, TEXT_MODEL } from './ai-models';

// ExecuTorch caches downloads but can't say whether a model is cached without
// starting a download. This marker records which model files finished downloading.
const MARKER_FILE_NAME = 'ai-models.json';
const ALL_MODELS = { text: TEXT_MODEL, speech: SPEECH_MODEL };

function markerFile() {
  return new File(Paths.document, MARKER_FILE_NAME);
}

function modelFingerprint() {
  return JSON.stringify(ALL_MODELS);
}

export function areAiModelsDownloaded(): boolean {
  const marker = markerFile();
  if (!marker.exists) return false;
  try {
    return marker.textSync() === modelFingerprint();
  } catch {
    return false;
  }
}

export function hasRoomForAiModels(): boolean {
  return Paths.availableDiskSpace >= AI_DOWNLOAD_BYTES;
}

type DownloadAiModelsOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

/** Downloads every AI model once. Already-downloaded files are skipped. */
export async function downloadAiModels({ onProgress, signal }: DownloadAiModelsOptions = {}) {
  await download(ALL_MODELS, { onProgress, signal });
  const marker = markerFile();
  marker.create({ overwrite: true });
  marker.write(modelFingerprint());
}

/** Resolves a model config to local file paths. Never downloads once setup is done. */
export function localModel<T>(model: T): Promise<T> {
  return download(model);
}
