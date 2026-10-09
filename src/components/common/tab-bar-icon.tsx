import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { COLORS, RADII } from '@/constants/theme';

type TabBarIconProps = ComponentProps<typeof Icon> & {
  focused: boolean;
};

/** Size of the pill behind the active tab's icon. Pass it as the tab bar's `tabBarIconStyle`. */
export const TAB_BAR_ICON_SIZE = { width: 56, height: 32 } as const;

/** A tab's icon. The active tab's sits on a mango pill; give it the `onPrimary` tint. */
export function TabBarIcon({ focused, ...icon }: TabBarIconProps) {
  return (
    <View style={[styles.pill, focused && styles.active]}>
      <Icon {...icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    ...TAB_BAR_ICON_SIZE,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: COLORS.primary,
  },
});
