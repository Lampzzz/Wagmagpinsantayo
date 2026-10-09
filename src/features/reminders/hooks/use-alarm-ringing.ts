import { useEffect, useState } from 'react';
import { AppState, Vibration } from 'react-native';

import { startAlarmTone, type AlarmTone } from '@/lib/audio/alarm-tone';

// Long buzzes with short breaks, repeated until the ringing stops.
const VIBRATION = [0, 800, 400];
// An alarm nobody answers goes quiet after this long. Its alert stays in the tray.
const MAX_RING_MS = 5 * 60_000;

/**
 * Rings while `ringing` is true and the app is on screen: the alarm tone on a loop, and
 * long vibrations. It stops when `ringing` turns false, when the app leaves the screen
 * (it comes back with the app), on unmount, and for good after five minutes.
 */
export function useAlarmRinging(ringing: boolean) {
  const [onScreen, setOnScreen] = useState(AppState.currentState === 'active');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setOnScreen(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!ringing) return;
    const timer = setTimeout(() => setTimedOut(true), MAX_RING_MS);
    return () => clearTimeout(timer);
  }, [ringing]);

  const active = ringing && onScreen && !timedOut;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let tone: AlarmTone | null = null;
    Vibration.vibrate(VIBRATION, true);
    startAlarmTone()
      .then((started) => {
        if (stopped) started.stop().catch(() => undefined);
        else tone = started;
      })
      // Vibration still rings, and the phone's own alert already played.
      .catch(() => undefined);
    return () => {
      stopped = true;
      Vibration.cancel();
      tone?.stop().catch(() => undefined);
    };
  }, [active]);
}
