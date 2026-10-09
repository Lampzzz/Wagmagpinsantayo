import { useLoader } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import {
  Color,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
  Shape,
  TextureLoader,
  type Material,
  type Texture,
} from 'three';

import { ISLAND_MAP } from '../scene/island-map';
import { lightFacing } from '../scene/lighting';

// The walkable top: the island outline extruded into a thin grass slab, with the ground
// texture baked from the top-down map on its top face.

const GROUND_URI = Asset.fromModule(require('../../../../assets/scene/island-ground.jpg')).uri;
const LIP = 0.3;

const GEOMETRY = (() => {
  const shape = new Shape();
  ISLAND_MAP.outline.forEach((r, i) => {
    const a = (i / ISLAND_MAP.outline.length) * Math.PI * 2;
    // Shape space is x, y; laid flat below, its y becomes world -z.
    if (i === 0) shape.moveTo(Math.cos(a) * r, -Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, -Math.sin(a) * r);
  });
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: LIP, bevelEnabled: false, steps: 1 });
})();

// The top is flat and faces straight up, so its sunlight is one color: baked in, drawn unlit.
const SUNLIT_TOP = lightFacing(0, 1, 0);
const SIDE = new MeshLambertMaterial({ color: '#7FA448', flatShading: true });
const PLAIN_TOP = new MeshBasicMaterial({ color: new Color('#9CC25A').multiply(SUNLIT_TOP) });

function Slab({ top }: { top: Material }) {
  return (
    <mesh
      geometry={GEOMETRY}
      material={[top, SIDE]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -LIP, 0]}
    />
  );
}

const groundMaterials = new WeakMap<Texture, MeshBasicMaterial>();

/** Map the texture so it lines up with world coordinates, once per loaded texture. */
function groundMaterial(texture: Texture) {
  let material = groundMaterials.get(texture);
  if (!material) {
    const { textureHalfSize: half, textureCenter } = ISLAND_MAP;
    texture.colorSpace = SRGBColorSpace;
    texture.repeat.set(1 / (2 * half), 1 / (2 * half));
    texture.offset.set(0.5 - textureCenter[0] / (2 * half), 0.5 + textureCenter[1] / (2 * half));
    texture.needsUpdate = true;
    material = new MeshBasicMaterial({ map: texture, color: SUNLIT_TOP });
    groundMaterials.set(texture, material);
  }
  return material;
}

export function IslandGround() {
  const texture = useLoader(TextureLoader, GROUND_URI);
  return <Slab top={groundMaterial(texture)} />;
}

/** Shown while the ground texture loads. */
export function IslandGroundPlaceholder() {
  return <Slab top={PLAIN_TOP} />;
}
