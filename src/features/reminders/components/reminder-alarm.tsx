import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { parseId } from '@/utils/parse-id';

import { describeReminderTime } from '../api/group-reminders';
import { setReminderStatus, SNOOZE_MINUTES, snoozeReminder } from '../api/reminders';
import { useAlarmRinging } from '../hooks/use-alarm-ringing';
import { useReminder } from '../hooks/use-reminder';
import type { Reminder } from '../types';

const BELL_SIZE = 128;

type ReminderAlarmProps = {
  /** The reminder's id from the route. */
  reminderId: string;
  /** Rings while it's open. True when the alarm went off with the app on screen. */
  ring: boolean;
};

/** A reminder's alarm, full screen, with Done and Snooze. */
export function ReminderAlarm({ reminderId, ring }: ReminderAlarmProps) {
  const id = parseId(reminderId);
  return (
    <SafeAreaView style={styles.screen}>
      {id === null ? (
        <Message text="This reminder doesn't exist. It may have been deleted." />
      ) : (
        <SavedAlarm id={id} ring={ring} />
      )}
    </SafeAreaView>
  );
}

function SavedAlarm({ id, ring }: { id: number; ring: boolean }) {
  const { status, data: reminder } = useReminder(id);
  if (reminder) return <Alarm reminder={reminder} ring={ring} />;
  if (status === 'loading') {
    return (
      <View style={styles.message}>
        <ActivityIndicator color={COLORS.primaryDark} />
      </View>
    );
  }
  return (
    <Message
      text={
        status === 'error'
          ? "Couldn't open this reminder."
          : "This reminder doesn't exist. It may have been deleted."
      }
    />
  );
}

function Alarm({ reminder, ring }: { reminder: Reminder; ring: boolean }) {
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const open = reminder.status === 'scheduled';
  const ringing = ring && open && !busy;
  useAlarmRinging(ringing);

  const { title } = reminder;
  useEffect(() => {
    if (ring) AccessibilityInfo.announceForAccessibility(`Alarm: ${title}`);
  }, [ring, title]);

  const act = async (run: () => Promise<string | null>) => {
    setBusy(true);
    setProblem(null);
    const failure = await run().catch(() => "Couldn't save that. Please try again.");
    if (failure === null) {
      leave();
    } else {
      setBusy(false);
      setProblem(failure);
    }
  };

  const done = () =>
    act(async () => {
      await setReminderStatus(reminder.id, 'completed');
      return null;
    });

  const snooze = () =>
    act(async () => {
      const alert = await snoozeReminder(reminder.id);
      if (alert === 'scheduled') return null;
      return alert === 'no-permission'
        ? "Notifications are off, so it can't ring again."
        : "Couldn't snooze it. Please try again.";
    });

  return (
    <>
      <View style={styles.body}>
        <Bell ringing={ringing} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.when}>{describeReminderTime(reminder, now)}</Text>
      </View>
      <View style={styles.actions}>
        {problem && <Notice text={problem} />}
        {/* `busy` stays on after Done succeeds, so the buttons stay put until the screen closes. */}
        {open || busy ? (
          <>
            <Button
              label={reminder.repeat === 'daily' ? 'Done for today' : 'Done'}
              onPress={done}
              disabled={busy}
            />
            <Button
              label={`Snooze ${SNOOZE_MINUTES} min`}
              variant="ghost"
              onPress={snooze}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <Text style={styles.closed}>This reminder is already closed.</Text>
            <Button label="Close" variant="ghost" onPress={leave} />
          </>
        )}
      </View>
    </>
  );
}

/** A mango bell that shakes while the alarm rings, unless the phone asks for less motion. */
function Bell({ ringing }: { ringing: boolean }) {
  const angle = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ringing || reduceMotion) return;
    angle.set(
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 80 }),
          withTiming(14, { duration: 160 }),
          withTiming(-14, { duration: 160 }),
          withTiming(0, { duration: 80 }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(angle);
      angle.set(0);
    };
  }, [ringing, reduceMotion, angle]);

  const shake = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={styles.bell}>
      <Animated.View style={shake}>
        <Icon ios="alarm.fill" android="alarm" color={COLORS.onPrimary} size={56} />
      </Animated.View>
    </View>
  );
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.message}>
      <Text style={styles.closed}>{text}</Text>
      <Button label="Close" variant="ghost" onPress={leave} />
    </View>
  );
}

// Back to where the user was, or Home when the alarm opened the app.
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  bell: {
    width: BELL_SIZE,
    height: BELL_SIZE,
    marginBottom: SPACING.md,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.display,
    lineHeight: 36,
    color: COLORS.text,
    textAlign: 'center',
  },
  when: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  actions: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  closed: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
});
