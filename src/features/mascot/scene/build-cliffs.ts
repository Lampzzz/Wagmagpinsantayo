import { BufferGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry } from 'three';

import { between, lumpy, paint, pick, place, type Face, type Rng } from './geometry';
import { LANDMARKS, angleGap, angleOf, edgeRadiusAt } from './layout';

// The underside: rings of faceted stone columns that get taller toward the middle, so the
// island tapers to a point like the reference. The outer ring leaves a notch for the falls.

const STONE = ['#D6C4A6', '#CBB898', '#C4B4A0', '#D1C2B6', '#BEAB91'] as const;
const LEDGE_GREEN = ['#7FA448', '#8DB352', '#6E9842', '#9DBD58'] as const;

const RINGS = [
  { count: 64, at: 0.95, inset: 0.25, radius: [0.55, 0.75], height: [1.6, 2.8], top: -0.22 },
  { count: 46, at: 0.76, inset: 0, radius: [0.7, 0.95], height: [3.0, 4.4], top: -0.35 },
  { count: 30, at: 0.55, inset: 0, radius: [0.8, 1.05], height: [4.4, 5.8], top: -0.5 },
  { count: 16, at: 0.33, inset: 0, radius: [0.9, 1.1], height: [5.8, 7.2], top: -0.6 },
  { count: 6, at: 0.12, inset: 0, radius: [0.9, 1.1], height: [7.2, 8.6], top: -0.6 },
] as const;

const WATERFALL_ANGLE = angleOf(LANDMARKS.waterfall[0], LANDMARKS.waterfall[1]);

function stoneShade(color: string) {
  return (face: Face) => {
    // Lower faces sit in the island's own shadow.
    const depth = Math.min(Math.max(-face.y / 9, 0), 1);
    return depth > 0.55 && face.ny < 0 ? '#A99A86' : color;
  };
}

export function buildCliffs(parts: BufferGeometry[], rng: Rng) {
  RINGS.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = ((i + rng() * 0.5) / ring.count) * Math.PI * 2 + ringIndex * 0.37;
      if (ringIndex === 0 && angleGap(angle, WATERFALL_ANGLE) < 0.11) continue;
      const r = edgeRadiusAt(angle) * ring.at - ring.inset;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const radius = between(rng, ring.radius[0], ring.radius[1]);
      const height = between(rng, ring.height[0], ring.height[1]);
      const top = ring.top + between(rng, -0.06, 0.06);
      const spin = rng() * Math.PI;
      const color = pick(rng, STONE);

      const column = new CylinderGeometry(
        radius * between(rng, 0.9, 1),
        radius * 0.78,
        height,
        6,
        2,
      );
      lumpy(column, 0.07, i + ringIndex * 100);
      place(column, x, top - height / 2, z, { ry: spin });
      parts.push(paint(column, stoneShade(color), rng, 0.09));

      const tipHeight = height * between(rng, 0.25, 0.45);
      const tip = new ConeGeometry(radius * 0.78, tipHeight, 6);
      place(tip, x, top - height - tipHeight / 2, z, { rx: Math.PI, ry: spin });
      parts.push(paint(tip, '#B3A38D', rng, 0.09));

      // Plants growing out of the outer columns' faces, partly sunk into the rock.
      if (ringIndex <= 1 && rng() < 0.45) {
        const size = between(rng, 0.16, 0.3);
        const out = radius * 0.8;
        const plant = new IcosahedronGeometry(size, 0);
        place(
          plant,
          x + Math.cos(angle) * out,
          top - between(rng, 0.2, 1.4),
          z + Math.sin(angle) * out,
          {
            sy: 0.8,
          },
        );
        parts.push(paint(plant, pick(rng, LEDGE_GREEN), rng, 0.1));
      }
    }
  });

  // A few rocks floating below the island.
  for (let i = 0; i < 7; i++) {
    const angle = rng() * Math.PI * 2;
    const r = between(rng, 1.5, 5.5);
    const rock = new IcosahedronGeometry(between(rng, 0.2, 0.5), 0);
    lumpy(rock, 0.06, 500 + i);
    place(rock, Math.cos(angle) * r, between(rng, -12.5, -9), Math.sin(angle) * r, {
      rx: rng() * 3,
      ry: rng() * 3,
    });
    parts.push(paint(rock, pick(rng, STONE), rng, 0.1));
  }
}
