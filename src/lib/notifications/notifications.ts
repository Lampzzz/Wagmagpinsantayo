import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationPriority,
  cancelScheduledNotificationAsync,
  clearLastNotificationResponse,
  dismissNotificationAsync,
  getAllScheduledNotificationsAsync,
  getLastNotificationResponse,
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationCategoryAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  type NotificationContentInput,
  type NotificationPermissionsStatus,
  type NotificationResponse,
  type SchedulableNotificationTriggerInput,
} from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied';

export type NotificationData = Record<string, unknown>;

export type ScheduledNotification = { identifier: string; data: NotificationData };

/** What the user tapped: the notification itself, or one of an alarm's buttons. */
export type NotificationTap = 'open' | 'snooze' | 'done';

const CHANNEL_ID = 'reminders';
// Its own channel, because Android never changes a channel's sound or importance once it exists.
const ALARM_CHANNEL_ID = 'reminder-alarms';
const ALARM_CATEGORY_ID = 'reminder-alarm';
// About 8 seconds of long buzzes. Android plays a channel's pattern once per alert.
const ALARM_VIBRATION = [0, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800];
const IS_WEB = Platform.OS === 'web';

let configuring: Promise<void> | null = null;

/**
 * Shows notifications while the app is open, sets up the alarm buttons and creates the
 * Android channels. Android 13+ only asks for permission once a channel exists. Safe to
 * call repeatedly.
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
  // Both buttons open the app: Android loses the tap of one that doesn't when the app
  // isn't running.
  await setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
    { identifier: 'snooze', buttonTitle: 'Snooze', options: { opensAppToForeground: true } },
    { identifier: 'done', buttonTitle: 'Done', options: { opensAppToForeground: true } },
  ]);
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: AndroidImportance.HIGH,
    });
    await setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Reminder alarms',
      description: 'Reminders set to ring like an alarm',
      importance: AndroidImportance.MAX,
      // The default sound on the alarm stream: it plays at alarm volume, on silent too, and
      // gets through Do Not Disturb when that lets alarms through.
      audioAttributes: {
        usage: AndroidAudioUsage.ALARM,
        contentType: AndroidAudioContentType.SONIFICATION,
      },
      enableVibrate: true,
      vibrationPattern: ALARM_VIBRATION,
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
  /**
   * Rings like an alarm: on Android at alarm volume with a long vibration. It stays in
   * the tray until it's handled or dismissed, and has Snooze and Done buttons.
   */
  alarm?: boolean;
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
  alarm = false,
  data,
}: NotificationInput): Promise<string> {
  if (IS_WEB) throw new Error('Notifications are not available on the web.');
  if (repeat !== 'daily' && at <= Date.now()) {
    throw new Error('A notification must be scheduled in the future.');
  }
  await configureNotifications();
  await cancelScheduledNotificationAsync(identifier);
  const content: NotificationContentInput = { title, body, data, sound: 'default' };
  return scheduleNotificationAsync({
    identifier,
    content: alarm
      ? {
          ...content,
          sticky: true,
          priority: AndroidNotificationPriority.MAX,
          categoryIdentifier: ALARM_CATEGORY_ID,
        }
      : content,
    trigger: toTrigger(at, repeat, alarm ? ALARM_CHANNEL_ID : CHANNEL_ID),
  });
}

function toTrigger(
  at: number,
  repeat: 'daily' | undefined,
  channelId: string,
): SchedulableNotificationTriggerInput {
  if (repeat !== 'daily') {
    return { type: SchedulableTriggerInputTypes.DATE, date: at, channelId };
  }
  const time = new Date(at);
  return {
    type: SchedulableTriggerInputTypes.DAILY,
    hour: time.getHours(),
    minute: time.getMinutes(),
    channelId,
  };
}

/** Cancels a pending notification. Resolves even if there is none. */
export async function cancelNotification(identifier: string): Promise<void> {
  if (IS_WEB) return;
  await cancelScheduledNotificationAsync(identifier);
}

/**
 * Takes a notification that already fired off the screen and out of the tray, which
 * also stops its sound. A daily one stays scheduled. Resolves even if none is showing.
 */
export async function dismissNotification(identifier: string): Promise<void> {
  if (IS_WEB) return;
  await dismissNotificationAsync(identifier);
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
 * Calls `onReceive` with the data of each notification that fires while the app is on
 * screen. Android doesn't tell the app about one that fires while it's in the
 * background or closed. Returns an unsubscribe function.
 */
export function onNotificationReceived(onReceive: (data: NotificationData) => void): () => void {
  if (IS_WEB) return () => undefined;
  const subscription = addNotificationReceivedListener((notification) => {
    onReceive(notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}

/**
 * Calls `onOpen` with the data of each notification the user taps, including
 * the one that launched the app, and whether a button was tapped. Returns an
 * unsubscribe function.
 */
export function onNotificationOpened(
  onOpen: (data: NotificationData, tap: NotificationTap) => void,
): () => void {
  if (IS_WEB) return () => undefined;
  const open = (response: NotificationResponse) => {
    // Clear it so the same tap isn't handled again on the next launch check.
    clearLastNotificationResponse();
    onOpen(response.notification.request.content.data ?? {}, toTap(response.actionIdentifier));
  };
  const last = getLastNotificationResponse();
  if (last) open(last);
  const subscription = addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}

function toTap(actionIdentifier: string): NotificationTap {
  return actionIdentifier === 'snooze' || actionIdentifier === 'done' ? actionIdentifier : 'open';
}
