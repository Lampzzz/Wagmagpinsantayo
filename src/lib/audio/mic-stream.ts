import { AudioManager, AudioRecorder } from 'react-native-audio-api';

import { resampleLinear } from '@/utils/resample-linear';

const CHUNK_SECONDS = 0.1;

export class MicPermissionError extends Error {
  constructor() {
    super('Microphone permission was not granted.');
    this.name = 'MicPermissionError';
  }
}

export type MicStream = {
  stop: () => Promise<void>;
};

/**
 * Streams mono microphone audio as Float32 PCM at `sampleRate`.
 * Throws `MicPermissionError` when the user denies the microphone.
 */
export async function startMicStream(
  sampleRate: number,
  onSamples: (samples: Float32Array) => void,
): Promise<MicStream> {
  const permission = await AudioManager.requestRecordingPermissions();
  if (permission !== 'Granted') throw new MicPermissionError();

  AudioManager.setAudioSessionOptions({ iosCategory: 'record', iosMode: 'default' });
  await AudioManager.setAudioSessionActivity(true);

  const recorder = new AudioRecorder();
  const ready = recorder.onAudioReady(
    { sampleRate, bufferLength: Math.round(sampleRate * CHUNK_SECONDS), channelCount: 1 },
    ({ buffer }) => {
      // The hardware may ignore the requested rate.
      onSamples(resampleLinear(buffer.getChannelData(0), buffer.sampleRate, sampleRate));
    },
  );
  if (ready.status === 'error') throw new Error(ready.message);

  const started = await recorder.start();
  if (started.status === 'error') {
    recorder.clearOnAudioReady();
    throw new Error(started.message);
  }

  return {
    stop: async () => {
      if (recorder.isRecording()) await recorder.stop();
      recorder.clearOnAudioReady();
      await AudioManager.setAudioSessionActivity(false);
    },
  };
}
