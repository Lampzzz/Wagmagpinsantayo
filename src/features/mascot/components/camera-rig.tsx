import { useFrame, useThree } from '@react-three/fiber/native';
import { useRef } from 'react';
import { MathUtils, Vector3 } from 'three';

import { ORBIT_HOME, coast, orbit } from '../scene/orbit';

// Eases the camera toward the orbit state every frame. Close up it looks at Pinsan; as you
// zoom out it slides over to frame the whole island, cliffs included.

const ISLAND_MIDDLE = new Vector3(0, -2.2, 0);
const target = new Vector3();
const focusPoint = new Vector3();

export function CameraRig({ focus }: { focus: readonly [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  const view = useRef({ ...ORBIT_HOME });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    coast(dt);
    const v = view.current;
    const ease = 1 - Math.exp(-12 * dt);
    v.azimuth += (orbit.azimuth - v.azimuth) * ease;
    v.elevation += (orbit.elevation - v.elevation) * ease;
    v.distance += (orbit.distance - v.distance) * ease;

    focusPoint.set(focus[0], focus[1] + 0.9, focus[2]);
    target.lerpVectors(focusPoint, ISLAND_MIDDLE, MathUtils.smoothstep(v.distance, 9, 26));
    const flat = Math.cos(v.elevation) * v.distance;
    camera.position.set(
      target.x + Math.sin(v.azimuth) * flat,
      target.y + Math.sin(v.elevation) * v.distance,
      target.z + Math.cos(v.azimuth) * flat,
    );
    camera.lookAt(target);
  });

  return null;
}
