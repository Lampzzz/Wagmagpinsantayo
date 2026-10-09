import { ISLAND_MAP } from './island-map';
import {
  LANDMARKS,
  PINSAN_HOME,
  angleOf,
  bridgeDeckHeight,
  edgeRadiusAt,
  terrainAt,
} from './layout';

// Where Pinsan can walk: the baked terrain grid minus the water, the rim and everything that
// stands on the island, plus the bridge. A* over it prefers the dirt paths to the grass.

export type Point = [number, number];

const SIZE = ISLAND_MAP.terrainSize;
const HALF = ISLAND_MAP.textureHalfSize;
const CELL = (2 * HALF) / SIZE;
const [CX, CZ] = ISLAND_MAP.textureCenter;
const [BX, BZ] = LANDMARKS.bridge;

/** Half of Pinsan's width plus a little air, kept clear of anything solid. */
const BODY = 0.28;
/** Stay this far inside the island's edge, clear of the rim bushes and fences. */
const RIM = 0.95;
/** Stay this far from water cells, clear of the bank stones and reeds. */
const WATER_GAP = 0.7;
const GRASS_COST = 1.5;

function centerOf(cell: number): Point {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  return [CX - HALF + (col + 0.5) * CELL, CZ - HALF + (row + 0.5) * CELL];
}

function cellAt(x: number, z: number) {
  const col = Math.floor((x - CX + HALF) / CELL);
  const row = Math.floor((z - CZ + HALF) / CELL);
  if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return -1;
  return row * SIZE + col;
}

/** The walkway over the stream: one cell wide, running east–west across the deck. */
function onBridge(x: number, z: number) {
  return Math.abs(x - BX) < 0.95 && Math.abs(z - BZ) < 0.2;
}

/** Solid things as circles [x, z, radius], without Pinsan's own width. */
function solidThings() {
  const things: [number, number, number][] = ISLAND_MAP.boulders.map(([x, z, r]) => [
    x,
    z,
    r * 1.1,
  ]);
  const { oliveTrunk, cypressA, cypressB, stump, bench, noticeBoard, mailbox, lantern } = LANDMARKS;
  things.push(
    [oliveTrunk[0], oliveTrunk[1], 0.82],
    [oliveTrunk[0] + 0.3, oliveTrunk[1], 0.45],
    [cypressA[0], cypressA[1], 0.6 * 1.08],
    [cypressB[0], cypressB[1], 0.6 * 0.94],
    [stump[0], stump[1], 0.32],
    [mailbox[0], mailbox[1], 0.25],
    [lantern[0], lantern[1], 0.1],
  );
  // Long props become a row of circles along their length, turned like the prop.
  const along = ([ox, oz]: Point, ry: number, xs: number[], r: number) => {
    for (const lx of xs) things.push([ox + lx * Math.cos(ry), oz - lx * Math.sin(ry), r]);
  };
  along(bench, ISLAND_MAP.benchRotation, [-0.42, 0, 0.42], 0.22);
  along(noticeBoard, -0.6, [-0.62, -0.31, 0, 0.31, 0.62], 0.12);
  return things;
}

function nearWater(row: number, col: number) {
  const reach = Math.ceil(WATER_GAP / CELL);
  for (let dr = -reach; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      if (Math.hypot(dr, dc) * CELL > WATER_GAP) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && c >= 0 && r < SIZE && c < SIZE && ISLAND_MAP.terrain[r][c] === '3') return true;
    }
  }
  return false;
}

/** Eight neighbors: row step, column step, length. */
const STEPS = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [1, 1, Math.SQRT2],
] as const;

/** Calls `visit` for each open neighbor, never cutting a blocked corner diagonally. */
function neighbors(
  cost: Float32Array,
  cell: number,
  visit: (next: number, length: number) => void,
) {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  for (const [dr, dc, length] of STEPS) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE || !cost[r * SIZE + c]) continue;
    if (dr && dc && (!cost[row * SIZE + c] || !cost[r * SIZE + col])) continue;
    visit(r * SIZE + c, length);
  }
}

/** The open cell nearest to (x, z), within `reach` world units, or -1. */
function nearest(cost: Float32Array, x: number, z: number, reach: number) {
  const col = Math.floor((x - CX + HALF) / CELL);
  const row = Math.floor((z - CZ + HALF) / CELL);
  const span = Math.ceil(reach / CELL) + 1;
  let best = -1;
  let bestDistance = reach;
  for (let r = Math.max(row - span, 0); r <= Math.min(row + span, SIZE - 1); r++) {
    for (let c = Math.max(col - span, 0); c <= Math.min(col + span, SIZE - 1); c++) {
      if (!cost[r * SIZE + c]) continue;
      const [cx, cz] = centerOf(r * SIZE + c);
      const d = Math.hypot(cx - x, cz - z);
      if (d < bestDistance) {
        best = r * SIZE + c;
        bestDistance = d;
      }
    }
  }
  return best;
}

/** Close off pockets Pinsan can't reach from home, such as grass between the lily pads. */
function keepReachable(cost: Float32Array) {
  const start = nearest(cost, PINSAN_HOME[0], PINSAN_HOME[2], 2);
  const seen = new Uint8Array(cost.length);
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    neighbors(cost, queue.pop()!, (next) => {
      if (seen[next]) return;
      seen[next] = 1;
      queue.push(next);
    });
  }
  for (let i = 0; i < cost.length; i++) if (!seen[i]) cost[i] = 0;
}

/** Walking cost per cell: 0 where Pinsan can't stand, 1 on paths, more on grass. */
function buildCosts() {
  const cost = new Float32Array(SIZE * SIZE);
  const things = solidThings();
  const [gx, gz] = LANDMARKS.gardenBed;
  for (let cell = 0; cell < cost.length; cell++) {
    const [x, z] = centerOf(cell);
    if (onBridge(x, z)) {
      cost[cell] = 1;
      continue;
    }
    const ground = terrainAt(x, z);
    if (ground !== 'grass' && ground !== 'path') continue;
    if (Math.hypot(x, z) > edgeRadiusAt(angleOf(x, z)) - RIM) continue;
    if (nearWater(Math.floor(cell / SIZE), cell % SIZE)) continue;
    if (Math.abs(x - gx) < 0.8 + BODY && Math.abs(z - gz) < 0.9 + BODY) continue;
    if (things.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + BODY)) continue;
    cost[cell] = ground === 'path' ? 1 : GRASS_COST;
  }
  keepReachable(cost);
  return cost;
}

const COST = buildCosts();
const OPEN: number[] = [];
COST.forEach((c, i) => c && OPEN.push(i));

function isOpen(x: number, z: number) {
  const cell = cellAt(x, z);
  return cell >= 0 && COST[cell] > 0;
}

/** Height of the ground under (x, z): zero, except up and over the bridge. */
export function groundHeight(x: number, z: number) {
  return Math.abs(z - BZ) < 0.45 ? bridgeDeckHeight(x - BX) : 0;
}

export function randomOpenPoint(): Point {
  const [x, z] = centerOf(OPEN[Math.floor(Math.random() * OPEN.length)]);
  return [x + (Math.random() - 0.5) * CELL * 0.6, z + (Math.random() - 0.5) * CELL * 0.6];
}

/** A small binary min-heap of cells, ordered by the priority each was pushed with. */
class Queue {
  private cells: number[] = [];
  private keys: number[] = [];

  get size() {
    return this.cells.length;
  }

  push(cell: number, key: number) {
    let i = this.cells.length;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.cells[i] = this.cells[parent];
      this.keys[i] = this.keys[parent];
      i = parent;
    }
    this.cells[i] = cell;
    this.keys[i] = key;
  }

  pop() {
    const top = this.cells[0];
    const cell = this.cells.pop()!;
    const key = this.keys.pop()!;
    const n = this.cells.length;
    if (n === 0) return top;
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= n) break;
      if (child + 1 < n && this.keys[child + 1] < this.keys[child]) child++;
      if (this.keys[child] >= key) break;
      this.cells[i] = this.cells[child];
      this.keys[i] = this.keys[child];
      i = child;
    }
    this.cells[i] = cell;
    this.keys[i] = key;
    return top;
  }
}

function aStar(start: number, goal: number) {
  const [gx, gz] = centerOf(goal);
  const guess = (cell: number) => {
    const [x, z] = centerOf(cell);
    return Math.hypot(x - gx, z - gz) / CELL; // cheapest possible: all path, cost 1
  };
  const spent = new Float32Array(COST.length).fill(Infinity);
  const cameFrom = new Int32Array(COST.length).fill(-1);
  const done = new Uint8Array(COST.length);
  const queue = new Queue();
  spent[start] = 0;
  queue.push(start, guess(start));
  while (queue.size) {
    const cell = queue.pop();
    if (cell === goal) break;
    if (done[cell]) continue;
    done[cell] = 1;
    neighbors(COST, cell, (next, length) => {
      const cost = spent[cell] + (length * (COST[cell] + COST[next])) / 2;
      if (cost >= spent[next]) return;
      spent[next] = cost;
      cameFrom[next] = cell;
      queue.push(next, cost + guess(next));
    });
  }
  if (spent[goal] === Infinity) return null;
  const cells = [goal];
  while (cells[cells.length - 1] !== start) cells.push(cameFrom[cells[cells.length - 1]]);
  return cells.reverse();
}

/** Two passes of a three-point average turn the grid's zigzags into gentle curves. */
function smooth(points: Point[]) {
  let out = points;
  for (let pass = 0; pass < 2; pass++) {
    out = out.map((p, i) => {
      if (i === 0 || i === out.length - 1) return p;
      const [ax, az] = out[i - 1];
      const [bx, bz] = out[i + 1];
      return [(ax + 2 * p[0] + bx) / 4, (az + 2 * p[1] + bz) / 4];
    });
  }
  return out;
}

/**
 * Waypoints from `from` to the open spot nearest `to` (within 2 units), or null if there's
 * no way there. The path ends exactly at `to` when Pinsan can stand there.
 */
export function findPath(from: Point, to: Point): Point[] | null {
  const start = nearest(COST, from[0], from[1], 2);
  const goal = nearest(COST, to[0], to[1], 2);
  if (start < 0 || goal < 0) return null;
  const cells = aStar(start, goal);
  if (!cells) return null;
  const points = cells.map(centerOf);
  if (isOpen(to[0], to[1])) points[points.length - 1] = to;
  return smooth(points);
}
