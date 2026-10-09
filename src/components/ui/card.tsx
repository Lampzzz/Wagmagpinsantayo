import { StyleSheet, View, type ViewProps } from 'react-native';

import { COLORS, RADII, SHADOWS, SPACING } from '@/constants/theme';

/** A white, rounded card with a soft shadow, for content on the cream background. */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
});
