import { Platform } from 'react-native';
import { AudioContext, AudioManager } from 'react-native-audio-api';

import { buildAlarmPattern } from '@/utils/alarm-pattern';

export type AlarmTone = {
  stop: () => Promise<void>;
};

/**
 * Plays the alarm tone on a loop until `stop`. It's made in code, so there's no sound
 * file. It plays at media volume, and only while the app runs: stop it when the app
 * leaves the screen.
 */
export async function startAlarmTone(): Promise<AlarmTone> {
  if (Platform.OS === 'ios') {
    AudioManager.setAudioSessionOptions({ iosCategory: 'playback', iosMode: 'default' });
    await AudioManager.setAudioSessionActivity(true);
  }
  const context = new AudioContext();
  const samples = buildAlarmPattern(context.sampleRate);
  const buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(context.destination);
  source.start();

  return {
    stop: async () => {
      source.stop();
      await context.close();
      if (Platform.OS === 'ios') await AudioManager.setAudioSessionActivity(false);
    },
  };
}
