import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  MathUtils,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Pinsan's shapes, measured off the character model sheet (front and side views). Units: feet
// at y = 0, 1.7 tall to the top of the curl, facing +z. Every surface is smooth: lathes and
// sweeps with normals taken from their outlines, and enough segments that the silhouette
// stays round close up. Texture coordinates keep the brush strokes about the same size
// everywhere, running around each part. A per-vertex shade darkens skin and cloth where other
// parts crowd in (under the head, inside sleeves and cuffs), like soft contact shadows.

/** World size of one tile of brush strokes. */
const STROKE_TILE = 0.42;

/** 1 is fully lit; less where something else blocks the light. */
type Shade = (y: number, radius: number) => number;

/** Darkens by up to `depth` as y moves from `start` (unshaded) to `end` (fully shaded). */
function shadeToward(start: number, end: number, depth: number): Shade {
  return (y) => {
    const t = MathUtils.clamp((y - start) / (end - start), 0, 1);
    return 1 - depth * t * t * (3 - 2 * t);
  };
}

/** Shade a color toward warm brown rather than grey, like clay in shadow. */
function tint(color: Float32Array, i: number, shade: number) {
  color[i * 3] = shade;
  color[i * 3 + 1] = Math.pow(shade, 1.12);
  color[i * 3 + 2] = Math.pow(shade, 1.3);
}

function smoothProfile(points: number[][], divisions: number) {
  return new SplineCurve(points.map(([r, y]) => new Vector2(r, y))).getSpacedPoints(divisions);
}

/**
 * A smooth lathe around +y through (radius, height) points, listed from the bottom up so that
 * its outside faces out.
 */
function lathe(points: number[][], segments: number, shade?: Shade) {
  const profile = smoothProfile(points, Math.max(points.length * 2, 16));
  const geometry = new LatheGeometry(profile, segments);
  const n = profile.length;
  const along = [0];
  for (let j = 1; j < n; j++) along.push(along[j - 1] + profile[j].distanceTo(profile[j - 1]));
  const widest = Math.max(...profile.map((p) => p.x));
  const around = Math.max(1, Math.round((2 * Math.PI * widest) / STROKE_TILE));
  const uv = geometry.getAttribute('uv').array;
  const color = new Float32Array((segments + 1) * n * 3);
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      uv[k * 2] = (i / segments) * around;
      uv[k * 2 + 1] = along[j] / STROKE_TILE;
      tint(color, k, shade ? shade(profile[j].y, profile[j].x) : 1);
    }
  }
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  return geometry;
}

/** For a lathe outline that rises steadily: its radius at any height. */
function radiusAlong(points: number[][]) {
  const profile = smoothProfile(points, 96);
  return (y: number) => {
    for (let j = 1; j < profile.length; j++) {
      const a = profile[j - 1];
      const b = profile[j];
      if (y <= b.y) return a.x + (b.x - a.x) * MathUtils.clamp((y - a.y) / (b.y - a.y || 1), 0, 1);
    }
    return profile[profile.length - 1].x;
  };
}

// ---- Sweeps --------------------------------------------------------------------------------
// A tube along a path whose round cross-section can grow and shrink: each ring has a center, a
// frame and a radius, and its normals lean along the path by the slope of the radius.

type Ring = {
  center: Vector3;
  along: Vector3;
  /** Two directions across the path, at right angles to it and to each other. */
  u: Vector3;
  v: Vector3;
  radius: number;
  /** How far the normals lean along the path, in radians: 0 points straight out. */
  lean: number;
  texV: number;
  shade: number;
};

function sweep(rings: Ring[], sides: number, tilesAround: number) {
  const count = rings.length * (sides + 1);
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  let k = 0;
  for (const ring of rings) {
    const out = Math.cos(ring.lean);
    const lean = Math.sin(ring.lean);
    for (let j = 0; j <= sides; j++) {
      const phi = (j / sides) * Math.PI * 2;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const ex = c * ring.u.x + s * ring.v.x;
      const ey = c * ring.u.y + s * ring.v.y;
      const ez = c * ring.u.z + s * ring.v.z;
      position[k * 3] = ring.center.x + ex * ring.radius;
      position[k * 3 + 1] = ring.center.y + ey * ring.radius;
      position[k * 3 + 2] = ring.center.z + ez * ring.radius;
      normal[k * 3] = ex * out + ring.along.x * lean;
      normal[k * 3 + 1] = ey * out + ring.along.y * lean;
      normal[k * 3 + 2] = ez * out + ring.along.z * lean;
      uv[k * 2] = (j / sides) * tilesAround;
      uv[k * 2 + 1] = ring.texV;
      tint(color, k, ring.shade);
      k++;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + 1;
      const c = a + sides + 1;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  return geometry;
}

// ---- Head ----------------------------------------------------------------------------------
// A droplet: full and round below with soft cheeks, rising as a straight cone whose tip leans
// over into a thick wave of a curl, hooked toward Pinsan's back left. Head and curl are one
// swept surface, so the curl flows out of the head without a seam. Heights are measured from
// the head's widest point.

/** Height of the head's widest point, where the head's group sits. */
export const HEAD_Y = 1.0;
const HEAD_RADIUS = 0.471;
/** From the widest point down to the bottom of the head, hidden in the collar. */
const CHIN_DROP = 0.328;
/** Where the round of the head gives way to its cone. */
const CONE_START = 0.327;
const CONE_RADIUS = 0.358;
/** Radius lost per unit of height up the cone. */
const CONE_SLOPE = 0.859;
/** The cone starts leaning over into the curl here. */
const CURL_START = 0.55;
/** Front to back the head is a little shallower than it is wide. */
export const HEAD_DEPTH = 0.92;
/** The curl hooks over toward Pinsan's left (+x) and back. */
const CURL_TURN = -0.84;

/** Head radius at height y above its widest point (below the curl). */
export function headRadiusAt(y: number) {
  if (y <= 0) {
    // Squarish below, so the cheeks stay full down to the collar.
    const d = Math.min(-y / CHIN_DROP, 1);
    return HEAD_RADIUS * Math.pow(1 - Math.pow(d, 2.4), 1 / 2.4);
  }
  if (y <= CONE_START) {
    // Eases from the flat widest point into the cone's slope.
    const t = y / CONE_START;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * HEAD_RADIUS +
      (-2 * t3 + 3 * t2) * CONE_RADIUS -
      (t3 - t2) * CONE_SLOPE * CONE_START
    );
  }
  return CONE_RADIUS - CONE_SLOPE * (y - CONE_START);
}

/** The curl's center line and radius: (distance out toward CURL_TURN, height, radius). */
const CURL = [
  [0, 0.45, headRadiusAt(0.45)],
  [0, CURL_START, headRadiusAt(CURL_START)],
  [0.026, 0.603, 0.114],
  [0.088, 0.64, 0.088],
  [0.17, 0.657, 0.066],
  [0.248, 0.65, 0.052],
  [0.305, 0.628, 0.043],
  [0.33, 0.6, 0.037],
  [0.317, 0.578, 0.033],
  [0.29, 0.578, 0.03],
];

const UP = new Vector3(0, 1, 0);
/** Cross-section frame of the upright head: the seam at the back, then round by +x. */
const BACK = new Vector3(0, 0, -1);
const RIGHT = new Vector3(1, 0, 0);

const headShade = shadeToward(-0.2, -CHIN_DROP, 0.3);
/** Tiles of brush strokes around the head's widest point. */
const HEAD_TILES = 7;

function headRings() {
  const rings: Ring[] = [];
  let texV = 0;
  const add = (ring: Omit<Ring, 'texV' | 'shade'>) => {
    const last = rings[rings.length - 1];
    if (last) {
      // Texture runs along the outline, scaled by the radius like the tiles around it, so
      // strokes keep their shape as the curl narrows.
      const step = Math.hypot(ring.center.distanceTo(last.center), ring.radius - last.radius);
      const radius = Math.max((ring.radius + last.radius) / 2, 0.04);
      texV += (step * HEAD_TILES) / (2 * Math.PI * radius);
    }
    rings.push({ ...ring, texV, shade: headShade(ring.center.y, ring.radius) });
  };

  // Round lower head and cone: rings spaced evenly along the outline.
  const steps = 1200;
  const ys: number[] = [];
  const lengths = [0];
  for (let i = 0; i <= steps; i++) ys.push(-CHIN_DROP + ((CURL_START + CHIN_DROP) * i) / steps);
  for (let i = 1; i <= steps; i++) {
    const rise = ys[i] - ys[i - 1];
    lengths.push(lengths[i - 1] + Math.hypot(rise, headRadiusAt(ys[i]) - headRadiusAt(ys[i - 1])));
  }
  const upright = 34;
  for (let n = 0, i = 0; n < upright; n++) {
    const target = (lengths[steps] * n) / upright;
    while (lengths[i + 1] < target) i++;
    const y = ys[i] + ((ys[i + 1] - ys[i]) * (target - lengths[i])) / (lengths[i + 1] - lengths[i]);
    const slope = (headRadiusAt(y + 1e-4) - headRadiusAt(y - 1e-4)) / 2e-4;
    add({
      center: new Vector3(0, y, 0),
      along: UP,
      u: BACK,
      v: RIGHT,
      radius: n === 0 ? 0 : headRadiusAt(y),
      lean: n === 0 ? -Math.PI / 2 : -Math.atan(slope),
    });
  }

  // The curl: from the cone's top along the curve, carrying the frame round with it.
  const curve = new CatmullRomCurve3(CURL.map(([h, y, r]) => new Vector3(h, y, r)));
  const outward = new Vector3(Math.cos(CURL_TURN), 0, Math.sin(CURL_TURN));
  const segments = CURL.length - 1;
  const samples = 36;
  const point = new Vector3();
  const tangent = new Vector3();
  const turn = new Quaternion();
  let along = UP.clone();
  let u = BACK.clone();
  let v = RIGHT.clone();
  for (let i = 0; i <= samples; i++) {
    const t = (1 + ((segments - 1) * i) / samples) / segments;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    const run = Math.hypot(tangent.x, tangent.y);
    const next = new Vector3(tangent.x * outward.x, tangent.y, tangent.x * outward.z).normalize();
    turn.setFromUnitVectors(along, next);
    u = u.clone().applyQuaternion(turn);
    v = v.clone().applyQuaternion(turn);
    along = next;
    add({
      center: new Vector3(point.x * outward.x, point.y, point.x * outward.z),
      along,
      u,
      v,
      radius: point.z,
      lean: -Math.atan(tangent.z / run),
    });
  }

  // A round cap on the tip.
  const tip = rings[rings.length - 1];
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    add({
      center: tip.center.clone().addScaledVector(tip.along, tip.radius * Math.sin(a)),
      along: tip.along,
      u: tip.u,
      v: tip.v,
      radius: tip.radius * Math.cos(a),
      lean: a,
    });
  }
  return rings;
}

export const HEAD_GEOMETRY = sweep(headRings(), 48, HEAD_TILES);

/** How far in front of the head's center its surface is at (x, y), in head coordinates. */
export function surfaceZ(x: number, y: number) {
  const r = headRadiusAt(y);
  return Math.sqrt(Math.max(r * r - x * x, 0)) * HEAD_DEPTH;
}

/** The tilt and turn that lay a flat face part along the head's surface at (x, y). */
export function surfaceAngles(x: number, y: number): [number, number, number, 'YXZ'] {
  const slope = (headRadiusAt(y + 0.01) - headRadiusAt(y - 0.01)) / 0.02;
  const pitch = Math.atan(slope * HEAD_DEPTH);
  const yaw = Math.atan2(x, surfaceZ(x, y) / (HEAD_DEPTH * HEAD_DEPTH));
  return [pitch, yaw, 0, 'YXZ'];
}

// Plump ears on the sides, a little behind the face: soft rounded cones pointing out and up,
// their bases sunk into the head and shaded where they meet it.
export const EAR = { x: 0.4, y: 0.19, z: -0.12, rise: 0.6, forward: 0.15 };
export const EAR_GEOMETRY = lathe(
  [
    [0, -0.06],
    [0.15, -0.06],
    [0.152, 0],
    [0.146, 0.05],
    [0.13, 0.1],
    [0.106, 0.148],
    [0.078, 0.188],
    [0.05, 0.217],
    [0.026, 0.234],
    [0, 0.24],
  ],
  24,
  shadeToward(0.05, -0.04, 0.25),
);

// ---- Face ----------------------------------------------------------------------------------

export const EYE_X = 0.215;
export const EYE_Y = 0.066;
export const EYE_GEOMETRY = new SphereGeometry(0.1, 24, 18);
export const HIGHLIGHT_GEOMETRY = new SphereGeometry(0.022, 12, 10);

/** A thin painted line on the face (brow, closed eye, mouth line). */
function line(points: number[][], radius: number) {
  const path = new CatmullRomCurve3(points.map(([x, y]) => new Vector3(x, y, 0)));
  return new TubeGeometry(path, 16, radius, 6, false);
}

/** Closed happy eyes for `done`: upside-down U arcs. */
export const HAPPY_EYE_GEOMETRY = line(
  [
    [-0.062, -0.022],
    [-0.04, 0.02],
    [0, 0.04],
    [0.04, 0.02],
    [0.062, -0.022],
  ],
  0.017,
);

export const BROW_Y = 0.26;
export const BROW_GEOMETRY = line(
  [
    [-0.058, -0.01],
    [0, 0.012],
    [0.058, -0.01],
  ],
  0.013,
);

// Mouths: the open "D" smile (idle, done), the same shape flipped into a small frown (oops),
// a closed smile line (listening) and a wavy line (thinking).
export const MOUTH_Y = -0.07;
export const MOUTH_GEOMETRY = new CircleGeometry(0.095, 32, Math.PI, Math.PI);
export const TONGUE_GEOMETRY = new CircleGeometry(0.048, 24);
export const SMILE_GEOMETRY = line(
  [
    [-0.048, 0.012],
    [0, -0.012],
    [0.048, 0.012],
  ],
  0.011,
);
export const SQUIGGLE_GEOMETRY = line(
  [
    [-0.05, 0.002],
    [-0.025, 0.013],
    [0.002, -0.002],
    [0.028, -0.013],
    [0.05, 0.002],
  ],
  0.0105,
);

/** A sweat drop for `oops`, point up. */
export const SWEAT = { x: 0.33, y: 0.24 };
export const SWEAT_GEOMETRY = new LatheGeometry(
  [
    [0, -0.05],
    [0.026, -0.044],
    [0.036, -0.025],
    [0.032, 0.002],
    [0.016, 0.032],
    [0, 0.054],
  ].map(([r, y]) => new Vector2(r, y)),
  16,
);

// ---- Body ----------------------------------------------------------------------------------
// A cream shirt under sage overalls: shorts with rolled cuffs, a bib front and back with a
// U-shaped patch pocket, straps over the shoulders buttoned with wooden buttons.

/** Front to back the body is shallower than it is wide. */
export const BODY_DEPTH = 0.8;

const SHIRT_OUTLINE = [
  [0.3, 0.4],
  [0.326, 0.47],
  [0.336, 0.55],
  [0.33, 0.62],
  [0.305, 0.68],
  [0.25, 0.73],
  [0.13, 0.76],
  [0, 0.768],
];
// Overalls from the crotch up to the waist, their top edge tucked against the shirt. Low and
// flat underneath, so the shorts run down to the cuffs without a step.
const OVERALLS_OUTLINE = [
  [0, 0.205],
  [0.16, 0.21],
  [0.27, 0.228],
  [0.326, 0.262],
  [0.346, 0.31],
  [0.352, 0.39],
  [0.347, 0.47],
  [0.341, 0.53],
  [0.339, 0.548],
  [0.331, 0.553],
];

/** In the head's shadow toward the collar. */
const underHead = shadeToward(0.6, 0.74, 0.38);

export const SHIRT_GEOMETRY = lathe(SHIRT_OUTLINE, 40, underHead);
export const OVERALLS_GEOMETRY = lathe(OVERALLS_OUTLINE, 40);

const shirtRadius = radiusAlong(SHIRT_OUTLINE);
const overallsRadius = radiusAlong(OVERALLS_OUTLINE);

type Panel = {
  left: number;
  right: number;
  bottom: number;
  top: number;
  /** Radius of the rounded lower corners (a U when it is half the width). */
  round?: number;
  /** Radius of the rounded upper corners. */
  topRound?: number;
  /** Height above the surface it lies on. */
  lift: number;
  back?: boolean;
  /** Width of the darker seam along its edges. */
  seam?: number;
  /** Depth of the darker hem band along its top. */
  hem?: number;
  shade?: Shade;
};

/** How far a rounded corner of radius r pulls an edge in, `e` along from where it starts. */
function cornerDrop(r: number, e: number) {
  return e > 0 ? r - Math.sqrt(Math.max(r * r - e * e, 0)) : 0;
}

/**
 * A panel lying on a lathe's surface: from x = left to right (as seen from the front) and from
 * `bottom` to `top`, `lift` above the surface, facing out.
 */
function panel(radius: (y: number) => number, p: Panel) {
  const cols = Math.max(6, Math.round((p.right - p.left) / 0.016));
  const rows = Math.max(6, Math.round((p.top - p.bottom) / 0.02));
  const center = (p.left + p.right) / 2;
  const half = (p.right - p.left) / 2;
  const round = p.round ?? 0;
  const topRound = p.topRound ?? 0;
  const facing = p.back ? -1 : 1;
  const count = (cols + 1) * (rows + 1);
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  let k = 0;
  for (let i = 0; i <= cols; i++) {
    const x = p.left + ((p.right - p.left) * i) / cols;
    const off = Math.abs(x - center);
    const low = p.bottom + cornerDrop(round, off - (half - round));
    const high = p.top - cornerDrop(topRound, off - (half - topRound));
    for (let j = 0; j <= rows; j++) {
      const y = low + ((high - low) * j) / rows;
      const r = radius(y) + p.lift;
      const sin = MathUtils.clamp(x / r, -1, 1);
      const cos = Math.sqrt(1 - sin * sin) * facing;
      const slope = (radius(y + 0.005) - radius(y - 0.005)) / 0.01;
      const length = Math.hypot(1, slope);
      position.set([x, y, r * cos], k * 3);
      normal.set([sin / length, -slope / length, cos / length], k * 3);
      uv.set([x / STROKE_TILE, y / STROKE_TILE], k * 2);
      const edge = Math.min(half - off, y - low, high - y);
      let shade = p.shade ? p.shade(y, r) : 1;
      if (p.seam) shade *= 1 - 0.16 * (1 - MathUtils.smoothstep(edge, 0, p.seam));
      if (p.hem && y > high - p.hem) shade *= 0.88;
      tint(color, k, shade);
      k++;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + rows + 1;
      if (p.back) index.push(a, a + 1, b, b, a + 1, b + 1);
      else index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(color, 3));
  return geometry;
}

export const STRAP_X = 0.2;
const STRAP_HALF = 0.043;
const BIB_LIFT = 0.014;
const bibShade = shadeToward(0.56, 0.61, 0.16);
const strap = (side: -1 | 1, back: boolean) =>
  panel(shirtRadius, {
    left: side * STRAP_X - STRAP_HALF,
    right: side * STRAP_X + STRAP_HALF,
    bottom: 0.57,
    top: 0.725,
    lift: 0.024,
    back,
    seam: 0.008,
    shade: underHead,
  });

/** Bib front and back plus the four strap ends, all one piece of overalls. */
export const BIB_GEOMETRY = mergeGeometries([
  panel(shirtRadius, {
    left: -0.24,
    right: 0.24,
    bottom: 0.525,
    top: 0.605,
    topRound: 0.03,
    lift: BIB_LIFT,
    seam: 0.012,
    shade: bibShade,
  }),
  panel(shirtRadius, {
    left: -0.2,
    right: 0.2,
    bottom: 0.525,
    top: 0.6,
    topRound: 0.03,
    lift: BIB_LIFT,
    back: true,
    seam: 0.012,
    shade: bibShade,
  }),
  strap(-1, false),
  strap(1, false),
  strap(-1, true),
  strap(1, true),
]);

/** The U-shaped patch pocket on the belly, after the detail sheet: hemmed top, sewn edges. */
export const POCKET_GEOMETRY = panel(overallsRadius, {
  left: -0.155,
  right: 0.155,
  bottom: 0.335,
  top: 0.52,
  round: 0.09,
  lift: 0.009,
  seam: 0.014,
  hem: 0.03,
});

/** Where each strap buttons onto the bib, and the turn that faces a button outward. */
export const BUTTON_SPOT = (() => {
  const y = 0.557;
  const r = shirtRadius(y) + BIB_LIFT + 0.004;
  const yaw = Math.asin(STRAP_X / r);
  return { y, z: r * Math.cos(yaw), yaw };
})();

// A wooden button: a dished face inside a raised rim, and four holes.
export const BUTTON_GEOMETRY = lathe(
  [
    [0, -0.006],
    [0.044, -0.006],
    [0.048, 0.004],
    [0.044, 0.011],
    [0.036, 0.013],
    [0.03, 0.009],
    [0, 0.01],
  ],
  20,
);
export const BUTTON_HOLES_GEOMETRY = mergeGeometries(
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([a, b]) =>
    new CylinderGeometry(0.0058, 0.0058, 0.004, 10).translate(a * 0.011, 0.01, b * 0.011),
  ),
);

// ---- Arms ----------------------------------------------------------------------------------
// Each arm hangs from inside the shoulder, out and down, and swings about it. The short sleeve
// grows out of the shirt and flares to a rolled hem; the thick arm comes out of it and ends in
// a mitten hand with a thumb toward the front.

export const SHOULDER = { x: 0.27, y: 0.6, hang: 0.62 };

// Puffed: fullest halfway down, then gathered into a rolled hem around the arm.
export const SLEEVE_GEOMETRY = lathe(
  [
    [0.088, -0.108],
    [0.093, -0.124],
    [0.103, -0.133],
    [0.113, -0.131],
    [0.117, -0.12],
    [0.116, -0.104],
    [0.119, -0.075],
    [0.12, -0.04],
    [0.115, -0.005],
    [0.103, 0.028],
    [0.082, 0.053],
    [0.048, 0.068],
    [0, 0.073],
  ],
  32,
  (y, r) => (r < 0.1 && y < -0.1 ? 0.55 : underHead(SHOULDER.y + y, r)),
);

export const ARM_GEOMETRY = lathe(
  [
    [0, -0.412],
    [0.034, -0.408],
    [0.065, -0.395],
    [0.09, -0.37],
    [0.1, -0.338],
    [0.102, -0.3],
    [0.095, -0.262],
    [0.086, -0.226],
    [0.086, -0.18],
    [0.085, -0.12],
    [0.08, -0.07],
    [0.056, -0.045],
    [0, -0.04],
  ],
  28,
  shadeToward(-0.15, -0.08, 0.42),
);

export const THUMB_GEOMETRY = lathe(
  [
    [0, -0.046],
    [0.026, -0.04],
    [0.038, -0.018],
    [0.04, 0.008],
    [0.03, 0.032],
    [0, 0.046],
  ],
  12,
);

// ---- Legs ----------------------------------------------------------------------------------
// Each leg swings from the hip: a shorts leg ending in a rolled cuff, and a round boot of a
// foot with a flat sole. Heights are from the hip.

// The shorts legs nearly meet in the middle; the feet splay out a little wider.
export const HIP_X = 0.177;
export const HIP_Y = 0.33;
/** The foot sits a little forward of the leg and out to the side. */
export const FOOT_FORWARD = 0.035;
export const FOOT_SPLAY = 0.036;

export const LEG_GEOMETRY = lathe(
  [
    [0.156, -0.11],
    [0.161, -0.06],
    [0.161, 0],
    [0.156, 0.05],
    [0.148, 0.08],
  ],
  32,
);
export const CUFF_GEOMETRY = lathe(
  [
    [0.148, -0.163],
    [0.16, -0.161],
    [0.169, -0.15],
    [0.172, -0.128],
    [0.169, -0.106],
    [0.16, -0.095],
    [0.148, -0.092],
  ],
  32,
  (y) => (y < -0.156 ? 0.8 : 1),
);
/** The foot, from its sole up; its height is from the ground. */
export const FOOT_GEOMETRY = lathe(
  [
    [0, 0],
    [0.116, 0],
    [0.145, 0.01],
    [0.16, 0.034],
    [0.165, 0.064],
    [0.16, 0.098],
    [0.142, 0.128],
    [0.11, 0.153],
    [0.065, 0.17],
    [0, 0.176],
  ],
  32,
  shadeToward(0.115, 0.17, 0.4),
);
/** Front to back the foot is longer than it is wide. */
export const FOOT_LENGTH = 1.28;

// ---- Contact shadows -----------------------------------------------------------------------

/** A flat square on the ground; a soft round shadow texture draws in it. */
export const SHADOW_GEOMETRY = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
