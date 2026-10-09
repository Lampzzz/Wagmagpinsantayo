import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type IconProps = {
  /** An SF Symbol name for iOS. */
  ios: SFSymbol;
  /** A Material Symbol name for Android. */
  android: AndroidSymbol;
  color: ColorValue;
  size?: number;
};

/** A decorative platform icon. Pair it with a visible label or an accessibility label. */
export function Icon({ ios, android, color, size = 24 }: IconProps) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      tintColor={color}
      size={size}
      accessible={false}
    />
  );
}
