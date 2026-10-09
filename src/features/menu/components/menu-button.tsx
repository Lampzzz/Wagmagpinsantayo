import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { COLORS, PRESSED_SCALE, RADII, SHADOWS } from '@/constants/theme';

import { SideMenu } from './side-menu';

/** The button's width and height. Home keeps Pinsan's bubbles below it. */
export const MENU_BUTTON_SIZE = 48;

type MenuButtonProps = {
  /** Where it floats, such as Home's top-right corner. */
  style?: StyleProp<ViewStyle>;
};

/** A round ☰ button over the island that opens the side menu. */
export function MenuButton({ style }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityHint="Opens Conversations, Journal, Tasks, Reminders, Emergency and AI setup"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      >
        <Icon ios="line.3.horizontal" android="menu" color={COLORS.ink} />
      </Pressable>
      <SideMenu visible={open} onClose={close} />
    </>
  );
}

const styles = StyleSheet.create({
  // White at 92% over the sky, like the hint under Home's mic.
  button: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceTranslucent,
    ...SHADOWS.soft,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
});
