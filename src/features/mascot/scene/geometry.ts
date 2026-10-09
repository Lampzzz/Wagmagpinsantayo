import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix3,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Helpers for building the island out of small faceted pieces. Every piece is placed in
// world space, painted with per-face vertex colors and merged into one mesh, so the whole
// static scene costs a single draw call however much detail it has.
//
// The loops work on the raw vertex arrays rather than three's per-vertex accessors (getX,
// setXYZ, fromBufferAttribute): on Hermes those calls dominate the island's build time.

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
  const position = geometry.getAttribute('position');
  const p = position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = Math.round(p[i] * 1000) / 1000;
    const y = Math.round(p[i + 1] * 1000) / 1000;
    const z = Math.round(p[i + 2] * 1000) / 1000;
    p[i] = x + (hash(x, y, z, salt) - 0.5) * 2 * amount;
    p[i + 1] = y + (hash(x, y, z, salt + 1) - 0.5) * 2 * amount;
    p[i + 2] = z + (hash(x, y, z, salt + 2) - 0.5) * 2 * amount;
  }
  position.needsUpdate = true;
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
const normalMatrix = new Matrix3();
const rotation = new Quaternion();
const euler = new Euler();
const offset = new Vector3();
const scale = new Vector3();

/** Apply a matrix to the positions and normals, like BufferGeometry.applyMatrix4. */
function transform(geometry: BufferGeometry, m: Matrix4) {
  const e = m.elements;
  const position = geometry.getAttribute('position');
  const p = position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i];
    const y = p[i + 1];
    const z = p[i + 2];
    p[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    p[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    p[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
  position.needsUpdate = true;

  const normal = geometry.getAttribute('normal');
  if (!normal) return;
  const n = normalMatrix.getNormalMatrix(m).elements;
  const q = normal.array;
  for (let i = 0; i < q.length; i += 3) {
    const x = q[i];
    const y = q[i + 1];
    const z = q[i + 2];
    const nx = n[0] * x + n[3] * y + n[6] * z;
    const ny = n[1] * x + n[4] * y + n[7] * z;
    const nz = n[2] * x + n[5] * y + n[8] * z;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    q[i] = nx / length;
    q[i + 1] = ny / length;
    q[i + 2] = nz / length;
  }
  normal.needsUpdate = true;
}

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
  transform(geometry, matrix);
  return geometry;
}

export type Face = { x: number; y: number; z: number; ny: number };
type Paint = string | ((face: Face, rng: Rng) => string);

// Parsing a color string is slow next to everything else here, and the island paints about
// 50k faces from a few dozen colors, so each color is parsed once.
const parsed = new Map<string, Color>();

function colorOf(style: string) {
  let color = parsed.get(style);
  if (!color) {
    color = new Color(style);
    parsed.set(style, color);
  }
  return color;
}

const face: Face = { x: 0, y: 0, z: 0, ny: 0 };

/**
 * Give every face its own shade, slightly lighter when it faces the sky, so faceted shapes
 * read like brushwork. Converts to non-indexed geometry with position, normal and color.
 */
export function paint(geometry: BufferGeometry, color: Paint, rng: Rng, variation = 0.08) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  if (g.hasAttribute('uv')) g.deleteAttribute('uv');
  const p = g.getAttribute('position').array;
  const normals = new Float32Array(p.length);
  const colors = new Float32Array(p.length);
  // One triangle (three corners, nine numbers) per step.
  for (let i = 0; i < p.length; i += 9) {
    // Flat normal (c − b) × (a − b), as three's computeVertexNormals works it out.
    const bx = p[i + 3];
    const by = p[i + 4];
    const bz = p[i + 5];
    const abx = p[i] - bx;
    const aby = p[i + 1] - by;
    const abz = p[i + 2] - bz;
    const cbx = p[i + 6] - bx;
    const cby = p[i + 7] - by;
    const cbz = p[i + 8] - bz;
    let nx = cby * abz - cbz * aby;
    let ny = cbz * abx - cbx * abz;
    let nz = cbx * aby - cby * abx;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;

    face.x = (p[i] + bx + p[i + 6]) / 3;
    face.y = (p[i + 1] + by + p[i + 7]) / 3;
    face.z = (p[i + 2] + bz + p[i + 8]) / 3;
    face.ny = ny;
    const base = colorOf(typeof color === 'string' ? color : color(face, rng));
    const shade = 1 + (rng() - 0.5) * 2 * variation + Math.max(ny, 0) * 0.1;
    for (let k = i; k < i + 9; k += 3) {
      normals[k] = nx;
      normals[k + 1] = ny;
      normals[k + 2] = nz;
      colors[k] = base.r * shade;
      colors[k + 1] = base.g * shade;
      colors[k + 2] = base.b * shade;
    }
  }
  g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
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
