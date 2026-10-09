import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureNotifications, onNotificationOpened } from '@/lib/notifications';

import { reminderIdFromNotification, syncReminderAlerts } from '../api/reminders';

/**
 * Keeps reminder alerts working: shows them while the app is open, re-syncs them
 * at launch and whenever the app comes back, and opens the reminder a tapped
 * notification belongs to, even when the tap launched the app. Call once, from
 * the root layout.
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
    const stopListening = onNotificationOpened((data) => {
      const id = reminderIdFromNotification(data);
      if (id !== null) router.push({ pathname: '/reminders/[id]', params: { id: String(id) } });
    });
    return () => {
      appState.remove();
      stopListening();
    };
  }, []);
}
