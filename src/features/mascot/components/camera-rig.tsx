import { useFrame, useThree } from '@react-three/fiber/native';
import { useRef } from 'react';
import { MathUtils, Vector3 } from 'three';

import { FOCUS, ORBIT_HOME, coast, orbit } from '../scene/orbit';
import { walker } from '../scene/walker';

// Eases the camera toward the orbit state every frame. Close up it follows Pinsan around the
// island; as you zoom out it slides over to frame the whole island, cliffs included. While
// focused (focusPinsan) it glides in to a close-up of Pinsan, and back out when released.

const ISLAND_MIDDLE = new Vector3(0, -2.2, 0);
const target = new Vector3();
const focusPoint = new Vector3();
const closeUp = new Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const view = useRef({ ...ORBIT_HOME, x: walker.x, y: walker.y, z: walker.z, focus: 0 });

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
    // The close-up glides in and out over about half a second, easing at both ends.
    v.focus += ((orbit.focused ? 1 : 0) - v.focus) * (1 - Math.exp(-5 * dt));
    const f = MathUtils.smootherstep(v.focus, 0, 1);

    focusPoint.set(v.x, v.y + 0.9, v.z);
    target.lerpVectors(focusPoint, ISLAND_MIDDLE, MathUtils.smoothstep(v.distance, 9, 26));
    closeUp.set(walker.x, walker.y + FOCUS.height, walker.z);
    target.lerp(closeUp, f);
    const distance = MathUtils.lerp(v.distance, FOCUS.distance, f);
    const elevation = MathUtils.lerp(v.elevation, FOCUS.elevation, f);
    const flat = Math.cos(elevation) * distance;
    camera.position.set(
      target.x + Math.sin(v.azimuth) * flat,
      target.y + Math.sin(elevation) * distance,
      target.z + Math.cos(v.azimuth) * flat,
    );
    camera.lookAt(target);
  });

  return null;
}
