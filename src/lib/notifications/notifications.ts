import {
  addNotificationResponseReceivedListener,
  AndroidImportance,
  cancelScheduledNotificationAsync,
  clearLastNotificationResponse,
  getAllScheduledNotificationsAsync,
  getLastNotificationResponse,
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  type NotificationPermissionsStatus,
  type NotificationResponse,
  type SchedulableNotificationTriggerInput,
} from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied';

export type NotificationData = Record<string, unknown>;

export type ScheduledNotification = { identifier: string; data: NotificationData };

const CHANNEL_ID = 'reminders';
const IS_WEB = Platform.OS === 'web';

let configuring: Promise<void> | null = null;

/**
 * Shows notifications while the app is open and creates the Android channel.
 * Android 13+ only asks for permission once a channel exists. Safe to call repeatedly.
 */
export function configureNotifications(): Promise<void> {
  if (IS_WEB) return Promise.resolve();
  configuring ??= setUp().catch((error: unknown) => {
    configuring = null;
    throw error;
  });
  return configuring;
}

async function setUp() {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
    });
  }
}

/** Whether notifications can alert, without asking the user. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (IS_WEB) return 'denied';
  return toPermission(await getPermissionsAsync());
}

/**
 * Asks for permission if the user hasn't decided yet. A "no" is respected: the
 * phone won't ask again, so the app points the user to Settings instead.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (IS_WEB) return 'denied';
  await configureNotifications();
  const current = await getPermissionsAsync();
  if (toPermission(current) === 'granted' || !current.canAskAgain) return toPermission(current);
  return toPermission(await requestPermissionsAsync());
}

function toPermission(status: NotificationPermissionsStatus): NotificationPermission {
  if (status.granted) return 'granted';
  // iOS can grant quiet ("provisional") permission, which still delivers to the list.
  const ios = status.ios?.status;
  return ios === IosAuthorizationStatus.PROVISIONAL || ios === IosAuthorizationStatus.EPHEMERAL
    ? 'granted'
    : 'denied';
}

type NotificationInput = {
  /** Replaces any pending notification with the same id. */
  identifier: string;
  title: string;
  body: string;
  /**
   * Epoch milliseconds. A one-off notification fires then, so it must be in the future.
   * A daily one uses only its local hour and minute.
   */
  at: number;
  /**
   * `daily` fires every day at the hour and minute of `at`, starting the next time that
   * hour and minute come round (the phone can't start a daily notification any later).
   * It stays scheduled after it fires, until it's cancelled. Leave it out for a one-off.
   */
  repeat?: 'daily';
  data: NotificationData;
};

/**
 * Schedules a notification that fires even when the app is closed: once, or every
 * day with `repeat: 'daily'`. Refuses a past time for a one-off notification: iOS
 * would throw and Android would drop it silently.
 */
export async function scheduleNotification({
  identifier,
  title,
  body,
  at,
  repeat,
  data,
}: NotificationInput): Promise<string> {
  if (IS_WEB) throw new Error('Notifications are not available on the web.');
  if (repeat !== 'daily' && at <= Date.now()) {
    throw new Error('A notification must be scheduled in the future.');
  }
  await configureNotifications();
  await cancelScheduledNotificationAsync(identifier);
  return scheduleNotificationAsync({
    identifier,
    content: { title, body, data, sound: 'default' },
    trigger: toTrigger(at, repeat),
  });
}

function toTrigger(at: number, repeat: 'daily' | undefined): SchedulableNotificationTriggerInput {
  if (repeat !== 'daily') {
    return { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID };
  }
  const time = new Date(at);
  return {
    type: SchedulableTriggerInputTypes.DAILY,
    hour: time.getHours(),
    minute: time.getMinutes(),
    channelId: CHANNEL_ID,
  };
}

/** Cancels a pending notification. Resolves even if there is none. */
export async function cancelNotification(identifier: string): Promise<void> {
  if (IS_WEB) return;
  await cancelScheduledNotificationAsync(identifier);
}

/**
 * Pending notifications and the data they were scheduled with. The trigger read
 * back differs per platform, so callers rely on `data` instead.
 */
export async function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  if (IS_WEB) return [];
  const requests = await getAllScheduledNotificationsAsync();
  return requests.map((request) => ({
    identifier: request.identifier,
    data: request.content.data ?? {},
  }));
}

/**
 * Calls `onOpen` with the data of each notification the user taps, including
 * the one that launched the app. Returns an unsubscribe function.
 */
export function onNotificationOpened(onOpen: (data: NotificationData) => void): () => void {
  if (IS_WEB) return () => undefined;
  const open = (response: NotificationResponse) => {
    // Clear it so the same tap isn't handled again on the next launch check.
    clearLastNotificationResponse();
    onOpen(response.notification.request.content.data ?? {});
  };
  const last = getLastNotificationResponse();
  if (last) open(last);
  const subscription = addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
