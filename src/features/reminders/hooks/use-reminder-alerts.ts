import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  configureNotifications,
  onNotificationOpened,
  onNotificationReceived,
} from '@/lib/notifications';

import {
  isAlarmNotification,
  reminderIdFromNotification,
  setReminderStatus,
  snoozeReminder,
  syncReminderAlerts,
} from '../api/reminders';

/**
 * Keeps reminder alerts working: shows them while the app is open, re-syncs them
 * at launch and whenever the app comes back, and handles taps, even the one that
 * launched the app. A tapped reminder opens; a tapped alarm opens its alarm screen,
 * and its Snooze and Done buttons do just that. An alarm that goes off while the app
 * is on screen opens its alarm screen, ringing. Call once, through `ReminderAlerts`
 * in the root layout.
 */
export function useReminderAlerts() {
  useEffect(() => {
    configureNotifications().catch(() => undefined);
    const sync = () => {
      syncReminderAlerts().catch(() => undefined);
    };
    sync();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const stopReceiving = onNotificationReceived((data) => {
      const id = reminderIdFromNotification(data);
      if (id === null || !isAlarmNotification(data)) return;
      router.push({ pathname: '/alarm/[id]', params: { id: String(id), ring: '1' } });
    });
    const stopListening = onNotificationOpened((data, tap) => {
      const id = reminderIdFromNotification(data);
      if (id === null) return;
      if (!isAlarmNotification(data)) {
        router.push({ pathname: '/reminders/[id]', params: { id: String(id) } });
      } else if (tap === 'snooze') {
        snoozeReminder(id).catch(() => undefined);
      } else if (tap === 'done') {
        setReminderStatus(id, 'completed').catch(() => undefined);
      } else {
        router.push({ pathname: '/alarm/[id]', params: { id: String(id) } });
      }
    });
    return () => {
      appState.remove();
      stopReceiving();
      stopListening();
    };
  }, []);
}
