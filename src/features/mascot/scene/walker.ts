import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';

import type { MascotMood } from '../types';
import { ISLAND_MAP } from './island-map';
import { LANDMARKS, PINSAN_HOME } from './layout';
import { ORBIT_HOME } from './orbit';
import { findPath, groundHeight, randomOpenPoint, type Point } from './walk-grid';

// Where Pinsan is on the island and where it's going. Like the camera orbit, this is one
// module-level state: the render loop moves it along, and taps on the island redirect it.

const WALK_SPEED = 1; // units per second
const STRIDE = 0.55; // ground covered by one walk cycle (two steps)
const TURN_SPEED = 5; // radians per second while walking
const REACH = 0.4; // move on to the next waypoint this close to the current one

/** Places Pinsan strolls to. Once there, it looks at the landmark for a moment. */
const SPOTS: Point[] = [
  LANDMARKS.bench,
  LANDMARKS.stump,
  LANDMARKS.oliveTrunk,
  LANDMARKS.cypressA,
  LANDMARKS.noticeBoard,
  LANDMARKS.mailbox,
  LANDMARKS.lantern,
  LANDMARKS.gardenBed,
  LANDMARKS.bridge,
  ISLAND_MAP.pondCenter,
  LANDMARKS.pinsanHome,
];

export const walker = {
  x: PINSAN_HOME[0],
  y: 0,
  z: PINSAN_HOME[2],
  /** Facing, in radians: 0 faces +z (south), π/2 faces +x (east). Starts facing the camera. */
  heading: ORBIT_HOME.azimuth,
  speed: 0,
  /** How much the legs are moving, 0–1, for the walk cycle. */
  stepping: 0,
  /** Walk-cycle angle. One full turn is two steps. */
  phase: 0,
  path: [] as Point[],
  next: 0,
  /** Clock time when Pinsan sets off again. */
  restUntil: 6,
  /** How long to rest after the current walk. */
  restFor: 0,
  /** What to look at after arriving, and until when. */
  lookAt: null as Point | null,
  lookUntil: 0,
  turning: false,
  /** Set while Pinsan is talking with the person (any mood but idle): no walking. */
  busy: false,
  lastSpot: -1,
  clock: 0,
  /** Where the last tap landed, and when, for the ring marker. */
  marker: { x: 0, y: 0, z: 0, at: -10 },
};

function angleTo(x: number, z: number) {
  return Math.atan2(x - walker.x, z - walker.z);
}

/** The signed smallest turn from one heading to another, in -π..π. */
function turnBetween(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function setOff(goal: Point) {
  const path = findPath([walker.x, walker.z], goal);
  if (!path) return false;
  walker.path = path;
  walker.next = 0;
  return true;
}

/** Pick somewhere to stroll: usually a landmark, sometimes just a patch of grass. */
function wander(t: number) {
  for (let tries = 0; tries < 8; tries++) {
    const spot = Math.random() < 0.7 ? Math.floor(Math.random() * SPOTS.length) : -1;
    if (spot >= 0 && spot === walker.lastSpot) continue;
    const goal = spot >= 0 ? SPOTS[spot] : randomOpenPoint();
    const distance = Math.hypot(goal[0] - walker.x, goal[1] - walker.z);
    if (distance < 1.5 || distance > 8 || !setOff(goal)) continue;
    walker.lastSpot = spot;
    walker.lookAt = spot >= 0 ? goal : null;
    walker.restFor = 5 + Math.random() * 6;
    return;
  }
  walker.restUntil = t + 1;
}

function arrive(t: number) {
  walker.path = [];
  walker.restUntil = t + walker.restFor;
  walker.lookUntil = t + 2.5;
  const look = walker.lookAt;
  if (look && Math.hypot(look[0] - walker.x, look[1] - walker.z) < 0.4) walker.lookAt = null;
}

/**
 * Turn toward a heading once it's more than `slack` away, then keep turning until facing it.
 * The slack stops Pinsan from swivelling after every small camera move. Returns the turn made.
 */
function face(heading: number, slack: number, dt: number) {
  const turn = turnBetween(walker.heading, heading);
  if (Math.abs(turn) > slack) walker.turning = true;
  if (!walker.turning) return 0;
  if (Math.abs(turn) < 0.05) walker.turning = false;
  const step = turn * (1 - Math.exp(-6 * dt));
  walker.heading += step;
  return step;
}

/** Follow the path: steer at the next waypoint, slowing for sharp turns and the last stretch. */
function walkOn(t: number, dt: number) {
  const { path } = walker;
  // Move on from waypoints we've reached, or that are already behind us.
  while (walker.next < path.length - 1) {
    const [ax, az] = path[walker.next];
    const [bx, bz] = path[walker.next + 1];
    const toA = Math.hypot(ax - walker.x, az - walker.z);
    if (toA > REACH && toA < Math.hypot(bx - walker.x, bz - walker.z)) break;
    walker.next++;
  }
  const [tx, tz] = path[walker.next];
  const left = Math.hypot(tx - walker.x, tz - walker.z);
  const last = walker.next === path.length - 1;
  if (last && left < 0.1) {
    arrive(t);
    return { speed: 0, turned: 0 };
  }
  const turn = turnBetween(walker.heading, angleTo(tx, tz));
  const turned = Math.sign(turn) * Math.min(Math.abs(turn), TURN_SPEED * dt);
  walker.heading += turned;
  let speed = WALK_SPEED * Math.max(0.2, Math.cos(Math.min(Math.abs(turn), Math.PI / 2)));
  if (last) speed = Math.min(speed, 0.15 + left * 2);
  return { speed, turned };
}

/** Called every frame with the camera position, so Pinsan can turn to face the person. */
export function stepWalker(dt: number, t: number, mood: MascotMood, eye: Vector3) {
  walker.clock = t;
  walker.busy = mood !== 'idle';
  if (walker.busy) {
    // Talking with the person: stop, face them, and stay a while after they're done.
    walker.path = [];
    walker.lookAt = null;
    walker.restUntil = Math.max(walker.restUntil, t + 3);
  } else if (!walker.path.length && t > walker.restUntil) {
    wander(t);
  }

  let speed = 0;
  let turned = 0;
  if (walker.path.length) {
    ({ speed, turned } = walkOn(t, dt));
  } else {
    const look = !walker.busy && t < walker.lookUntil ? walker.lookAt : null;
    const heading = look ? angleTo(look[0], look[1]) : angleTo(eye.x, eye.z);
    turned = face(heading, walker.busy || look ? 0.05 : 1.1, dt);
  }

  walker.speed += (speed - walker.speed) * (1 - Math.exp(-8 * dt));
  if (speed === 0 && walker.speed < 0.01) walker.speed = 0;
  walker.x += Math.sin(walker.heading) * walker.speed * dt;
  walker.z += Math.cos(walker.heading) * walker.speed * dt;
  walker.y += (groundHeight(walker.x, walker.z) - walker.y) * (1 - Math.exp(-15 * dt));

  // The legs move with forward speed, and shuffle a little when turning on the spot.
  const spin = dt > 0 ? Math.abs(turned) / dt : 0;
  const legs = Math.min(walker.speed / WALK_SPEED + spin * 0.3, 1);
  walker.stepping += (legs - walker.stepping) * (1 - Math.exp(-10 * dt));
  walker.phase += (walker.speed / STRIDE + spin * 0.35) * Math.PI * 2 * dt;
}

const raycaster = new Raycaster();
const pointer = new Vector2();
const floor = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const view = { camera: null as Camera | null, width: 1, height: 1 };

/** Called every frame, so a tap's screen position can be turned into a spot on the island. */
export function trackView(camera: Camera, width: number, height: number) {
  view.camera = camera;
  view.width = width;
  view.height = height;
}

/** A tap at view coordinates. If it lands on or near open ground, Pinsan walks there. */
export function tapScene(x: number, y: number) {
  if (!view.camera || walker.busy) return;
  pointer.set((x / view.width) * 2 - 1, 1 - (y / view.height) * 2);
  raycaster.setFromCamera(pointer, view.camera);
  if (!raycaster.ray.intersectPlane(floor, hit) || !setOff([hit.x, hit.z])) return;
  const [ex, ez] = walker.path[walker.path.length - 1];
  walker.lookAt = null;
  walker.lastSpot = -1;
  walker.restFor = 12;
  walker.marker = { x: ex, y: groundHeight(ex, ez), z: ez, at: walker.clock };
}
