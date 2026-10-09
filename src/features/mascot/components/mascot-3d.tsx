import { Canvas } from '@react-three/fiber/native';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { useSceneActive } from '../hooks/use-scene-active';
import { useSceneGestures } from '../hooks/use-scene-gestures';
import { LIGHTS } from '../scene/lighting';
import { CameraRig } from './camera-rig';
import { FpsBadge, FrameCounter } from './fps-badge';
import { Island } from './island';
import { PinsanRig } from './pinsan-rig';
import { ZoomControls } from './zoom-controls';

// Draw the 3D at no more than 2 pixels per point, then stretch it to fill the view. Phones
// have 2.6–3.5 pixels per point, so this skips up to two-thirds of the pixel work. The soft
// clay style hides the difference, and the UI on top is native views, so it stays sharp.
const RENDER_SCALE = Math.max(1, PixelRatio.get() / 2);
const LOW_RES_SIZE = `${100 / RENDER_SCALE}%` as const;
const LOW_RES_INSET = `${(100 - 100 / RENDER_SCALE) / 2}%` as const;

export function Mascot3D() {
  const active = useSceneActive();
  const gesture = useSceneGestures();

  return (
    <View style={styles.fill}>
      <View style={styles.lowRes}>
        {/* No scene background, so the sky behind the canvas shows through. Edge smoothing
            (MSAA) is off: at 2 pixels per point it costs more than it shows. */}
        <Canvas
          style={styles.fill}
          frameloop={active ? 'always' : 'never'}
          gl={{ antialias: false }}
          camera={{ fov: 42, near: 0.1, far: 200 }}
        >
          <CameraRig />
          {/* Lights only Pinsan: the island has the same light baked in. */}
          <ambientLight intensity={LIGHTS.ambient.intensity} color={LIGHTS.ambient.color} />
          <hemisphereLight args={[LIGHTS.sky.color, LIGHTS.sky.ground, LIGHTS.sky.intensity]} />
          <directionalLight
            position={LIGHTS.sun.position}
            intensity={LIGHTS.sun.intensity}
            color={LIGHTS.sun.color}
          />
          <Island />
          <PinsanRig viewScale={RENDER_SCALE} />
          {__DEV__ && <FrameCounter />}
        </Canvas>
      </View>
      {/* Touch layer over the canvas: drag to turn, pinch to zoom, tap to walk, double-tap for home. */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>
      <ZoomControls />
      {__DEV__ && <FpsBadge />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Centered at 1/RENDER_SCALE of the view's size, then scaled up from its center to fill it.
  lowRes: {
    position: 'absolute',
    left: LOW_RES_INSET,
    top: LOW_RES_INSET,
    width: LOW_RES_SIZE,
    height: LOW_RES_SIZE,
    transform: [{ scale: RENDER_SCALE }],
  },
});
