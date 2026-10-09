// Camera orbit state shared by the touch gestures (which write it through the functions
// below) and the camera rig (which eases toward it every frame). There is one island scene,
// so one module-level state.

// From the south-west: the garden and lantern in front, the olive tree behind Pinsan.
export const ORBIT_HOME = { azimuth: -0.45, elevation: 0.6, distance: 11.5 };
const ELEVATION = [0.12, 1.25] as const;
const DISTANCE = [3.5, 40] as const;
const TURN_PER_PX = 0.006;
const TILT_PER_PX = 0.004;

// The close-up while you talk to Pinsan (focusPinsan): near and almost level, looking at a
// point above his chest so his head sits in the middle of the screen with room above it for
// the speech bubble. The camera keeps its direction, because Pinsan turns to face it whenever
// his mood isn't idle.
export const FOCUS = { distance: 3.1, elevation: 0.06, height: 1.25 };

export const orbit = {
  ...ORBIT_HOME,
  /** Leftover turning speed after a flick, in radians per second. */
  spin: 0,
  dragging: false,
  pinchFrom: ORBIT_HOME.distance,
  /** True while the camera is close up on Pinsan. */
  focused: false,
};

/** Glide the camera in to Pinsan's face. */
export function focusPinsan() {
  orbit.focused = true;
  orbit.spin = 0;
}

/** Glide back to the view from before focusPinsan(). */
export function releaseFocus() {
  orbit.focused = false;
}

function clamp(value: number, [min, max]: readonly [number, number]) {
  return Math.min(Math.max(value, min), max);
}

// Touch always wins: turning, tilting or zooming by hand ends a close-up.

export function startDrag() {
  orbit.dragging = true;
  orbit.spin = 0;
  orbit.focused = false;
}

/** Drag right turns the island with your finger; drag down looks from higher up. */
export function drag(dx: number, dy: number) {
  orbit.azimuth -= dx * TURN_PER_PX;
  orbit.elevation = clamp(orbit.elevation + dy * TILT_PER_PX, ELEVATION);
}

export function releaseDrag(velocityX: number) {
  orbit.spin = -velocityX * TURN_PER_PX;
}

export function endDrag() {
  orbit.dragging = false;
}

export function startPinch() {
  orbit.pinchFrom = orbit.distance;
  orbit.focused = false;
}

export function pinch(scale: number) {
  orbit.distance = clamp(orbit.pinchFrom / scale, DISTANCE);
}

/** Zoom from a button: a factor below 1 moves closer, above 1 moves away. */
export function zoomBy(factor: number) {
  orbit.distance = clamp(orbit.distance * factor, DISTANCE);
  orbit.focused = false;
}

/** Glide back to the home view, unwinding the short way round. */
export function resetOrbit() {
  orbit.azimuth = Math.round(orbit.azimuth / (Math.PI * 2)) * Math.PI * 2;
  orbit.elevation = ORBIT_HOME.elevation;
  orbit.distance = ORBIT_HOME.distance;
  orbit.spin = 0;
  orbit.focused = false;
}

/** Called every frame: carry on turning after a flick, slowing down. */
export function coast(dt: number) {
  if (orbit.dragging || orbit.spin === 0) return;
  orbit.azimuth += orbit.spin * dt;
  orbit.spin *= Math.exp(-3.5 * dt);
  if (Math.abs(orbit.spin) < 0.02) orbit.spin = 0;
}
