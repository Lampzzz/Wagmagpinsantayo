import { useReminderAlerts } from '../hooks/use-reminder-alerts';

/**
 * Runs `useReminderAlerts`. The root layout renders it beside the navigator, after the fonts
 * load: a notification tap that launched the app navigates straight away, and Expo Router
 * throws if that happens before a navigator is mounted.
 */
export function ReminderAlerts() {
  useReminderAlerts();
  return null;
}
