import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
} from 'three';

import { between, lumpy, paint, pick, place, stamp, type Rng } from './geometry';
import { ISLAND_MAP } from './island-map';
import { LANDMARKS, angleGap, edgeRadiusAt, pondRadiusAt, terrainAt } from './layout';

const STONE = ['#CFC6B8', '#C2B8A9', '#D8CEBF', '#BDB2A3'] as const;
const MOSS = ['#9DB352', '#8AA84A'] as const;
const PEBBLE = ['#D8CDBE', '#C9BCAA', '#E2D6C4', '#BFB2A0'] as const;
const WOOD = ['#A9773F', '#9B6B37', '#B88446', '#8E6232'] as const;

type Piece = { rx?: number; rz?: number };

/** A prop's own frame: place pieces in local coordinates, turned by `ry` around its origin. */
function frame(parts: BufferGeometry[], rng: Rng, ox: number, oz: number, ry: number) {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return (
    geometry: BufferGeometry,
    lx: number,
    ly: number,
    lz: number,
    color: string,
    piece: Piece = {},
  ) => {
    place(geometry, ox + lx * c + lz * s, ly, oz - lx * s + lz * c, { ...piece, ry });
    parts.push(paint(geometry, color, rng, 0.07));
  };
}

function rocks(parts: BufferGeometry[], rng: Rng) {
  for (const [x, z, r] of ISLAND_MAP.boulders) {
    const boulder = lumpy(new IcosahedronGeometry(r, 1), r * 0.14, Math.round(x * 31 + z * 17));
    place(boulder, x, r * 0.28, z, { ry: rng() * Math.PI, sy: 0.72 });
    parts.push(
      paint(
        boulder,
        (f, r2) => (f.ny > 0.55 && r2() < 0.4 ? pick(r2, MOSS) : pick(r2, STONE)),
        rng,
        0.09,
      ),
    );
  }

  const stone = (x: number, z: number, size: number) => {
    const g = lumpy(new IcosahedronGeometry(size, 0), size * 0.15, Math.round(x * 53 + z * 29));
    place(g, x, size * 0.3, z, { ry: rng() * Math.PI, sy: 0.75 });
    parts.push(paint(g, pick(rng, STONE), rng, 0.09));
  };
  // A ring of stones around the pond, open where the stream leaves to the south.
  const [px, pz] = ISLAND_MAP.pondCenter;
  ISLAND_MAP.pondOutline.forEach((_, i) => {
    const a = (i / ISLAND_MAP.pondOutline.length) * Math.PI * 2;
    if (angleGap(a, Math.PI / 2) < 0.32) return;
    const r = pondRadiusAt(a) + 0.1;
    stone(px + Math.cos(a) * r, pz + Math.sin(a) * r, between(rng, 0.17, 0.27));
  });
  // Stones along both stream banks, except under the bridge.
  for (const [lx, lz, rx, rz] of ISLAND_MAP.streamBanks) {
    if (Math.abs(lz - LANDMARKS.bridge[1]) < 0.45) continue;
    stone(lx - 0.12, lz, between(rng, 0.13, 0.24));
    stone(rx + 0.12, rz, between(rng, 0.13, 0.24));
  }

  // Pebbles on the paths, mostly near their edges: a few painted shapes, stamped.
  const pebbles = PEBBLE.map((color, i) =>
    paint(lumpy(new IcosahedronGeometry(1, 0), 0.2, i), color, rng, 0.08),
  );
  let placed = 0;
  for (let tries = 0; placed < 260 && tries < 5000; tries++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 7.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (terrainAt(x, z) !== 'path') continue;
    const edge =
      ['grass', 'outside'].includes(terrainAt(x + 0.35, z)) ||
      terrainAt(x - 0.35, z) === 'grass' ||
      terrainAt(x, z + 0.35) === 'grass' ||
      terrainAt(x, z - 0.35) === 'grass';
    if (!edge && rng() > 0.35) continue;
    const size = between(rng, 0.04, 0.09);
    parts.push(
      stamp(pick(rng, pebbles), x, size * 0.2, z, {
        ry: rng() * Math.PI,
        s: size,
        sy: size * 0.55,
      }),
    );
    placed++;
  }
}

function bench(parts: BufferGeometry[], rng: Rng) {
  const put = frame(parts, rng, LANDMARKS.bench[0], LANDMARKS.bench[1], ISLAND_MAP.benchRotation);
  for (const dz of [-0.13, 0, 0.13])
    put(new BoxGeometry(1.1, 0.05, 0.11), 0, 0.44, dz, pick(rng, WOOD));
  for (const dx of [-0.42, 0.42]) put(new BoxGeometry(0.08, 0.42, 0.36), dx, 0.21, 0, '#8E6232');

  const [sx, sz] = LANDMARKS.stump;
  parts.push(
    paint(place(new CylinderGeometry(0.26, 0.32, 0.32, 9), sx, 0.16, sz), '#8E6A45', rng, 0.08),
  );
  parts.push(
    paint(place(new CylinderGeometry(0.24, 0.24, 0.02, 9), sx, 0.33, sz), '#D2A86A', rng, 0.05),
  );
}

function noticeBoard(parts: BufferGeometry[], rng: Rng) {
  const put = frame(parts, rng, LANDMARKS.noticeBoard[0], LANDMARKS.noticeBoard[1], -0.6);
  for (const dx of [-0.62, 0.62]) put(new BoxGeometry(0.1, 1.75, 0.1), dx, 0.875, 0, '#8E6232');
  put(new BoxGeometry(1.2, 0.8, 0.07), 0, 1.05, 0, '#9A6A38');
  const notes = [
    [-0.33, 1.15, 0.05],
    [0, 1.2, -0.06],
    [0.32, 1.1, 0.04],
    [-0.12, 0.86, -0.03],
  ];
  for (const [dx, y, tilt] of notes)
    put(new BoxGeometry(0.22, 0.26, 0.012), dx, y, 0.045, pick(rng, ['#F3EBD5', '#FFF6E0']), {
      rz: tilt,
    });
  put(new BoxGeometry(1.55, 0.06, 0.52), 0, 1.79, 0, '#6FA2A0', { rx: 0.32 });
  put(new BoxGeometry(1.5, 0.04, 0.48), 0, 1.75, 0.01, '#5E928F', { rx: 0.32 });

  const box = frame(parts, rng, LANDMARKS.mailbox[0], LANDMARKS.mailbox[1], -0.6);
  box(new BoxGeometry(0.08, 0.95, 0.08), 0, 0.475, 0, '#8E6232');
  box(new BoxGeometry(0.3, 0.24, 0.44), 0, 1.05, 0, '#B98A4E');
  box(
    new CylinderGeometry(0.15, 0.15, 0.44, 8, 1, false, Math.PI / 2, Math.PI),
    0,
    1.17,
    0,
    '#B98A4E',
    { rx: Math.PI / 2 },
  );
  box(new BoxGeometry(0.03, 0.2, 0.06), 0.17, 1.15, 0.05, '#D9534F');
}

function lantern(parts: BufferGeometry[], rng: Rng) {
  const put = frame(parts, rng, LANDMARKS.lantern[0], LANDMARKS.lantern[1], 0.6);
  put(new BoxGeometry(0.09, 1.9, 0.09), 0, 0.95, 0, '#6F4E2E');
  put(new BoxGeometry(0.42, 0.06, 0.06), 0.19, 1.86, 0, '#6F4E2E');
  put(new BoxGeometry(0.015, 0.08, 0.015), 0.36, 1.8, 0, '#3B2E22');
  put(new BoxGeometry(0.16, 0.22, 0.16), 0.36, 1.66, 0, '#FFE08A');
  put(new ConeGeometry(0.13, 0.09, 4), 0.36, 1.81, 0, '#4B3A2A');
}

function gardenBed(parts: BufferGeometry[], rng: Rng) {
  const put = frame(parts, rng, LANDMARKS.gardenBed[0], LANDMARKS.gardenBed[1], 0);
  const w = 1.6;
  const d = 1.8;
  for (const dz of [-d / 2, d / 2])
    put(new BoxGeometry(w, 0.24, 0.08), 0, 0.12, dz, pick(rng, WOOD));
  for (const dx of [-w / 2, w / 2])
    put(new BoxGeometry(0.08, 0.24, d), dx, 0.12, 0, pick(rng, WOOD));
  put(new BoxGeometry(w - 0.08, 0.14, d - 0.08), 0, 0.1, 0, '#6B4A2F');
  for (const z of [-0.63, -0.21, 0.21, 0.63]) {
    put(
      lumpy(new IcosahedronGeometry(0.17, 1), 0.02, Math.round(z * 10)),
      -0.5,
      0.27,
      z,
      pick(rng, ['#8FBF5A', '#7DB04E']),
    );
    put(new CylinderGeometry(0.045, 0.035, 0.06, 6), 0, 0.2, z, '#E8873A');
    for (const a of [0, 2.1, 4.2])
      put(
        new ConeGeometry(0.025, 0.18, 3, 1, true),
        Math.cos(a) * 0.03,
        0.31,
        z + Math.sin(a) * 0.03,
        '#7DB04E',
        { rx: Math.sin(a) * 0.35, rz: -Math.cos(a) * 0.35 },
      );
    put(
      lumpy(new IcosahedronGeometry(0.16, 1), 0.02, Math.round(z * 10) + 5),
      0.5,
      0.26,
      z,
      pick(rng, ['#8C6FA8', '#7E5F9A']),
    );
  }
}

function bridge(parts: BufferGeometry[], rng: Rng) {
  const put = frame(parts, rng, LANDMARKS.bridge[0], LANDMARKS.bridge[1], 0);
  const arc = (x: number) => 0.14 + 0.2 * (1 - (x / 0.72) ** 2);
  for (let i = 0; i < 8; i++) {
    const x = -0.62 + i * 0.177;
    const slope = (-0.4 * x) / 0.72 ** 2;
    put(new BoxGeometry(0.16, 0.06, 0.9), x, arc(x), 0, pick(rng, WOOD), { rz: Math.atan(slope) });
  }
  for (const dx of [-0.7, 0.7]) {
    for (const dz of [-0.44, 0.44]) {
      put(new BoxGeometry(0.13, 0.62, 0.13), dx, 0.31, dz, '#9B6B37');
      put(new BoxGeometry(0.17, 0.06, 0.17), dx, 0.64, dz, '#B88446');
    }
  }
  const stops = [-0.7, -0.23, 0.23, 0.7];
  for (const dz of [-0.44, 0.44]) {
    for (let i = 0; i < stops.length - 1; i++) {
      const x0 = stops[i];
      const x1 = stops[i + 1];
      const y0 = arc(x0) + 0.38;
      const y1 = arc(x1) + 0.38;
      const length = Math.hypot(x1 - x0, y1 - y0);
      put(new BoxGeometry(length, 0.06, 0.07), (x0 + x1) / 2, (y0 + y1) / 2, dz, '#A9773F', {
        rz: Math.atan2(y1 - y0, x1 - x0),
      });
    }
  }
}

function fences(parts: BufferGeometry[], rng: Rng) {
  for (const [a0, a1] of ISLAND_MAP.fences) {
    const posts: [number, number][] = [];
    const length = Math.abs(a1 - a0) * 7.5;
    const count = Math.max(2, Math.round(length / 0.6) + 1);
    for (let k = 0; k < count; k++) {
      const a = a0 + ((a1 - a0) * k) / (count - 1);
      const r = edgeRadiusAt(a) - 0.42;
      posts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    posts.forEach(([x, z], k) => {
      parts.push(paint(place(new BoxGeometry(0.09, 0.55, 0.09), x, 0.27, z), '#8E6232', rng, 0.07));
      if (k === 0) return;
      const [px, pz] = posts[k - 1];
      const dx = x - px;
      const dz = z - pz;
      const ry = -Math.atan2(dz, dx);
      for (const y of [0.22, 0.42]) {
        const rail = new BoxGeometry(Math.hypot(dx, dz), 0.05, 0.05);
        parts.push(
          paint(place(rail, (x + px) / 2, y, (z + pz) / 2, { ry }), pick(rng, WOOD), rng, 0.07),
        );
      }
    });
  }
}

function waterfallLip(parts: BufferGeometry[], rng: Rng) {
  const [wx, wz] = LANDMARKS.waterfall;
  for (let i = 0; i < 5; i++) {
    const foam = new IcosahedronGeometry(between(rng, 0.08, 0.14), 0);
    place(foam, wx + between(rng, -0.3, 0.3), 0.04, wz + between(rng, -0.15, 0.1), { sy: 0.5 });
    parts.push(paint(foam, '#F4FAFF', rng, 0.04));
  }
}

export function buildProps(parts: BufferGeometry[], rng: Rng) {
  rocks(parts, rng);
  bench(parts, rng);
  noticeBoard(parts, rng);
  lantern(parts, rng);
  gardenBed(parts, rng);
  bridge(parts, rng);
  fences(parts, rng);
  waterfallLip(parts, rng);
}
