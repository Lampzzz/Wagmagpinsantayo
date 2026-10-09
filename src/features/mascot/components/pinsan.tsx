import { useFrame } from '@react-three/fiber/native';
import { useRef, type ReactNode, type Ref } from 'react';
import {
  MathUtils,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  ShaderChunk,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
  type Object3D,
} from 'three';

import { useMascotStore } from '../hooks/use-mascot';
import { brushStrokes, softShadow } from '../scene/brush-strokes';
import {
  ARM_GEOMETRY,
  BIB_GEOMETRY,
  BODY_DEPTH,
  BROW_GEOMETRY,
  BROW_Y,
  BUTTON_GEOMETRY,
  BUTTON_HOLES_GEOMETRY,
  BUTTON_SPOT,
  CUFF_GEOMETRY,
  EAR,
  EAR_GEOMETRY,
  EYE_GEOMETRY,
  EYE_X,
  EYE_Y,
  FOOT_FORWARD,
  FOOT_GEOMETRY,
  FOOT_LENGTH,
  FOOT_SPLAY,
  HAPPY_EYE_GEOMETRY,
  HEAD_DEPTH,
  HEAD_GEOMETRY,
  HEAD_Y,
  HIGHLIGHT_GEOMETRY,
  HIP_X,
  HIP_Y,
  LEG_GEOMETRY,
  MOUTH_GEOMETRY,
  MOUTH_Y,
  OVERALLS_GEOMETRY,
  POCKET_GEOMETRY,
  SHADOW_GEOMETRY,
  SHIRT_GEOMETRY,
  SHOULDER,
  SLEEVE_GEOMETRY,
  SMILE_GEOMETRY,
  SQUIGGLE_GEOMETRY,
  STRAP_X,
  SWEAT,
  SWEAT_GEOMETRY,
  THUMB_GEOMETRY,
  TONGUE_GEOMETRY,
  surfaceAngles,
  surfaceZ,
} from '../scene/pinsan-shape';
import { groundUnder, walker } from '../scene/walker';
import type { MascotMood } from '../types';

// Pinsan, after the character model sheet, expression sheet and detail sheet: a droplet head
// that leans over into a curl, plump ears on the sides, tall glossy eyes; a cream shirt with
// short sleeves under sage overalls (buttoned straps, U-shaped pocket, rolled cuffs); mitten
// hands and round boot feet. The shapes live in scene/pinsan-shape. Units: 1.7 tall, feet at
// y = 0, facing +z.

// Matte clay: Lambert gives the same soft diffuse light as the physically based material at a
// fraction of the cost, and the vertex colors carry the contact shading built into the shapes.
// Quiet brush strokes paint skin and cloth; only the eyes and the sweat drop shine.
const PAINT = {
  skin: { base: '#E8892E', seed: 11, spread: 0.06 },
  shirt: { base: '#E6DCC2', seed: 12, spread: 0.04 },
  overalls: { base: '#8AA37A', seed: 13, spread: 0.065 },
  pocket: { base: '#7F9A71', seed: 14, spread: 0.055 },
};

// Light wraps a little way past the edge of each form before it falls off, as on soft clay, so
// the side away from the sun stays warm instead of going dark.
const WRAP = 0.4;
const WRAPPED_LAMBERT = ShaderChunk.lights_lambert_pars_fragment.replace(
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  `float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ${WRAP.toFixed(2)} ) / ${(1 + WRAP).toFixed(2)} );`,
);

function clay({ base, seed, spread }: { base: string; seed: number; spread: number }) {
  const material = new MeshLambertMaterial({
    map: brushStrokes(base, seed, spread),
    vertexColors: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_lambert_pars_fragment>',
      WRAPPED_LAMBERT,
    );
  };
  // three caches shaders by the text of onBeforeCompile, which Hermes doesn't keep, so name
  // this variant to keep it apart from plain Lambert.
  material.customProgramCacheKey = () => 'pinsan-clay';
  return material;
}

const MAT = {
  skin: clay(PAINT.skin),
  shirt: clay(PAINT.shirt),
  overalls: clay(PAINT.overalls),
  pocket: clay(PAINT.pocket),
  button: new MeshLambertMaterial({ color: '#D7A35E', vertexColors: true }),
  buttonHole: new MeshBasicMaterial({ color: '#6B4524' }),
  eye: new MeshPhongMaterial({ color: '#141018', specular: '#5A5A5A', shininess: 90 }),
  highlight: new MeshBasicMaterial({ color: '#FFFFFF' }),
  mouth: new MeshBasicMaterial({ color: '#5A1A22' }),
  tongue: new MeshBasicMaterial({ color: '#E8808E' }),
  brow: new MeshBasicMaterial({ color: '#5B3820' }),
  sweat: new MeshPhongMaterial({ color: '#6EC6F0', specular: '#FFFFFF', shininess: 60 }),
};

const PAINTED = (['skin', 'shirt', 'overalls', 'pocket'] as const).map((part) => ({
  material: MAT[part],
  map: MAT[part].map,
  base: PAINT[part].base,
}));

/** Show or hide the brush strokes, so shape and light can be judged on their own (studio). */
export function showPaint(on: boolean) {
  PAINTED.forEach(({ material, map, base }) => {
    material.map = on ? map : null;
    material.color.set(on ? '#FFFFFF' : base);
    material.needsUpdate = true;
  });
}

// Soft contact shadows: a broad faint one under the body and a denser one under each foot.
const SHADOW_COLOR = '#3A2E1E';
const SHADOW_TEXTURE = softShadow();
const BODY_SHADOW = new MeshBasicMaterial({
  color: SHADOW_COLOR,
  map: SHADOW_TEXTURE,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});
const BODY_SHADOW_SIZE = 0.95;
const FOOT_SHADOW_SIZE = 0.42;
const FOOT_SHADOW_OPACITY = 0.36;

type FaceShape = {
  /** 0 hides a part, 1 shows it; values in between scale it while it eases in or out. */
  mouth: number;
  frown: number;
  smile: number;
  squiggle: number;
  happy: number;
  brows: number;
  sweat: number;
  /** Per brow, Pinsan's right (−x) then left (+x): how far it is raised, and its tilt. */
  browLift: [number, number];
  browTilt: [number, number];
};

// After the expression sheet. A brow's tilt turns it counterclockwise as you look at Pinsan, so
// positive raises Pinsan's right brow's inner end and its left brow's outer end.
const FACES: Record<MascotMood, FaceShape> = {
  idle: {
    mouth: 1,
    frown: 0,
    smile: 0,
    squiggle: 0,
    happy: 0,
    brows: 0,
    sweat: 0,
    browLift: [0, 0],
    browTilt: [0, 0],
  },
  listening: {
    mouth: 0,
    frown: 0,
    smile: 1,
    squiggle: 0,
    happy: 0,
    brows: 1,
    sweat: 0,
    browLift: [0.02, 0.02],
    browTilt: [0.08, -0.08],
  },
  thinking: {
    mouth: 0,
    frown: 0,
    smile: 0,
    squiggle: 1,
    happy: 0,
    brows: 1,
    sweat: 0,
    browLift: [0.035, -0.008],
    browTilt: [0.12, 0.3],
  },
  done: {
    mouth: 1.3,
    frown: 0,
    smile: 0,
    squiggle: 0,
    happy: 1,
    brows: 0,
    sweat: 0,
    browLift: [0, 0],
    browTilt: [0, 0],
  },
  oops: {
    mouth: 0,
    frown: 1,
    smile: 0,
    squiggle: 0,
    happy: 0,
    brows: 1,
    sweat: 1,
    browLift: [0.012, 0.012],
    browTilt: [0.38, -0.38],
  },
};

const HOP_MS = 600;
const BLINK_MS = 130;
const UP = new Vector3(0, 1, 0);

// Scratch values for each frame's grounding: per foot, Pinsan's right then left.
const feet = [
  { ground: 0, normal: new Vector3(0, 1, 0) },
  { ground: 0, normal: new Vector3(0, 1, 0) },
];
const centerNormal = new Vector3(0, 1, 0);
const sole = new Vector3();

/** Ease an object's uniform scale toward `target`; hide it once it has shrunk away. */
function showAs(part: Object3D, target: number, rate: number) {
  const s = MathUtils.lerp(part.scale.x, target, rate);
  part.scale.setScalar(s);
  part.visible = s > 0.01;
}

type ShadowMesh = Mesh<BufferGeometry, MeshBasicMaterial>;

type PinsanProps = {
  /** Overrides the shared mood, for showing a fixed expression (sheets, snapshots). */
  mood?: MascotMood;
  /** Holds a walk-cycle pose instead of following the walker, on flat ground. */
  stride?: { phase: number; stepping: number };
  /** No breathing, swaying or blinking, for still pictures. */
  still?: boolean;
};

export function Pinsan({ mood: fixedMood, stride: fixedStride, still = false }: PinsanProps) {
  const frameRef = useRef<Group>(null);
  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const eyesRef = useRef<Group>(null);
  const happyRightRef = useRef<Mesh>(null);
  const happyLeftRef = useRef<Mesh>(null);
  const browRightRef = useRef<Mesh>(null);
  const browLeftRef = useRef<Mesh>(null);
  const mouthRef = useRef<Group>(null);
  const frownRef = useRef<Group>(null);
  const smileRef = useRef<Mesh>(null);
  const squiggleRef = useRef<Mesh>(null);
  const sweatRef = useRef<Mesh>(null);
  const legRightRef = useRef<Group>(null);
  const legLeftRef = useRef<Group>(null);
  const soleRightRef = useRef<Group>(null);
  const soleLeftRef = useRef<Group>(null);
  const armRightRef = useRef<Group>(null);
  const armLeftRef = useRef<Group>(null);
  const bodyShadowRef = useRef<Mesh>(null);
  const footShadowRightRef = useRef<ShadowMesh>(null);
  const footShadowLeftRef = useRef<ShadowMesh>(null);
  const nextBlink = useRef(2);
  const blinkStart = useRef(-1);

  useFrame((state) => {
    const frame = frameRef.current;
    const root = rootRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    const eyes = eyesRef.current;
    const happyRight = happyRightRef.current;
    const happyLeft = happyLeftRef.current;
    const browRight = browRightRef.current;
    const browLeft = browLeftRef.current;
    const mouth = mouthRef.current;
    const frown = frownRef.current;
    const smile = smileRef.current;
    const squiggle = squiggleRef.current;
    const sweat = sweatRef.current;
    const legRight = legRightRef.current;
    const legLeft = legLeftRef.current;
    const soleRight = soleRightRef.current;
    const soleLeft = soleLeftRef.current;
    const armRight = armRightRef.current;
    const armLeft = armLeftRef.current;
    const bodyShadow = bodyShadowRef.current;
    const footShadowRight = footShadowRightRef.current;
    const footShadowLeft = footShadowLeftRef.current;
    if (!frame || !root || !body || !head || !eyes || !happyRight || !happyLeft) return;
    if (!browRight || !browLeft || !mouth || !frown || !smile || !squiggle || !sweat) return;
    if (!legRight || !legLeft || !soleRight || !soleLeft || !armRight || !armLeft) return;
    if (!bodyShadow || !footShadowRight || !footShadowLeft) return;
    const t = still ? 0 : state.clock.elapsedTime;
    const shared = useMascotStore.getState();
    const mood = fixedMood ?? shared.mood;
    const sinceChange = fixedMood ? Infinity : Date.now() - shared.moodChangedAt;
    // Out on the island, rather than holding a pose in the studio.
    const live = !fixedStride;

    // Pose targets per mood; everything eases toward them so mood switches feel soft.
    let lean = 0;
    let tilt = Math.sin(t * 1.2) * 0.03;
    let headTurn = 0;
    let eyeLift = 0;
    let hop = 0;
    let squash = 1;

    if (mood === 'listening') {
      lean = 0.15;
    } else if (mood === 'thinking') {
      headTurn = Math.sin(t * 1.5) * 0.25;
      eyeLift = 0.025;
      tilt = 0.08 + Math.sin(t * 2) * 0.04;
    } else if (mood === 'done' && sinceChange < HOP_MS) {
      const p = sinceChange / HOP_MS;
      hop = Math.sin(p * Math.PI) * 0.45;
      squash = 1 + Math.sin(p * Math.PI * 2) * 0.12;
    } else if (mood === 'oops') {
      tilt = 0.2;
    }

    // Walk cycle after the walk sheet, scaled by how much Pinsan is stepping (0 standing):
    // legs swing from the hips and lift as they pass, arms swing against them, the body dips
    // as the legs spread so the planted foot stays down, and it waddles side to side.
    // A leg moves forward while cos(phase) has one sign, so it lifts only then.
    const { phase, stepping: w } = fixedStride ?? walker;
    const swing = Math.sin(phase);
    const lift = Math.cos(phase);
    const stride = 0.5 * w;
    [legRight, legLeft].forEach((leg, i) => {
      const side = i === 0 ? -1 : 1;
      const angle = side * swing * stride;
      // Each foot stands on the ground under it, so both stay on the bridge's slope.
      const footZ = -HIP_Y * Math.sin(angle) + FOOT_FORWARD * Math.cos(angle);
      const foot = feet[i];
      foot.ground = live ? groundUnder(side * (HIP_X + FOOT_SPLAY), footZ, foot.normal) : 0;
      if (!live) foot.normal.copy(UP);
      leg.rotation.x = angle;
      leg.position.y = HIP_Y + Math.max(-side * lift, 0) * 0.06 * w + foot.ground;
    });
    armLeft.rotation.x = -swing * 0.75 * w;
    armRight.rotation.x = swing * 0.75 * w;
    const dip = HIP_Y * (Math.cos(swing * stride) - 1);

    root.position.y = Math.sin(t * 2) * 0.02 * (1 - w) + dip + hop;
    root.rotation.z = MathUtils.lerp(root.rotation.z, tilt, 0.1);
    body.rotation.x = MathUtils.lerp(body.rotation.x, lean + w * 0.08, 0.1);
    body.rotation.z = swing * 0.06 * w;
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    head.rotation.y = MathUtils.lerp(head.rotation.y, headTurn, 0.1);

    // Contact shadows stay on the ground: the body's under its middle, each foot's under the
    // foot, shrinking and fading as it lifts.
    const center = live ? groundUnder(0, 0, centerNormal) : 0;
    if (!live) centerNormal.copy(UP);
    bodyShadow.position.set(0, center + 0.008, 0);
    bodyShadow.quaternion.setFromUnitVectors(UP, centerNormal);
    bodyShadow.scale.setScalar(BODY_SHADOW_SIZE * (1 - hop * 0.6));
    [footShadowRight, footShadowLeft].forEach((shadow, i) => {
      (i === 0 ? soleRight : soleLeft).getWorldPosition(sole);
      frame.worldToLocal(sole);
      const foot = feet[i];
      const height = Math.max(sole.y - foot.ground, 0);
      const size = FOOT_SHADOW_SIZE * (1 - Math.min(height * 2.5, 0.4));
      shadow.position.set(sole.x, foot.ground + 0.012, sole.z);
      shadow.quaternion.setFromUnitVectors(UP, foot.normal);
      shadow.scale.set(size, 1, size * FOOT_LENGTH);
      shadow.material.opacity = FOOT_SHADOW_OPACITY * (1 - Math.min(height * 5, 0.75));
    });

    // Face.
    const face = FACES[mood];
    showAs(mouth, face.mouth, 0.25);
    showAs(frown, face.frown, 0.25);
    showAs(smile, face.smile, 0.25);
    showAs(squiggle, face.squiggle, 0.25);
    showAs(happyRight, face.happy, 0.3);
    showAs(happyLeft, face.happy, 0.3);
    showAs(sweat, face.sweat, 0.2);
    sweat.position.y = -(t % 1.6) * 0.02; // creeps down the cheek, then starts over
    [browRight, browLeft].forEach((brow, i) => {
      showAs(brow, face.brows, 0.25);
      brow.position.y = MathUtils.lerp(brow.position.y, face.browLift[i], 0.2);
      brow.rotation.z = MathUtils.lerp(brow.rotation.z, face.browTilt[i], 0.2);
    });

    // Blink every 3–5 s; the open eyes give way to closed arcs while celebrating.
    if (!still && t > nextBlink.current) {
      blinkStart.current = t;
      nextBlink.current = t + 3 + Math.random() * 2;
    }
    const blinking = (t - blinkStart.current) * 1000 < BLINK_MS;
    const eyeOpen = face.happy > 0 ? 0.02 : blinking ? 0.1 : 1;
    eyes.scale.y = MathUtils.lerp(eyes.scale.y, eyeOpen, 0.4);
    eyes.visible = eyes.scale.y > 0.05;
    eyes.position.y = MathUtils.lerp(eyes.position.y, EYE_Y + eyeLift, 0.15);
  });

  return (
    <group ref={frameRef}>
      <mesh ref={bodyShadowRef} geometry={SHADOW_GEOMETRY} material={BODY_SHADOW} />
      <FootShadow ref={footShadowRightRef} />
      <FootShadow ref={footShadowLeftRef} />

      <group ref={rootRef}>
        <group ref={bodyRef}>
          <Leg side={-1} ref={legRightRef} sole={soleRightRef} />
          <Leg side={1} ref={legLeftRef} sole={soleLeftRef} />

          <group scale={[1, 1, BODY_DEPTH]}>
            <mesh geometry={SHIRT_GEOMETRY} material={MAT.shirt} />
            <mesh geometry={OVERALLS_GEOMETRY} material={MAT.overalls} />
            <mesh geometry={BIB_GEOMETRY} material={MAT.overalls} />
            <mesh geometry={POCKET_GEOMETRY} material={MAT.pocket} />
            <Button side={-1} />
            <Button side={1} />
          </group>

          <Arm side={-1} ref={armRightRef} />
          <Arm side={1} ref={armLeftRef} />

          {/* The head sits straight on the shoulders, no neck. */}
          <group ref={headRef} position={[0, HEAD_Y, 0]}>
            <mesh geometry={HEAD_GEOMETRY} material={MAT.skin} scale={[1, 1, HEAD_DEPTH]} />
            <Ear side={-1} />
            <Ear side={1} />

            <group ref={eyesRef} position={[0, EYE_Y, 0]}>
              <Eye x={-EYE_X} />
              <Eye x={EYE_X} />
            </group>
            <OnFace x={-EYE_X} y={EYE_Y} lift={0.012}>
              <mesh
                ref={happyRightRef}
                geometry={HAPPY_EYE_GEOMETRY}
                material={MAT.eye}
                scale={0}
              />
            </OnFace>
            <OnFace x={EYE_X} y={EYE_Y} lift={0.012}>
              <mesh ref={happyLeftRef} geometry={HAPPY_EYE_GEOMETRY} material={MAT.eye} scale={0} />
            </OnFace>

            <OnFace x={-EYE_X} y={BROW_Y} lift={0.01}>
              <mesh ref={browRightRef} geometry={BROW_GEOMETRY} material={MAT.brow} scale={0} />
            </OnFace>
            <OnFace x={EYE_X} y={BROW_Y} lift={0.01}>
              <mesh ref={browLeftRef} geometry={BROW_GEOMETRY} material={MAT.brow} scale={0} />
            </OnFace>

            <OnFace x={0} y={MOUTH_Y} lift={0.003}>
              <group ref={mouthRef}>
                <mesh geometry={MOUTH_GEOMETRY} material={MAT.mouth} scale={[1, 1.25, 1]} />
                <mesh
                  geometry={TONGUE_GEOMETRY}
                  material={MAT.tongue}
                  position={[0, -0.07, 0.002]}
                  scale={[1.15, 0.62, 1]}
                />
              </group>
              {/* Flipped and smaller: a worried open frown, tongue resting at the bottom. */}
              <group ref={frownRef} scale={0}>
                <group position={[0, -0.045, 0]} scale={[0.62, -0.62, 1]}>
                  <mesh geometry={MOUTH_GEOMETRY} material={MAT.mouth} scale={[1, 1.25, 1]} />
                  <mesh
                    geometry={TONGUE_GEOMETRY}
                    material={MAT.tongue}
                    position={[0, -0.022, 0.002]}
                    scale={[1.1, 0.5, 1]}
                  />
                </group>
              </group>
              <mesh ref={smileRef} geometry={SMILE_GEOMETRY} material={MAT.mouth} scale={0} />
              <mesh
                ref={squiggleRef}
                geometry={SQUIGGLE_GEOMETRY}
                material={MAT.mouth}
                position={[0.03, 0, 0]}
                scale={0}
              />
            </OnFace>

            <OnFace x={SWEAT.x} y={SWEAT.y} lift={0.035}>
              <mesh ref={sweatRef} geometry={SWEAT_GEOMETRY} material={MAT.sweat} scale={0} />
            </OnFace>
          </group>
        </group>
      </group>
    </group>
  );
}

/** A foot's shadow, with its own material so it can fade on its own. */
function FootShadow({ ref }: { ref: Ref<ShadowMesh> }) {
  return (
    <mesh ref={ref} geometry={SHADOW_GEOMETRY}>
      <meshBasicMaterial
        color={SHADOW_COLOR}
        map={SHADOW_TEXTURE}
        transparent
        opacity={FOOT_SHADOW_OPACITY}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Places its children on the head's surface at (x, y), facing out, `lift` above the skin. */
function OnFace({
  x,
  y,
  lift,
  children,
}: {
  x: number;
  y: number;
  lift: number;
  children: ReactNode;
}) {
  return (
    <group position={[x, y, surfaceZ(x, y) + lift]} rotation={surfaceAngles(x, y)}>
      {children}
    </group>
  );
}

/** A wooden button where a strap meets the bib, turned to face out from the chest. */
function Button({ side }: { side: -1 | 1 }) {
  return (
    <group
      position={[side * STRAP_X, BUTTON_SPOT.y, BUTTON_SPOT.z]}
      rotation={[Math.PI / 2, side * BUTTON_SPOT.yaw, 0, 'YXZ']}
    >
      <mesh geometry={BUTTON_GEOMETRY} material={MAT.button} />
      <mesh geometry={BUTTON_HOLES_GEOMETRY} material={MAT.buttonHole} />
    </group>
  );
}

function Leg({ side, ref, sole }: { side: -1 | 1; ref: Ref<Group>; sole: Ref<Group> }) {
  // Pivots at the hip, so walking swings the shorts leg, cuff and foot together. The foot
  // stands on its sole, toes turned out a little.
  return (
    <group ref={ref} position={[side * HIP_X, HIP_Y, 0]}>
      {/* Deep front to back, like the shorts on the side view. */}
      <mesh geometry={LEG_GEOMETRY} material={MAT.overalls} scale={[1, 1, 1.18]} />
      <mesh geometry={CUFF_GEOMETRY} material={MAT.overalls} scale={[1, 1, 1.18]} />
      <group
        ref={sole}
        position={[side * FOOT_SPLAY, -HIP_Y, FOOT_FORWARD]}
        rotation={[0, side * 0.12, 0]}
      >
        <mesh geometry={FOOT_GEOMETRY} material={MAT.skin} scale={[1, 1, FOOT_LENGTH]} />
      </group>
    </group>
  );
}

function Arm({ side, ref }: { side: -1 | 1; ref: Ref<Group> }) {
  // Hangs out from inside the shoulder and swings around it; the outward hang is applied
  // first. The sleeve grows out of the shirt; the mitten's thumb points forward, toward the
  // body.
  return (
    <group
      ref={ref}
      position={[side * SHOULDER.x, SHOULDER.y, 0]}
      rotation={[0, 0, side * SHOULDER.hang]}
    >
      <mesh geometry={SLEEVE_GEOMETRY} material={MAT.shirt} scale={[1, 1, 0.92]} />
      <mesh geometry={ARM_GEOMETRY} material={MAT.skin} scale={[1, 1, 0.9]} />
      <mesh
        geometry={THUMB_GEOMETRY}
        material={MAT.skin}
        position={[-side * 0.06, -0.282, 0.058]}
        rotation={[0.55, 0, side * 0.55]}
      />
    </group>
  );
}

function Ear({ side }: { side: -1 | 1 }) {
  // A plump soft cone out of the side of the head, pointing out, up and a little forward.
  return (
    <mesh
      geometry={EAR_GEOMETRY}
      material={MAT.skin}
      position={[side * EAR.x, EAR.y, EAR.z]}
      rotation={[0, -side * EAR.forward, -side * (Math.PI / 2 - EAR.rise)]}
      scale={[1, 1, 0.74]}
    />
  );
}

function Eye({ x }: { x: number }) {
  // Sunk slightly into the head so it reads as set into the face, then bulging out.
  return (
    <group position={[x, 0, surfaceZ(x, EYE_Y) - 0.02]} rotation={surfaceAngles(x, EYE_Y)}>
      <mesh geometry={EYE_GEOMETRY} material={MAT.eye} scale={[0.8, 1.42, 0.5]} />
      <mesh
        geometry={HIGHLIGHT_GEOMETRY}
        material={MAT.highlight}
        position={[-0.022, 0.07, 0.044]}
        scale={[1, 1.3, 0.5]}
      />
    </group>
  );
}
