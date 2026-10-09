import { Canvas } from '@react-three/fiber/native';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { useOrbitGesture } from '../hooks/use-orbit-gesture';
import { useSceneActive } from '../hooks/use-scene-active';
import { PINSAN_HOME } from '../scene/layout';
import { CameraRig } from './camera-rig';
import { Island } from './island';
import { Pinsan } from './pinsan';

export function Mascot3D() {
  const active = useSceneActive();
  const gesture = useOrbitGesture();

  return (
    <View style={styles.fill}>
      {/* No scene background, so the sky behind the canvas shows through. */}
      <Canvas
        style={styles.fill}
        frameloop={active ? 'always' : 'never'}
        camera={{ fov: 42, near: 0.1, far: 200 }}
      >
        <CameraRig focus={PINSAN_HOME} />
        {/* Warm golden-afternoon light from the upper left */}
        <ambientLight intensity={0.55} color="#FFF4E2" />
        <hemisphereLight args={['#FFF1D6', '#B5C77A', 1.4]} />
        <directionalLight position={[-6, 10, 6]} intensity={1.9} color="#FFE6BC" />
        <Island />
        <group position={PINSAN_HOME}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <circleGeometry args={[0.36, 24]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
          </mesh>
          <Pinsan />
        </group>
      </Canvas>
      {/* Touch layer over the canvas: drag to turn, pinch to zoom, double-tap for home. */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
