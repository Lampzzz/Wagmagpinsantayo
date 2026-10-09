import { ISLAND_MAP } from './island-map';

// Lookups over the baked island map. World units: x east, z south, y up.

export const LANDMARKS = ISLAND_MAP.landmarks;

/** Pinsan's standing spot: on the path just west of the bridge, facing south (the camera). */
export const PINSAN_HOME: [number, number, number] = [
  LANDMARKS.pinsanHome[0],
  0,
  LANDMARKS.pinsanHome[1],
];

const TWO_PI = Math.PI * 2;

function radiusFrom(radii: readonly number[], angle: number) {
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const f = (a / TWO_PI) * radii.length;
  const i = Math.floor(f);
  const t = f - i;
  return radii[i % radii.length] * (1 - t) + radii[(i + 1) % radii.length] * t;
}

/** Distance from the island center to its edge, for an angle measured from +x toward +z. */
export function edgeRadiusAt(angle: number) {
  return radiusFrom(ISLAND_MAP.outline, angle);
}

export function pondRadiusAt(angle: number) {
  return radiusFrom(ISLAND_MAP.pondOutline, angle);
}

export type Terrain = 'outside' | 'grass' | 'path' | 'water';
const TERRAIN: Record<string, Terrain> = {
  '0': 'outside',
  '1': 'grass',
  '2': 'path',
  '3': 'water',
};

export function terrainAt(x: number, z: number): Terrain {
  const { textureHalfSize: half, textureCenter, terrainSize, terrain } = ISLAND_MAP;
  const col = Math.floor(((x - textureCenter[0] + half) / (2 * half)) * terrainSize);
  const row = Math.floor(((z - textureCenter[1] + half) / (2 * half)) * terrainSize);
  if (row < 0 || col < 0 || row >= terrainSize || col >= terrainSize) return 'outside';
  return TERRAIN[terrain[row][col]];
}

export function angleOf(x: number, z: number) {
  return Math.atan2(z, x);
}

/** Smallest difference between two angles, in radians. */
export function angleGap(a: number, b: number) {
  const d = Math.abs((((a - b) % TWO_PI) + TWO_PI) % TWO_PI);
  return Math.min(d, TWO_PI - d);
}
