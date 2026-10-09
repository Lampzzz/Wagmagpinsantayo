import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getNotificationPermission, type NotificationPermission } from '@/lib/notifications';

/**
 * Whether reminders can alert, checked on focus and when the app comes back
 * (the user may have just changed it in Settings). Null until known.
 */
export function useNotificationPermission(): NotificationPermission | null {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const check = useCallback(() => {
    getNotificationPermission()
      .then(setPermission)
      .catch(() => setPermission(null));
  }, []);

  useFocusEffect(check);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, [check]);
  return permission;
}
