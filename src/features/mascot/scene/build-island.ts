import type { BufferGeometry } from 'three';

import { buildCliffs } from './build-cliffs';
import { buildPlants } from './build-plants';
import { buildProps } from './build-props';
import { merge, seeded } from './geometry';
import { bakeLight } from './lighting';

let cached: BufferGeometry | null = null;

/**
 * Everything static on the island as one geometry, its colors already lit by the sun, so it
 * draws unlit. Built once, then reused.
 */
export function islandDecor() {
  if (cached) return cached;
  const started = performance.now();
  const rng = seeded(20261009);
  const parts: BufferGeometry[] = [];
  buildCliffs(parts, rng);
  buildPlants(parts, rng);
  buildProps(parts, rng);
  cached = bakeLight(merge(parts));
  if (__DEV__) {
    const triangles = cached.getAttribute('position').count / 3;
    const ms = Math.round(performance.now() - started);
    console.log(`Island built: ${parts.length} pieces, ${triangles} triangles, ${ms} ms`);
  }
  return cached;
}
