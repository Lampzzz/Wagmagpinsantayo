import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type MicIconProps = {
  color: ColorValue;
  size?: number;
};

/** A decorative microphone. Put it next to a text label, which screen readers read. */
export function MicIcon({ color, size = 20 }: MicIconProps) {
  return (
    <SymbolView
      name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
      tintColor={color}
      size={size}
      accessible={false}
    />
  );
}
