import { useFrame, useThree } from '@react-three/fiber/native';
import { useRef } from 'react';
import { MathUtils, Vector3 } from 'three';

import { ORBIT_HOME, coast, orbit } from '../scene/orbit';
import { walker } from '../scene/walker';

// Eases the camera toward the orbit state every frame. Close up it follows Pinsan around the
// island; as you zoom out it slides over to frame the whole island, cliffs included.

const ISLAND_MIDDLE = new Vector3(0, -2.2, 0);
const target = new Vector3();
const focusPoint = new Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const view = useRef({ ...ORBIT_HOME, x: walker.x, y: walker.y, z: walker.z });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    coast(dt);
    const v = view.current;
    const ease = 1 - Math.exp(-12 * dt);
    v.azimuth += (orbit.azimuth - v.azimuth) * ease;
    v.elevation += (orbit.elevation - v.elevation) * ease;
    v.distance += (orbit.distance - v.distance) * ease;
    // Trail Pinsan loosely, so walking pans the view instead of jerking it.
    const follow = 1 - Math.exp(-3 * dt);
    v.x += (walker.x - v.x) * follow;
    v.y += (walker.y - v.y) * follow;
    v.z += (walker.z - v.z) * follow;

    focusPoint.set(v.x, v.y + 0.9, v.z);
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
