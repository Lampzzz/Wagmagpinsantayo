import { Vector3, type Camera } from 'three';

export type ViewPoint = {
  /** Points from the view's left edge. */
  x: number;
  /** Points from the view's top edge. */
  y: number;
  /** False when the point is behind the camera or outside the view. */
  visible: boolean;
};

const inView = new Vector3();
const ndc = new Vector3();

/**
 * Projects a world point into a view `width` × `height` points in size. The camera's matrices
 * must be current (call camera.updateMatrixWorld() after moving it).
 */
export function projectToView(
  world: Vector3,
  camera: Camera,
  width: number,
  height: number,
): ViewPoint {
  // In the camera's own space it looks down -z, so anything with z >= 0 is behind it.
  inView.copy(world).applyMatrix4(camera.matrixWorldInverse);
  ndc.copy(inView).applyMatrix4(camera.projectionMatrix);
  return {
    x: ((ndc.x + 1) / 2) * width,
    y: ((1 - ndc.y) / 2) * height,
    visible: inView.z < 0 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1,
  };
}
