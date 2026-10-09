import { useFrame } from '@react-three/fiber/native';
import {
  DataTexture,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

import { merge, place, seeded } from '../scene/geometry';
import { LANDMARKS, angleOf, edgeRadiusAt } from '../scene/layout';

// The stream pours off the south edge as a sheet with streaks that scroll downward,
// ending in a puff of mist partway down the cliff.

const HEIGHT = 6.2;
const ANGLE = angleOf(LANDMARKS.waterfall[0], LANDMARKS.waterfall[1]);
const RADIUS = edgeRadiusAt(ANGLE) - 0.08;

function streaks() {
  const width = 16;
  const height = 64;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const streak = 0.5 + 0.5 * Math.sin(x * 1.9 + Math.sin(y * 0.3 + x) * 2.2);
      const light = 190 + streak * 65;
      const i = (y * width + x) * 4;
      data[i] = light * 0.78;
      data[i + 1] = light * 0.92;
      data[i + 2] = 255;
      data[i + 3] = 215 + streak * 40;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 3);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const MIST_MATERIAL = new MeshBasicMaterial({
  color: '#F4FAFF',
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
});

const MIST = (() => {
  const rng = seeded(77);
  const parts = Array.from({ length: 9 }, () => {
    const puff = new IcosahedronGeometry(0.22 + rng() * 0.25, 0);
    return place(puff, (rng() - 0.5) * 0.9, (rng() - 0.5) * 0.5, (rng() - 0.2) * 0.5);
  });
  for (const p of parts) {
    if (p.hasAttribute('uv')) p.deleteAttribute('uv');
  }
  return merge(parts);
})();

const STREAKS = streaks();

function flow(delta: number) {
  STREAKS.offset.y += Math.min(delta, 0.05) * 1.1;
}

export function Waterfall() {
  useFrame((_, delta) => flow(delta));
  const x = Math.cos(ANGLE) * RADIUS;
  const z = Math.sin(ANGLE) * RADIUS;
  // A plane faces +z; turn it to face outward from the island.
  const facing = Math.PI / 2 - ANGLE;
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, -HEIGHT / 2 + 0.02, 0.06]}>
        <planeGeometry args={[0.7, HEIGHT]} />
        <meshBasicMaterial map={STREAKS} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={MIST} material={MIST_MATERIAL} position={[0, -HEIGHT + 0.1, 0.25]} />
    </group>
  );
}
