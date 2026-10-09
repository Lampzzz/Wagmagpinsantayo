import { makeMutable } from 'react-native-reanimated';
import { Vector3, type Camera } from 'three';

import { projectToView, type ViewPoint } from './project-to-view';
import { walker } from './walker';

// Where to hang speech and thought bubbles: a spot just above the tip of Pinsan's curl,
// projected into the 3D view's points every frame. It lives in a Reanimated shared value, so
// bubbles can follow it in useAnimatedStyle without re-rendering React.

export type PinsanAnchor = ViewPoint;

/** Above Pinsan's feet, in world units: the curl's tip is at about 1.66. */
const ABOVE_HEAD = 1.85;

export const pinsanAnchor = makeMutable<PinsanAnchor>({ x: 0, y: 0, visible: false });

const above = new Vector3();

/** Called every frame, after the camera has moved. */
export function trackAnchor(camera: Camera, width: number, height: number) {
  camera.updateMatrixWorld();
  above.set(walker.x, walker.y + ABOVE_HEAD, walker.z);
  const next = projectToView(above, camera, width, height);
  const last = pinsanAnchor.value;
  // Skip sub-point jitter, so a standing Pinsan doesn't wake the UI thread every frame.
  if (
    next.visible === last.visible &&
    Math.abs(next.x - last.x) < 0.5 &&
    Math.abs(next.y - last.y) < 0.5
  ) {
    return;
  }
  pinsanAnchor.value = next;
}
