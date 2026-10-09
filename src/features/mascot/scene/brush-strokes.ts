import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type BufferGeometry,
} from 'three';

import { seeded } from './geometry';

// Pinsan's painted look, after the texture swatches in the character detail sheet: short,
// squarish dabs of paint in a few shades, laid in two diagonal directions so they criss-cross.
// Each material gets a small tileable texture made in code, so there are no image assets.

const SIZE = 128;

function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** A tileable texture of paint dabs. The first color is the base the dabs are laid over. */
export function brushStrokes(palette: readonly string[], seed: number) {
  const rng = seeded(seed);
  const colors = palette.map(rgb);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    data.set([...colors[0], 255], i * 4);
  }
  for (let n = 0; n < 520; n++) {
    const color = colors[Math.floor(rng() * colors.length)];
    const cx = Math.floor(rng() * SIZE);
    const cy = Math.floor(rng() * SIZE);
    // Two families of strokes, about 40° either side of horizontal, with a little wobble.
    const angle = (rng() < 0.5 ? 0.7 : -0.7) + (rng() - 0.5) * 0.4;
    const length = 5 + rng() * 3; // half-length, in pixels
    const width = 2 + rng() * 1; // half-width
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const reach = Math.ceil(length);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const u = (dx * cos + dy * sin) / length;
        const v = (dy * cos - dx * sin) / width;
        // A squarish dab with rounded corners, like a flat brush.
        if (u ** 4 + v ** 4 > 1) continue;
        // Wrap around the edges so the texture tiles without seams.
        const x = (((cx + dx) % SIZE) + SIZE) % SIZE;
        const y = (((cy + dy) % SIZE) + SIZE) % SIZE;
        data.set(color, (y * SIZE + x) * 4);
      }
    }
  }
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Scale a geometry's texture coordinates so one tile of strokes covers about the same area
 * on every part, however its coordinates are laid out: `u` around, `v` along.
 */
export function strokeScale<T extends BufferGeometry>(geometry: T, u: number, v: number): T {
  const uv = geometry.getAttribute('uv').array;
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] *= u;
    uv[i + 1] *= v;
  }
  return geometry;
}
