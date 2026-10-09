import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from 'react-native';

import { COLORS, FONTS } from '@/constants/theme';

/**
 * React Native's `Text` in the app's body font, so swapping the import is enough. Nunito
 * by default; a `fontWeight` of 600 or more picks Nunito Bold instead. A set `fontFamily`
 * (such as `FONTS.display` for headings) is kept. `fontWeight` itself is dropped, because
 * Android falls back to the system font when it meets a weight on a font loaded at runtime.
 */
export function Text({ style, ...rest }: TextProps) {
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  const fontFamily = flat.fontFamily ?? (isBold(flat.fontWeight) ? FONTS.bodyBold : FONTS.body);
  return <NativeText {...rest} style={[styles.base, style, { fontFamily }, styles.weight]} />;
}

function isBold(weight: TextStyle['fontWeight']) {
  return weight === 'bold' || Number(weight) >= 600;
}

const styles = StyleSheet.create({
  base: { color: COLORS.text },
  weight: { fontWeight: 'normal' },
});
