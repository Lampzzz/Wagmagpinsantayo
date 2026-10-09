---
name: react-native-components
description: Component-authoring rules for this React Native app. Use when building or editing a UI component or screen body, styling, theming, handling touches, showing images, laying out around notches/safe areas, or adding accessibility.
---

# React Native components

## Shape

```tsx
// src/components/ui/button.tsx
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'ghost';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ … });
```

- Write function components with a typed `Props` type and a named export. The file is kebab-case.
- Write one component per file. Put small private subcomponents in the same file, below the main export.
- Use `children` and composition to configure a component, not long lists of boolean props.

## Styling

- Use `StyleSheet.create` at the bottom of the file. Pass conditional styles as arrays: `[styles.a, active && styles.b]`.
- Take colors, spacing, radii and font sizes from `src/constants/theme.ts`. Use raw numbers only for one-off layout values.
- For light/dark mode, read `useColorScheme()` and pick tokens from it. `app.json` `userInterfaceStyle` is currently `"light"`, so change it to `"automatic"` when adding dark mode.
- Lay out with flexbox. In React Native, `flexDirection` defaults to `column`.

## Platform and device

- Wrap screen content in `SafeAreaView` or use `useSafeAreaInsets()` from `react-native-safe-area-context` (not the React Native core `SafeAreaView`).
- Use `Pressable` for touch handling. Give tap targets at least 44×44pt, using `hitSlop` when the visual is smaller.
- When platform code differs only a little, use `Platform.select`. When it differs a lot, use `.ios.tsx`/`.android.tsx` files.
- Wrap form screens in `KeyboardAvoidingView` (`behavior="padding"` on iOS).

## Images

Use `expo-image` (`Image` from `expo-image`) with `contentFit` and an explicit size. It caches and supports placeholders. Keep local images in the root `assets/` folder and load them with `require()` using a static relative path. Metro can't resolve dynamic `require` paths.

## Accessibility

Every interactive element needs `accessibilityRole` and either a visible label or an `accessibilityLabel`. Decorative images get `accessible={false}`. Support dynamic type: use `minHeight`, not a fixed `height`, on containers that hold text.
