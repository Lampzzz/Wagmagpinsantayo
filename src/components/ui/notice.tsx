import { StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';

type NoticeProps = {
  text: string;
};

export function Notice({ text }: NoticeProps) {
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.warningSurface,
  },
  text: {
    fontSize: FONT_SIZES.body,
    color: COLORS.warning,
  },
});
