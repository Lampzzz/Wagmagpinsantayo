import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

import { seeded } from './geometry';

// Pinsan's painted look, after the texture swatches on the character detail sheet but kept
// quiet: broad strokes with soft edges, in shades close to the base color, a little warmer or
// cooler each. They run mostly along each part's texture "around" direction, so they wrap the
// form. Each material gets a small tileable texture made in code, so there are no image assets.

const SIZE = 128;
const STROKES = 150;

function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * A tileable texture of soft paint strokes over a base color. `spread` is how far a stroke's
 * shade strays from the base (0.05 is up to 5% lighter or darker).
 */
export function brushStrokes(base: string, seed: number, spread: number) {
  const rng = seeded(seed);
  const [r0, g0, b0] = rgb(base);
  const paint = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < SIZE * SIZE; i++) paint.set([r0, g0, b0], i * 3);

  for (let n = 0; n < STROKES; n++) {
    const shade = 1 + (rng() * 2 - 1) * spread;
    // Warmer strokes get a little more red and less blue, cooler ones the reverse.
    const warm = (rng() * 2 - 1) * spread * 0.6;
    const color = [r0 * shade * (1 + warm), g0 * shade, b0 * shade * (1 - warm)];
    const cx = Math.floor(rng() * SIZE);
    const cy = Math.floor(rng() * SIZE);
    const angle = (rng() - 0.5) * 1.1;
    const length = 9 + rng() * 6; // half-length, in pixels
    const width = 4.5 + rng() * 2.5; // half-width
    const strength = 0.6 + rng() * 0.3;
    // One long edge of each stroke catches the light a touch, like a ridge of paint.
    const ridge = rng() < 0.5 ? 0.03 : -0.03;
    const cos = Math.cos(angle) / length;
    const sin = Math.sin(angle) / length;
    const across = length / width;
    const [cr, cg, cb] = color;
    // Visit only the box the turned stroke covers.
    const reachX = Math.ceil(Math.abs(cos * length) * length + Math.abs(sin * length) * width);
    const reachY = Math.ceil(Math.abs(sin * length) * length + Math.abs(cos * length) * width);
    for (let dy = -reachY; dy <= reachY; dy++) {
      for (let dx = -reachX; dx <= reachX; dx++) {
        const u = dx * cos + dy * sin;
        const v = (dy * cos - dx * sin) * across;
        // A flat brush's dab: squarish with rounded corners, fading out softly at its edges.
        const u2 = u * u;
        const v2 = v * v;
        const d = u2 * u2 + v2 * v2;
        if (d >= 1) continue;
        const alpha = strength * (1 - smoothstep(0.45, 1, d));
        const shade = 1 + ridge * v;
        // Wrap around the edges so the texture tiles without seams.
        const i = (((cy + dy + SIZE) % SIZE) * SIZE + ((cx + dx + SIZE) % SIZE)) * 3;
        paint[i] += (cr * shade - paint[i]) * alpha;
        paint[i + 1] += (cg * shade - paint[i + 1]) * alpha;
        paint[i + 2] += (cb * shade - paint[i + 2]) * alpha;
      }
    }
  }

  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let c = 0; c < 3; c++) {
      data[i * 4 + c] = Math.round(Math.min(Math.max(paint[i * 3 + c], 0), 1) * 255);
    }
    data[i * 4 + 3] = 255;
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

/** A soft round shadow for under Pinsan: densest in the middle, fading smoothly to nothing. */
export function softShadow() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const i = (y * size + x) * 4;
      data.set([255, 255, 255, Math.round(Math.pow(Math.max(1 - d * d, 0), 2) * 255)], i);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
