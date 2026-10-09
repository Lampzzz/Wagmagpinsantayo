import { useFrame, useThree } from '@react-three/fiber/native';
import { useRef } from 'react';
import { MeshBasicMaterial, type Group, type Mesh } from 'three';

import { useMascotStore } from '../hooks/use-mascot';
import { stepWalker, trackView, walker } from '../scene/walker';
import { Pinsan } from './pinsan';

// Carries Pinsan around the island: moves the walker every frame, then places Pinsan, its
// shadow and the tap marker from it.

const SHADOW = new MeshBasicMaterial({
  color: '#000000',
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});
const MARKER = new MeshBasicMaterial({
  color: '#FFFFFF',
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const MARKER_SECONDS = 1.4;

/** The ring where you tapped: it grows and fades out. */
function showMarker(mesh: Mesh, t: number) {
  const { x, y, z, at } = walker.marker;
  const p = (t - at) / MARKER_SECONDS;
  mesh.visible = p >= 0 && p < 1;
  if (!mesh.visible) return;
  mesh.position.set(x, y + 0.03, z);
  mesh.scale.setScalar(0.7 + p * 0.6);
  MARKER.opacity = (1 - p) * 0.9;
}

/**
 * `viewScale` is how much the canvas is stretched to fill the touch layer, so a tap's position
 * on screen can be matched to the canvas.
 */
export function PinsanRig({ viewScale }: { viewScale: number }) {
  const rig = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    stepWalker(Math.min(delta, 0.05), t, useMascotStore.getState().mood, camera.position);
    trackView(camera, size.width * viewScale, size.height * viewScale);
    if (rig.current) {
      rig.current.position.set(walker.x, walker.y, walker.z);
      rig.current.rotation.y = walker.heading;
    }
    if (marker.current) showMarker(marker.current, t);
  });

  return (
    <>
      <group ref={rig}>
        <mesh material={SHADOW} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <circleGeometry args={[0.36, 24]} />
        </mesh>
        <Pinsan />
      </group>
      <mesh ref={marker} material={MARKER} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.18, 0.24, 32]} />
      </mesh>
    </>
  );
}
