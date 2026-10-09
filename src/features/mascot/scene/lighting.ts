import { Color, Vector3, type BufferGeometry } from 'three';

// The scene's one light setup: a golden-afternoon sun from the upper left, a warm sky and a
// grassy bounce from below. Pinsan moves, so the matching lights in mascot-3d light it live.
// The island never moves, so the same light is baked into its vertex colors once and it
// renders unlit: its 52k triangles then cost almost nothing per pixel.

export const LIGHTS = {
  ambient: { color: '#FFF4E2', intensity: 0.55 },
  sky: { color: '#FFF1D6', ground: '#B5C77A', intensity: 1.4 },
  sun: { color: '#FFE6BC', intensity: 1.9, position: [-6, 10, 6] as [number, number, number] },
};

const SUN_DIRECTION = new Vector3(...LIGHTS.sun.position).normalize();
const AMBIENT = new Color(LIGHTS.ambient.color).multiplyScalar(LIGHTS.ambient.intensity);
const SKY = new Color(LIGHTS.sky.color).multiplyScalar(LIGHTS.sky.intensity);
const GROUND = new Color(LIGHTS.sky.ground).multiplyScalar(LIGHTS.sky.intensity);
const SUN = new Color(LIGHTS.sun.color).multiplyScalar(LIGHTS.sun.intensity);

/**
 * The light reaching a surface that faces (nx, ny, nz), added up the way three.js's lit
 * materials do it (ambient + hemisphere + sun through a Lambert diffuse), as a color to
 * multiply a surface color by.
 */
export function lightFacing(nx: number, ny: number, nz: number, out = new Color()) {
  const skyward = 0.5 * ny + 0.5;
  const sunward = Math.max(nx * SUN_DIRECTION.x + ny * SUN_DIRECTION.y + nz * SUN_DIRECTION.z, 0);
  out.r = (AMBIENT.r + GROUND.r + (SKY.r - GROUND.r) * skyward + SUN.r * sunward) / Math.PI;
  out.g = (AMBIENT.g + GROUND.g + (SKY.g - GROUND.g) * skyward + SUN.g * sunward) / Math.PI;
  out.b = (AMBIENT.b + GROUND.b + (SKY.b - GROUND.b) * skyward + SUN.b * sunward) / Math.PI;
  return out;
}

const light = new Color();

/** Multiply every face's color by the light it gets, then drop the normals, now unused. */
export function bakeLight(geometry: BufferGeometry) {
  const n = geometry.getAttribute('normal').array;
  const color = geometry.getAttribute('color');
  const c = color.array;
  // Faces are flat (non-indexed, one normal per face), so the first corner speaks for all three.
  for (let i = 0; i < n.length; i += 9) {
    lightFacing(n[i], n[i + 1], n[i + 2], light);
    for (let k = i; k < i + 9; k += 3) {
      c[k] *= light.r;
      c[k + 1] *= light.g;
      c[k + 2] *= light.b;
    }
  }
  color.needsUpdate = true;
  geometry.deleteAttribute('normal');
  return geometry;
}
