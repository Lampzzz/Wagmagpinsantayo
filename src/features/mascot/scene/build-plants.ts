import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Vector2,
} from 'three';

import { between, lumpy, merge, paint, pick, place, stamp, type Face, type Rng } from './geometry';
import { ISLAND_MAP } from './island-map';
import { LANDMARKS, angleGap, angleOf, edgeRadiusAt, pondRadiusAt, terrainAt } from './layout';

const BARK = ['#8E6A45', '#7E5C3B', '#9A7650'] as const;
const OLIVE_LEAVES = ['#A9B86A', '#97AB5C', '#B9C278', '#88A056'] as const;
const CYPRESS = ['#6F9046', '#5F8240', '#7C9C50', '#557637'] as const;
const BUSH = ['#7FA74A', '#6E9842', '#8DB352', '#9CBF5A'] as const;
const GRASS = ['#86B04A', '#97BD52', '#76A043', '#A6C65C'] as const;
const LAVENDER = ['#8E7CC9', '#9D86D6', '#7F6DBB', '#A893DC'] as const;
const STEM = '#6F9A3E';

const WATERFALL_ANGLE = angleOf(LANDMARKS.waterfall[0], LANDMARKS.waterfall[1]);

function oliveTree(parts: BufferGeometry[], rng: Rng) {
  const [tx, tz] = LANDMARKS.oliveTrunk;
  const [cx, cz] = LANDMARKS.oliveCanopy;
  const bark = (face: Face) => (face.ny > 0.6 ? '#A5845C' : pick(rng, BARK));

  // Flared roots, two twisting trunks and four main branches.
  parts.push(
    paint(
      place(lumpy(new CylinderGeometry(0.42, 0.78, 0.55, 8, 1), 0.06, 1), tx, 0.27, tz),
      bark,
      rng,
    ),
  );
  parts.push(
    paint(
      place(lumpy(new CylinderGeometry(0.26, 0.4, 2.0, 7, 3), 0.07, 2), tx - 0.08, 1.35, tz, {
        rz: 0.14,
        rx: -0.12,
      }),
      bark,
      rng,
    ),
  );
  parts.push(
    paint(
      place(lumpy(new CylinderGeometry(0.2, 0.3, 1.8, 6, 3), 0.06, 3), tx + 0.28, 1.25, tz + 0.05, {
        rz: -0.38,
        rx: 0.1,
      }),
      bark,
      rng,
    ),
  );
  const branches = [
    [0.9, 0.0, 0.95],
    [-0.9, 0.2, 0.9],
    [0.2, -0.95, 0.85],
    [-0.1, 0.95, 0.9],
  ];
  for (const [bx, bz, tilt] of branches) {
    const branch = new CylinderGeometry(0.07, 0.13, 1.5, 5, 2);
    const yaw = Math.atan2(bx, bz);
    place(branch, tx + bx * 0.55, 2.55, tz + bz * 0.55, { rx: tilt, ry: yaw });
    parts.push(paint(branch, bark, rng));
  }

  // Canopy: many small leaf clumps in a wide dome rather than one big ball.
  for (let i = 0; i < 34; i++) {
    const a = rng() * Math.PI * 2;
    const spread = Math.sqrt(rng());
    const lift = between(rng, 0, 1.1) * (1 - spread * 0.55);
    const size = between(rng, 0.5, 0.82);
    const clump = lumpy(new IcosahedronGeometry(size, 1), size * 0.12, 10 + i);
    place(clump, cx + Math.cos(a) * spread * 2.0, 2.8 + lift, cz + Math.sin(a) * spread * 1.8, {
      sy: 0.78,
    });
    parts.push(
      paint(
        clump,
        (face, r) => (face.ny > 0.55 && r() < 0.35 ? '#D3CC6C' : pick(r, OLIVE_LEAVES)),
        rng,
        0.1,
      ),
    );
  }
}

function cypress(parts: BufferGeometry[], rng: Rng, x: number, z: number, size: number) {
  const profile = [
    [0.05, 0],
    [0.46, 0.3],
    [0.62, 1.0],
    [0.6, 1.8],
    [0.52, 2.6],
    [0.4, 3.3],
    [0.25, 3.9],
    [0.08, 4.4],
    [0, 4.6],
  ].map(([r, y]) => new Vector2(r * size, y * size));
  parts.push(
    paint(place(new CylinderGeometry(0.1, 0.13, 0.5, 6), x, 0.25, z), pick(rng, BARK), rng),
  );
  const body = lumpy(new LatheGeometry(profile, 9), 0.07 * size, Math.round(x * 100));
  place(body, x, 0.35, z, { ry: rng() * Math.PI });
  parts.push(
    paint(
      body,
      (face, r) => (face.ny > 0.35 && r() < 0.4 ? '#93AE5E' : pick(r, CYPRESS)),
      rng,
      0.1,
    ),
  );
}

function rimBushes(parts: BufferGeometry[], rng: Rng) {
  const perimeter = Math.PI * 2 * 7.8;
  const count = Math.round(perimeter / 0.55);
  for (let i = 0; i < count; i++) {
    const angle = ((i + rng() * 0.6) / count) * Math.PI * 2;
    if (angleGap(angle, WATERFALL_ANGLE) < 0.12) continue;
    const r = edgeRadiusAt(angle) - between(rng, 0.25, 0.5);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (terrainAt(x, z) === 'path') continue;
    const size = between(rng, 0.28, 0.5);
    const bush = lumpy(new IcosahedronGeometry(size, 1), size * 0.12, 200 + i);
    place(bush, x, size * 0.45, z, { sy: 0.75 });
    parts.push(
      paint(
        bush,
        (face, r2) => (face.ny > 0.6 && r2() < 0.12 ? '#E8CF4A' : pick(r2, BUSH)),
        rng,
        0.1,
      ),
    );
  }
}

type Templates = {
  tufts: BufferGeometry[];
  lavender: BufferGeometry[];
  daisies: BufferGeometry[];
  buttercups: BufferGeometry[];
};

/** A grass tuft at the origin, about 0.2 tall: four blades leaning outward. */
function tuftTemplate(rng: Rng) {
  const blades = [0, 1, 2, 3].map((b) => {
    const a = (b / 4) * Math.PI * 2 + rng();
    const h = 0.2 * between(rng, 0.7, 1.1);
    const blade = new ConeGeometry(0.03, h, 3, 1, true);
    place(blade, Math.cos(a) * 0.04, h / 2, Math.sin(a) * 0.04, {
      rx: Math.sin(a) * 0.4,
      rz: -Math.cos(a) * 0.4,
    });
    const tip = (face: Face, r: Rng) =>
      face.y > h * 0.7 && r() < 0.5 ? '#C9D46A' : pick(r, GRASS);
    return paint(blade, tip, rng, 0.1);
  });
  return merge(blades);
}

function lavenderTemplate(rng: Rng, color: string) {
  const h = 0.3;
  return merge([
    paint(place(new CylinderGeometry(0.012, 0.016, h, 3), 0, h / 2, 0), STEM, rng),
    paint(place(new ConeGeometry(0.045, 0.24, 5), 0, h + 0.1, 0), color, rng, 0.1),
  ]);
}

function daisyTemplate(rng: Rng, h: number) {
  return merge([
    paint(place(new CylinderGeometry(0.008, 0.01, h, 3), 0, h / 2, 0), STEM, rng),
    paint(place(new CylinderGeometry(0.065, 0.06, 0.014, 8), 0, h, 0), '#FBF8EE', rng, 0.04),
    paint(
      place(new CylinderGeometry(0.022, 0.022, 0.024, 6), 0, h + 0.012, 0),
      '#F2B92E',
      rng,
      0.04,
    ),
  ]);
}

function buttercupTemplate(rng: Rng, h: number) {
  return merge([
    paint(place(new CylinderGeometry(0.008, 0.01, h, 3), 0, h / 2, 0), STEM, rng),
    paint(place(new CylinderGeometry(0.048, 0.026, 0.04, 6), 0, h, 0), '#F6C531', rng, 0.06),
  ]);
}

/** Paint a few versions of each small repeated plant once, to stamp hundreds of times. */
function templates(rng: Rng): Templates {
  return {
    tufts: [0, 1, 2, 3].map(() => tuftTemplate(rng)),
    lavender: LAVENDER.map((color) => lavenderTemplate(rng, color)),
    daisies: [0.12, 0.16, 0.2].map((h) => daisyTemplate(rng, h)),
    buttercups: [0.09, 0.13, 0.17].map((h) => buttercupTemplate(rng, h)),
  };
}

function flowers(parts: BufferGeometry[], rng: Rng, t: Templates) {
  const spread = (r: number) => between(rng, -1, 1) * r;
  for (const [x, z, radius, count] of ISLAND_MAP.lavender) {
    const n = Math.min(Math.max(Math.round(count / 120), 4), 12);
    const r = Math.max(radius, 0.15) * 0.8;
    for (let i = 0; i < n; i++) {
      parts.push(
        stamp(pick(rng, t.lavender), x + spread(r), 0, z + spread(r), {
          ry: rng() * Math.PI * 2,
          sy: between(rng, 0.75, 1.3),
        }),
      );
    }
    parts.push(stamp(pick(rng, t.tufts), x, 0, z, { ry: rng() * Math.PI * 2, s: 1.1 }));
  }
  for (const [x, z, radius, count] of ISLAND_MAP.daisies) {
    const n = Math.min(Math.max(Math.round(count / 60), 2), 6);
    const r = Math.max(radius, 0.1);
    for (let i = 0; i < n; i++) {
      parts.push(
        stamp(pick(rng, t.daisies), x + spread(r), 0, z + spread(r), { ry: rng() * 6.28 }),
      );
    }
  }
  for (const [x, z, radius, count] of ISLAND_MAP.buttercups) {
    const n = Math.min(Math.max(Math.round(count / 50), 1), 4);
    const r = Math.max(radius, 0.08);
    for (let i = 0; i < n; i++) {
      parts.push(
        stamp(pick(rng, t.buttercups), x + spread(r), 0, z + spread(r), { ry: rng() * 6.28 }),
      );
    }
  }
}

function grassTufts(parts: BufferGeometry[], rng: Rng, t: Templates) {
  let placed = 0;
  for (let tries = 0; placed < 380 && tries < 4000; tries++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 7.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (r > edgeRadiusAt(a) - 0.4 || terrainAt(x, z) !== 'grass') continue;
    parts.push(stamp(pick(rng, t.tufts), x, 0, z, { ry: rng() * 6.28, s: between(rng, 0.7, 1.3) }));
    placed++;
  }
}

function pondPlants(parts: BufferGeometry[], rng: Rng) {
  for (const [x, z, r] of ISLAND_MAP.lilyPads) {
    parts.push(
      paint(
        place(new CylinderGeometry(r, r, 0.04, 12), x, 0.02, z),
        (f) => (f.ny > 0.5 ? '#9BCB62' : '#6F9E45'),
        rng,
        0.05,
      ),
    );
  }
  // Reeds around the pond's edge, leaving the stream mouth open.
  const [px, pz] = ISLAND_MAP.pondCenter;
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    if (angleGap(a, Math.PI / 2) < 0.4) continue;
    const r = pondRadiusAt(a) + 0.18;
    const x = px + Math.cos(a) * r;
    const z = pz + Math.sin(a) * r;
    for (let b = 0; b < 3; b++) {
      const h = between(rng, 0.35, 0.6);
      const reed = new ConeGeometry(0.025, h, 3, 1, true);
      place(reed, x + between(rng, -0.06, 0.06), h / 2, z + between(rng, -0.06, 0.06), {
        rx: between(rng, -0.2, 0.2),
        rz: between(rng, -0.2, 0.2),
      });
      parts.push(paint(reed, pick(rng, GRASS), rng, 0.1));
    }
  }
}

export function buildPlants(parts: BufferGeometry[], rng: Rng) {
  oliveTree(parts, rng);
  cypress(parts, rng, LANDMARKS.cypressA[0], LANDMARKS.cypressA[1], 1.08);
  cypress(parts, rng, LANDMARKS.cypressB[0], LANDMARKS.cypressB[1], 0.94);
  rimBushes(parts, rng);
  const t = templates(rng);
  flowers(parts, rng, t);
  grassTufts(parts, rng, t);
  pondPlants(parts, rng);
}
