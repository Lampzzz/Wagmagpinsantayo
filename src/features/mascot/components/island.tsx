import { Suspense } from 'react';
import { MeshStandardMaterial } from 'three';

import { islandDecor } from '../scene/build-island';
import { IslandGround, IslandGroundPlaceholder } from './island-ground';
import { Waterfall } from './waterfall';

// The floating island from docs/design/island-map.png: textured ground, one merged mesh for
// every static piece (cliffs, trees, rocks, props, flowers), and the animated waterfall.

const DECOR_MATERIAL = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 1,
});

export function Island() {
  const decor = islandDecor(); // built on first use, then cached
  return (
    <group>
      <Suspense fallback={<IslandGroundPlaceholder />}>
        <IslandGround />
      </Suspense>
      <mesh geometry={decor} material={DECOR_MATERIAL} />
      <Waterfall />
    </group>
  );
}
