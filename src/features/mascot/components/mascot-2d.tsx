import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Stand-in until the mood PNGs exist (snapshots of the 3D Pinsan). Just a bobbing blob.
export function Mascot2D() {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * -8 }] }));

  return (
    <View style={styles.container} accessible={false}>
      <Animated.View style={[styles.blob, style]}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blob: {
    width: 140,
    height: 150,
    borderRadius: 70,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    backgroundColor: '#F2A23C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyes: { flexDirection: 'row', gap: 28 },
  eye: { width: 18, height: 26, borderRadius: 9, backgroundColor: '#1E1A2B' },
});
