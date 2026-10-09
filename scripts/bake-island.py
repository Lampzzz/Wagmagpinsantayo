"""Bake the floating island's ground texture and layout data from the top-down map.

    python scripts/bake-island.py docs/design/island-map.png [debug-overlay.png]

Needs Pillow and NumPy (`pip install pillow numpy`). Writes:

- assets/scene/island-ground.jpg: the ground (grass, paths, pond, stream) with the objects
  that become 3D props painted out, and soft shadows painted under them.
- src/features/mascot/scene/island-map.ts: outline, boulders, flower clumps, landmarks and a
  coarse terrain grid, in world units. Run `npm run format` afterwards.

The map is the AI-generated top-down reference in docs/design. It has a 10 x 10 grid; the
landmark positions below are read off that grid in cells from the top-left corner.
North is up and the waterfall is south.
"""

import json
import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
TEXTURE_OUT = ROOT / 'assets/scene/island-ground.jpg'
DATA_OUT = ROOT / 'src/features/mascot/scene/island-map.ts'

GRID_CELLS = 10
WORLD_PER_CELL = 1.75  # Pinsan is 1.65 tall, so the island is about 10 Pinsans across
TEXTURE_SIZE = 1024
OUTLINE_SAMPLES = 120
TERRAIN_SIZE = 64

LANDMARKS = {
    'oliveTrunk': (2.95, 2.75),
    'oliveCanopy': (2.87, 2.31),
    'bench': (3.91, 2.91),
    'stump': (3.51, 3.37),
    'cypressA': (6.45, 1.65),
    'cypressB': (7.16, 2.25),
    'noticeBoard': (7.74, 3.68),
    'mailbox': (8.48, 3.68),
    'gardenBed': (2.11, 6.66),
    'lantern': (2.87, 6.06),
    'bridge': (5.10, 6.42),
    'waterfall': (5.10, 9.09),
    'pinsanHome': (4.45, 6.30),
}
LILY_PADS = [(4.84, 4.61, 0.18), (5.15, 4.87, 0.18), (4.87, 5.03, 0.17)]
BENCH_AXIS = (70, -40)  # the bench's long axis on the map, in pixels
# Fence runs along the rim, as map angles in degrees (0 = east, 90 = south).
FENCES = [(-160, -145), (165, 181), (-44, -30), (-16, -2), (22, 37), (51, 65)]

# Areas painted out of the ground because a 3D prop stands there (cells).
ERASE_CIRCLES = [
    (2.87, 2.40, 1.12),  # olive canopy and trunk
    (6.45, 1.60, 0.45),  # cypress A
    (7.16, 2.18, 0.45),  # cypress B
    (3.51, 3.37, 0.18),  # stump
    (2.87, 6.06, 0.15),  # lantern
]
ERASE_RECTS = [  # center x, center y, width, height
    (3.91, 2.91, 0.75, 0.55),  # bench (rotated, so a loose box)
    (7.74, 3.68, 0.80, 0.40),  # notice board
    (8.48, 3.68, 0.30, 0.35),  # mailbox
    (2.11, 6.66, 1.00, 1.12),  # garden bed
    (5.10, 6.42, 0.78, 0.52),  # bridge
]
# Soft painted shadows: center x, center y, radius, strength (cells). Light is from the north-west.
PROP_SHADOWS = [
    (3.10, 2.70, 1.15, 0.38),  # olive canopy
    (6.62, 1.90, 0.50, 0.40),  # cypress A
    (7.33, 2.50, 0.50, 0.40),  # cypress B
    (3.95, 2.98, 0.40, 0.22),  # bench
    (7.78, 3.80, 0.42, 0.25),  # notice board
    (2.15, 6.72, 0.62, 0.18),  # garden bed
]


def classify(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Background blue, including the darker grid lines (about 135, 186, 236).
    sky = (b > 200) & (r > 100) & (g > 160) & (b - r > 60) & (b - g > 20) & (b - g < 70)
    water = ~sky & (b > 150) & (b - r > 90) & (g > 110)
    path = ~sky & ~water & (r > 190) & (g > 150) & (b < 140) & (r - b > 70) & (r >= g - 10)
    # Boulders are a warm pinkish grey, around (210, 188, 172).
    stone = ~sky & ~water & (r > 150) & (b > 140) & (r - g > 4) & (r - g < 36) & (g - b > -4) & (g - b < 32)
    lavender = (b > r + 15) & (r > g + 15) & (b > 120) & ~water
    daisy = (r > 235) & (g > 235) & (b > 225)
    buttercup = (r > 225) & (g > 195) & (b < 70) & (r - g < 45)
    return sky, water, path, stone, lavender, daisy, buttercup


def flood(mask, start):
    """Pixels of `mask` 4-connected to `start`."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    queue = deque([start])
    seen[start] = True
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def components(mask, min_area):
    """Connected components as (cy, cx, area, (y0, x0, y1, x1)), largest first."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    found = []
    for y0, x0 in np.argwhere(mask):
        if seen[y0, x0]:
            continue
        queue = deque([(y0, x0)])
        seen[y0, x0] = True
        ys, xs = [], []
        while queue:
            y, x = queue.popleft()
            ys.append(y)
            xs.append(x)
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(ys) >= min_area:
            found.append((float(np.mean(ys)), float(np.mean(xs)), len(ys), (min(ys), min(xs), max(ys), max(xs))))
    return sorted(found, key=lambda c: -c[2])


def box_blur(a, r):
    k = 2 * r + 1
    pad = ((r + 1, r), (r + 1, r)) + ((0, 0),) * (a.ndim - 2)
    c = np.pad(a, pad, mode='edge').cumsum(0).cumsum(1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def shift_or(mask, r):
    """Dilate a boolean mask by r pixels (square)."""
    return box_blur(mask.astype(np.float32), r) > 1e-6


def shrink(mask, r):
    """Erode a boolean mask by r pixels (square)."""
    return box_blur(mask.astype(np.float32), r) > 1 - 1e-6


def ray_lengths(inside, cx, cy, samples, limit, skip=0.0):
    """Distance from (cx, cy) to the first pixel where `inside` is false, per angle.
    Pixels closer than `skip` never stop a ray (lily pads in the middle of the pond)."""
    h, w = inside.shape
    lengths = []
    for i in range(samples):
        a = 2 * math.pi * i / samples
        r = 0.0
        while r < limit:
            x, y = int(round(cx + math.cos(a) * r)), int(round(cy + math.sin(a) * r))
            if not (0 <= x < w and 0 <= y < h) or (r >= skip and not inside[y, x]):
                break
            r += 1.0
        lengths.append(r)
    return np.array(lengths)


def main():
    src = Path(sys.argv[1])
    debug_out = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    image = Image.open(src).convert('RGB')
    rgb = np.asarray(image).astype(np.float32)
    h, w, _ = rgb.shape
    cell = w / GRID_CELLS
    yy, xx = np.mgrid[0:h, 0:w]

    sky, water, path, stone, lavender, daisy, buttercup = classify(rgb)
    outside = flood(sky, (0, 0))
    island = ~outside
    water = water | (sky & island)  # light glints in the pond read as sky
    cy, cx = (float(v) for v in np.argwhere(island).mean(0))

    def to_world(px, py):
        return ((px - cx) / cell * WORLD_PER_CELL, (py - cy) / cell * WORLD_PER_CELL)

    def cells_to_world(c):
        return to_world(c[0] * cell, c[1] * cell)

    # Outline: distance from the center to the first outside pixel, per angle.
    radii = ray_lengths(island, cx, cy, OUTLINE_SAMPLES, w)
    n = len(radii)
    median = np.array([np.median(np.take(radii, range(i - 4, i + 5), mode='wrap')) for i in range(n)])
    smooth = np.array([np.mean(np.take(median, range(i - 1, i + 2), mode='wrap')) for i in range(n)])
    outline = [round(float(r) / cell * WORLD_PER_CELL, 3) for r in smooth]

    # Pond: radius per angle around the pond's middle, ignoring the stream's long rays.
    water_clean = shrink(shift_or(water, 2), 2) & island
    pond_px = (5.01 * cell, 4.95 * cell)
    pond_rays = ray_lengths(water_clean, pond_px[0], pond_px[1], 36, 3 * cell, skip=0.6 * cell)
    cap = np.median(pond_rays) * 1.25
    pond_rays = np.minimum(pond_rays, cap)
    pond_outline = [round(float(r) / cell * WORLD_PER_CELL, 3) for r in pond_rays]
    pond_center = [round(v, 3) for v in to_world(*pond_px)]

    # Stream banks: left and right water edge every quarter cell from the pond to the falls.
    stream_x = LANDMARKS['waterfall'][0] * cell
    banks = []
    y = pond_px[1] + np.median(pond_rays) * 0.9
    while y < LANDMARKS['waterfall'][1] * cell - 0.2 * cell:
        row = water_clean[int(y), int(stream_x - 0.6 * cell) : int(stream_x + 0.6 * cell)]
        hits = np.flatnonzero(row)
        if hits.size >= 4:
            left = stream_x - 0.6 * cell + hits[0]
            right = stream_x - 0.6 * cell + hits[-1]
            lx, lz = to_world(left, y)
            rx, rz = to_world(right, y)
            banks.append([round(lx, 3), round(lz, 3), round(rx, 3), round(rz, 3)])
        y += 0.25 * cell
    near_water = shift_or(water_clean, int(0.3 * cell))

    # Erase mask for the props.
    erase = np.zeros((h, w), bool)
    for ex, ey, er in ERASE_CIRCLES:
        erase |= (xx - ex * cell) ** 2 + (yy - ey * cell) ** 2 < (er * cell) ** 2
    for ex, ey, ew, eh in ERASE_RECTS:
        erase |= (np.abs(xx - ex * cell) < ew * cell / 2) & (np.abs(yy - ey * cell) < eh * cell / 2)
    landmark_area = erase.copy()

    def near_landmark(px, py, pad=0.0):
        x, y = int(px), int(py)
        if landmark_area[min(max(y, 0), h - 1), min(max(x, 0), w - 1)]:
            return True
        fx, fy = LANDMARKS['waterfall']
        return math.hypot(px / cell - fx, py / cell - fy) < 0.7 + pad

    # Boulders: warm grey blobs. Close small gaps (moss, shading) so each rock is one blob.
    rocks = shrink(shift_or(stone & island, 3), 3)
    boulders = []
    for by, bx, area, (y0, x0, y1, x1) in components(rocks, 600):
        if near_landmark(bx, by) or near_water[int(by), int(bx)]:
            continue
        radius_px = math.sqrt((y1 - y0 + 3) * (x1 - x0 + 3)) / 2
        wx, wz = to_world(bx, by)
        boulders.append([round(wx, 3), round(wz, 3), round(radius_px / cell * WORLD_PER_CELL, 3)])
        erase |= (xx - bx) ** 2 + (yy - by) ** 2 < (radius_px * 1.2) ** 2

    # Flower clumps: dilate so neighbouring flowers merge, then take each blob.
    water_near = shift_or(water, 6)

    def clumps(mask, min_area):
        merged = shift_or(mask & island & ~water_near, 5)
        found = []
        for fy, fx, area, (y0, x0, y1, x1) in components(merged, min_area):
            if near_landmark(fx, fy):
                continue
            wx, wz = to_world(fx, fy)
            radius_px = max(y1 - y0, x1 - x0) / 2
            count = int(mask[y0 : y1 + 1, x0 : x1 + 1].sum())
            found.append([round(wx, 3), round(wz, 3), round(radius_px / cell * WORLD_PER_CELL, 3), count])
        return found

    lavender_clumps = clumps(lavender, 300)
    daisy_clumps = clumps(daisy, 160)
    buttercup_clumps = clumps(buttercup, 160)

    # Ground texture: paint out the props, fill from the surroundings, add soft shadows.
    band = shift_or(island, 24) & outside
    fill_mask = (erase & island) | band
    known = island & ~fill_mask
    img = rgb.copy()
    filled = known.copy()
    for r in (3, 6, 12, 24, 48, 96, 160):
        weight = filled.astype(np.float32)
        num = box_blur(img * weight[..., None], r)
        den = box_blur(weight, r)
        take = ~filled & (den > 0.02)
        img[take] = num[take] / den[take][:, None]
        filled |= take
    detail = rgb - box_blur(rgb, 3)
    borrowed = np.roll(np.roll(detail, 150, 0), 90, 1)
    img[fill_mask] += borrowed[fill_mask] * 0.8

    shade = np.ones((h, w), np.float32)
    shadows = list(PROP_SHADOWS)
    for bx, bz, br in boulders:
        px, py = bx / WORLD_PER_CELL * cell + cx, bz / WORLD_PER_CELL * cell + cy
        rc = br / WORLD_PER_CELL
        shadows.append((px / cell + rc * 0.15, py / cell + rc * 0.25, rc * 1.25, 0.3))
    for sx, sy, sr, strength in shadows:
        d2 = (xx - sx * cell) ** 2 + (yy - sy * cell) ** 2
        sigma = sr * cell / 1.6
        shade *= 1 - strength * np.exp(-d2 / (2 * sigma * sigma))
    img *= shade[..., None]
    img[outside & ~band] = img[island].mean(0)

    half = float(smooth.max()) * 1.02 + 6
    box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
    texture = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).crop(box)
    texture = texture.resize((TEXTURE_SIZE, TEXTURE_SIZE), Image.LANCZOS)
    TEXTURE_OUT.parent.mkdir(parents=True, exist_ok=True)
    texture.save(TEXTURE_OUT, quality=88)
    texture_half = (box[2] - box[0]) / 2 / cell * WORLD_PER_CELL
    texture_center = to_world((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)

    # Coarse terrain grid over the texture square: 0 outside, 1 grass, 2 path, 3 water.
    terrain = []
    step = (box[2] - box[0]) / TERRAIN_SIZE
    for row in range(TERRAIN_SIZE):
        line = ''
        for col in range(TERRAIN_SIZE):
            x0, y0 = int(box[0] + col * step), int(box[1] + row * step)
            x1, y1 = int(x0 + step), int(y0 + step)
            region = np.s_[max(y0, 0) : min(y1, h), max(x0, 0) : min(x1, w)]
            if island[region].mean() < 0.5:
                line += '0'
            elif water[region].mean() > 0.4:
                line += '3'
            elif path[region].mean() > 0.35:
                line += '2'
            else:
                line += '1'
        terrain.append(line)

    landmarks = {k: [round(v, 3) for v in cells_to_world(c)] for k, c in LANDMARKS.items()}
    lily_pads = []
    for lx, ly, lr in LILY_PADS:
        wx, wz = cells_to_world((lx, ly))
        lily_pads.append([round(wx, 3), round(wz, 3), round(lr * WORLD_PER_CELL, 3)])
    data = {
        'worldPerCell': WORLD_PER_CELL,
        'textureHalfSize': round(texture_half, 3),
        'textureCenter': [round(v, 3) for v in texture_center],
        'outline': outline,
        'boulders': boulders,
        'lavender': lavender_clumps,
        'daisies': daisy_clumps,
        'buttercups': buttercup_clumps,
        'lilyPads': lily_pads,
        'pondCenter': pond_center,
        'pondOutline': pond_outline,
        'streamBanks': banks,
        'landmarks': landmarks,
        'benchRotation': round(-math.atan2(BENCH_AXIS[1], BENCH_AXIS[0]), 3),
        'fences': [[round(math.radians(a0), 3), round(math.radians(a1), 3)] for a0, a1 in FENCES],
        'terrainSize': TERRAIN_SIZE,
        'terrain': terrain,
    }
    header = (
        '// Generated by scripts/bake-island.py from docs/design/island-map.png. Do not edit by hand.\n'
        '// World units: x is east, z is south (toward the waterfall), y is up; island center at 0, 0.\n'
        '// Circles are [x, z, radius]; flower clumps are [x, z, radius, flower pixel count].\n'
        '// Pond outline is a radius per angle around pondCenter; stream banks are [left x, z, right x, z].\n'
        "// Terrain rows run north to south: '0' outside, '1' grass, '2' path, '3' water.\n\n"
    )
    types = (
        'type Circle = [number, number, number];\n'
        'type Clump = [number, number, number, number];\n\n'
        'export type IslandMap = {\n'
        '  worldPerCell: number;\n  textureHalfSize: number;\n  textureCenter: [number, number];\n'
        '  outline: number[];\n  boulders: Circle[];\n  lavender: Clump[];\n  daisies: Clump[];\n'
        '  buttercups: Clump[];\n  lilyPads: Circle[];\n'
        '  pondCenter: [number, number];\n  pondOutline: number[];\n'
        '  streamBanks: [number, number, number, number][];\n'
        '  landmarks: Record<' + ' | '.join(f"'{k}'" for k in LANDMARKS) + ', [number, number]>;\n'
        '  benchRotation: number;\n  fences: [number, number][];\n  terrainSize: number;\n  terrain: string[];\n'
        '};\n\n'
    )
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(header + types + 'export const ISLAND_MAP: IslandMap = ' + json.dumps(data) + ';\n', encoding='utf-8', newline='\n')

    print(f'island center {cx:.1f},{cy:.1f}px  max radius {smooth.max() / cell * WORLD_PER_CELL:.2f} world')
    print(f'pond rays {len(pond_outline)} (median {np.median(pond_outline):.2f})  stream rows {len(banks)}')
    print(f'boulders {len(boulders)}  lavender {len(lavender_clumps)}  daisies {len(daisy_clumps)}  buttercups {len(buttercup_clumps)}')
    print(f'texture half size {texture_half:.2f} world, center {texture_center[0]:.2f},{texture_center[1]:.2f}')

    if debug_out:
        dbg = image.copy()
        draw = ImageDraw.Draw(dbg)
        pts = [(cx + math.cos(2 * math.pi * i / n) * smooth[i], cy + math.sin(2 * math.pi * i / n) * smooth[i]) for i in range(n)]
        draw.line(pts + [pts[0]], fill=(255, 0, 0), width=3)

        def circle(wx, wz, wr, color, width=3):
            px, py = wx / WORLD_PER_CELL * cell + cx, wz / WORLD_PER_CELL * cell + cy
            pr = wr / WORLD_PER_CELL * cell
            draw.ellipse((px - pr, py - pr, px + pr, py + pr), outline=color, width=width)

        for b in boulders:
            circle(b[0], b[1], b[2], (255, 0, 0))
        for c in lavender_clumps:
            circle(c[0], c[1], max(c[2], 0.08), (170, 0, 255))
        for c in daisy_clumps:
            circle(c[0], c[1], max(c[2], 0.08), (255, 255, 255))
        for c in buttercup_clumps:
            circle(c[0], c[1], max(c[2], 0.08), (255, 200, 0))
        for c in lily_pads:
            circle(c[0], c[1], c[2], (0, 255, 0))
        for i, pr in enumerate(pond_outline):
            a = 2 * math.pi * i / len(pond_outline)
            circle(pond_center[0] + math.cos(a) * pr, pond_center[1] + math.sin(a) * pr, 0.06, (255, 0, 255))
        for lx, lz, rx, rz in banks:
            circle(lx, lz, 0.05, (255, 0, 255))
            circle(rx, rz, 0.05, (255, 0, 255))
        for name, (lx, lz) in landmarks.items():
            circle(lx, lz, 0.12, (0, 0, 0), 6)
            px, py = lx / WORLD_PER_CELL * cell + cx, lz / WORLD_PER_CELL * cell + cy
            draw.text((px + 10, py - 6), name, fill=(0, 0, 0))
        for a0, a1 in data['fences']:
            for a in np.linspace(a0, a1, 6):
                i = int(round(a / (2 * math.pi) * n)) % n
                rr = smooth[i] - 0.25 * cell
                draw.ellipse((cx + math.cos(a) * rr - 5, cy + math.sin(a) * rr - 5, cx + math.cos(a) * rr + 5, cy + math.sin(a) * rr + 5), fill=(120, 60, 0))
        dbg.save(debug_out)


if __name__ == '__main__':
    main()
