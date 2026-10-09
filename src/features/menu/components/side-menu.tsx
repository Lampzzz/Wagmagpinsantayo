import { router, type Href } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import {
  COLORS,
  FONT_SIZES,
  FONTS,
  PRESSED_SCALE,
  RADII,
  SHADOWS,
  SPACING,
} from '@/constants/theme';

import { confirmEmergencyCall } from '../confirm-emergency-call';

type MenuItem = {
  label: string;
  ios: SFSymbol;
  android: AndroidSymbol;
} & ({ kind: 'screen'; href: Href } | { kind: 'emergency' });

// `/conversations` and `/journal` are new routes: the typed routes in `.expo/types` only list
// them once Metro has regenerated the file, so they're cast until then.
const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Conversations',
    ios: 'bubble.left.and.bubble.right',
    android: 'forum',
    kind: 'screen',
    href: '/conversations' as Href,
  },
  { label: 'Journal', ios: 'book', android: 'menu_book', kind: 'screen', href: '/journal' as Href },
  { label: 'Tasks', ios: 'checklist', android: 'checklist', kind: 'screen', href: '/tasks' },
  { label: 'Reminders', ios: 'bell', android: 'notifications', kind: 'screen', href: '/reminders' },
  { label: 'Emergency', ios: 'phone.fill', android: 'call', kind: 'emergency' },
  { label: 'AI setup', ios: 'cpu', android: 'memory', kind: 'screen', href: '/ai-setup' },
];

const SHEET_MAX_WIDTH = 340;
/** Leaves a strip of the island showing, to tap to close. */
const SHEET_WIDTH_SHARE = 0.86;
const BACKDROP_OPACITY = 0.45;
const OPEN_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };
const CLOSE_TIMING = { duration: 200, easing: Easing.in(Easing.cubic) };

type SideMenuProps = {
  visible: boolean;
  /** Called once the sheet has slid away. Set `visible` to false then. */
  onClose: () => void;
};

/**
 * The ☰ menu: a sheet that slides in from the right over a dim backdrop. Tapping the backdrop,
 * ✕ or Android back closes it. A row closes it first, then opens its screen.
 */
export function SideMenu({ visible, onClose }: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(SHEET_MAX_WIDTH, width * SHEET_WIDTH_SHARE);
  // 0 is closed, 1 is open.
  const progress = useSharedValue(0);
  // What a tapped row does once the sheet has gone.
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!visible) return;
    pending.current = null;
    progress.set(withTiming(1, OPEN_TIMING));
  }, [visible, progress]);

  const runPending = useCallback(() => {
    const action = pending.current;
    pending.current = null;
    action?.();
  }, []);

  const finishClosing = useCallback(() => {
    onClose();
    // iOS can't present a screen or an alert while the modal is still going away, so it waits
    // for `onDismiss`. Android has no `onDismiss`, and the sheet is already out of sight.
    if (Platform.OS !== 'ios') runPending();
  }, [onClose, runPending]);

  const close = useCallback(
    (then?: () => void) => {
      if (then) pending.current = then;
      progress.set(
        withTiming(0, CLOSE_TIMING, (finished) => {
          if (finished) scheduleOnRN(finishClosing);
        }),
      );
    },
    [progress, finishClosing],
  );

  const dismiss = useCallback(() => close(), [close]);

  const select = useCallback(
    (item: MenuItem) =>
      close(item.kind === 'screen' ? () => router.push(item.href) : confirmEmergencyCall),
    [close],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.get() * BACKDROP_OPACITY,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.get()) * sheetWidth }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
      onDismiss={runPending}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {/* ✕ and Android back close the menu for screen readers, so this stays out of focus. */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={dismiss}
          style={styles.fill}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        onAccessibilityEscape={dismiss}
        style={[
          styles.sheet,
          {
            width: sheetWidth,
            paddingTop: insets.top + SPACING.sm,
            paddingBottom: insets.bottom + SPACING.md,
          },
          sheetStyle,
        ]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Menu
          </Text>
          {/* Lands where ☰ was, so the same spot opens and closes the menu. */}
          <IconButton
            accessibilityLabel="Close menu"
            icon={<Icon ios="xmark" android="close" color={COLORS.text} />}
            onPress={dismiss}
          />
        </View>
        <ScrollView contentContainerStyle={styles.rows}>
          {MENU_ITEMS.map((item) => (
            <MenuRow key={item.label} item={item} onSelect={select} />
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

type MenuRowProps = {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
};

function MenuRow({ item, onSelect }: MenuRowProps) {
  const emergency = item.kind === 'emergency';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={emergency ? `${item.label}, call 911` : item.label}
      accessibilityHint={emergency ? 'Asks first, then opens the dialer with 911' : undefined}
      onPress={() => onSelect(item)}
      style={({ pressed }) => [
        styles.row,
        emergency && styles.emergencyRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.rowIcon, emergency && styles.emergencyIcon]}>
        <Icon
          ios={item.ios}
          android={item.android}
          color={emergency ? COLORS.surface : COLORS.text}
          size={22}
        />
      </View>
      <Text style={[styles.rowLabel, emergency && styles.emergencyLabel]}>{item.label}</Text>
      {emergency && <Text style={styles.emergencyNumber}>911</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.ink,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: RADII.xl,
    borderBottomLeftRadius: RADII.xl,
    backgroundColor: COLORS.background,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.heading,
    color: COLORS.text,
  },
  rows: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  // Pale red with red text, 4.9:1; the icon sits on the brighter red meant for icons.
  emergencyRow: {
    backgroundColor: COLORS.dangerSurface,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  emergencyIcon: {
    backgroundColor: COLORS.dangerFill,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  emergencyLabel: {
    color: COLORS.danger,
  },
  emergencyNumber: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.danger,
  },
});
