import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Helpers for building the island out of small faceted pieces. Every piece is placed in
// world space, painted with per-face vertex colors and merged into one mesh, so the whole
// static scene costs a single draw call however much detail it has.

export type Rng = () => number;

export function seeded(seed: number): Rng {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function between(rng: Rng, min: number, max: number) {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

// Position-based noise, so corners shared by separate faces move together and no cracks open.
function hash(x: number, y: number, z: number, salt: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + salt * 19.19) * 43758.5453;
  return h - Math.floor(h);
}

/** Push every vertex a little in a random direction, for an uneven hand-made look. */
export function lumpy<T extends BufferGeometry>(geometry: T, amount: number, salt = 0): T {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = Math.round(pos.getX(i) * 1000) / 1000;
    const y = Math.round(pos.getY(i) * 1000) / 1000;
    const z = Math.round(pos.getZ(i) * 1000) / 1000;
    pos.setXYZ(
      i,
      x + (hash(x, y, z, salt) - 0.5) * 2 * amount,
      y + (hash(x, y, z, salt + 1) - 0.5) * 2 * amount,
      z + (hash(x, y, z, salt + 2) - 0.5) * 2 * amount,
    );
  }
  pos.needsUpdate = true;
  return geometry;
}

type Transform = {
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
};

const matrix = new Matrix4();
const rotation = new Quaternion();
const euler = new Euler();
const offset = new Vector3();
const scale = new Vector3();

/** Move a geometry into world space. Tilts (rx, rz) apply first, then the turn (ry). */
export function place<T extends BufferGeometry>(
  geometry: T,
  x: number,
  y: number,
  z: number,
  { rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s }: Transform = {},
): T {
  euler.set(rx, ry, rz, 'YXZ');
  rotation.setFromEuler(euler);
  matrix.compose(offset.set(x, y, z), rotation, scale.set(sx, sy, sz));
  geometry.applyMatrix4(matrix);
  return geometry;
}

export type Face = { x: number; y: number; z: number; ny: number };
type Paint = string | ((face: Face, rng: Rng) => string);

const base = new Color();

/**
 * Give every face its own shade, slightly lighter when it faces the sky, so faceted shapes
 * read like brushwork. Converts to non-indexed geometry with position, normal and color.
 */
export function paint(geometry: BufferGeometry, color: Paint, rng: Rng, variation = 0.08) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  if (g.hasAttribute('uv')) g.deleteAttribute('uv');
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const normal = g.getAttribute('normal');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    const face = {
      x: (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
      y: (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
      z: (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
      ny: (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3,
    };
    base.set(typeof color === 'string' ? color : color(face, rng));
    const shade = 1 + (rng() - 0.5) * 2 * variation + Math.max(face.ny, 0) * 0.1;
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = base.r * shade;
      colors[(i + k) * 3 + 1] = base.g * shade;
      colors[(i + k) * 3 + 2] = base.b * shade;
    }
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}

/**
 * Copy an already painted piece into place. Far cheaper than building and painting it again,
 * so small repeated things (grass, flowers, pebbles) are painted a few times and stamped.
 */
export function stamp(
  template: BufferGeometry,
  x: number,
  y: number,
  z: number,
  transform?: Transform,
) {
  return place(template.clone(), x, y, z, transform);
}

export function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Island pieces have mismatched attributes and could not merge.');
  return merged;
}
