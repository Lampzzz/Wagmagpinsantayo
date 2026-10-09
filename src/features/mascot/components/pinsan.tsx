import { useFrame } from '@react-three/fiber/native';
import { useRef, type ReactNode, type Ref } from 'react';
import {
  BoxGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  LatheGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
} from 'three';

import { useMascotStore } from '../hooks/use-mascot';
import { brushStrokes, strokeScale } from '../scene/brush-strokes';
import { walker } from '../scene/walker';
import type { MascotMood } from '../types';

// Pinsan, built from primitives after the character model sheet, expression sheet and detail
// sheet: an onion-shaped head drawn up into a curl, cat ears on the sides, tall glossy eyes;
// a cream shirt with puffed sleeves under sage overalls (buttoned straps, belly pocket, rolled
// cuffs); mitten hands and boot-like feet. Skin and cloth are painted with brush strokes.
// Units: 1.7 tall, feet at y = 0, facing +z.

// Lambert: the same soft diffuse light as the physically based material at a fraction of the
// cost. Only the eyes and the sweat drop keep a cheap glossy shine.
const MAT = {
  skin: new MeshLambertMaterial({
    map: brushStrokes(['#E8892E', '#ED9334', '#E28129', '#F09A3A', '#E3832B'], 11),
  }),
  shirt: new MeshLambertMaterial({
    map: brushStrokes(['#E4D9BF', '#EAE1CA', '#DDD0B2', '#E8DDC3'], 12),
  }),
  overalls: new MeshLambertMaterial({
    map: brushStrokes(['#8AA37A', '#93AB7F', '#829D76', '#7C987A', '#99AE82'], 13),
  }),
  pocket: new MeshLambertMaterial({
    map: brushStrokes(['#7E9970', '#87A076', '#76926C', '#82996F'], 14),
  }),
  hem: new MeshLambertMaterial({ color: '#6A855F' }),
  button: new MeshLambertMaterial({ color: '#D9A55B' }),
  eye: new MeshPhongMaterial({ color: '#141018', specular: '#4A4A4A', shininess: 80 }),
  highlight: new MeshBasicMaterial({ color: '#FFFFFF' }),
  mouth: new MeshBasicMaterial({ color: '#5A1A22' }),
  tongue: new MeshBasicMaterial({ color: '#E8808E' }),
  brow: new MeshBasicMaterial({ color: '#5B3820' }),
  sweat: new MeshPhongMaterial({ color: '#6EC6F0', specular: '#FFFFFF', shininess: 60 }),
};

function lathe(profile: number[][], segments: number) {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    segments,
  );
}

function curve(points: number[][]) {
  return new CatmullRomCurve3(points.map(([x, y, z = 0]) => new Vector3(x, y, z)));
}

/** A tube along `path` whose radius narrows from `root` to `tip`. */
function taperedTube(path: CatmullRomCurve3, root: number, tip: number) {
  const rings = 28;
  const sides = 12;
  // Built at radius 1, then each ring is pulled in toward its center.
  const tube = new TubeGeometry(path, rings, 1, sides, false);
  const p = tube.getAttribute('position').array;
  const center = new Vector3();
  for (let ring = 0; ring <= rings; ring++) {
    path.getPointAt(ring / rings, center);
    const radius = root + (tip - root) * (ring / rings);
    for (let side = 0; side <= sides; side++) {
      const i = (ring * (sides + 1) + side) * 3;
      p[i] = center.x + (p[i] - center.x) * radius;
      p[i + 1] = center.y + (p[i + 1] - center.y) * radius;
      p[i + 2] = center.z + (p[i + 2] - center.z) * radius;
    }
  }
  return strokeScale(tube, 1, 1);
}

/** A thin painted line on the face (brow, closed eye, mouth line). */
function line(points: number[][], radius: number) {
  return new TubeGeometry(curve(points), 16, radius, 6, false);
}

// ---- Head ---------------------------------------------------------------------------------
// A lathed teardrop: round and widest low down, a little wider than tall, narrowing to an
// onion point that flows into the curl.

const HEAD_Y = 1.178;
const HEAD_HALF = 0.443;
const HEAD_WIDEN = 1.583;
/** Front to back the head is a little shallower than it is wide. */
const HEAD_DEPTH = 0.88;

function profileX(t: number) {
  return Math.sin(t) * Math.pow(Math.sin(t / 2), 1.6) * HEAD_WIDEN;
}

/** Head radius at height y, measured from the head's center. */
function headRadiusAt(y: number) {
  const t = Math.acos(MathUtils.clamp(y / HEAD_HALF, -1, 1));
  return profileX(t) * HEAD_HALF;
}

/** How far in front of the head's center its surface is at (x, y). */
function surfaceZ(x: number, y: number) {
  const r = headRadiusAt(y);
  return Math.sqrt(Math.max(r * r - x * x, 0)) * HEAD_DEPTH;
}

/** The tilt and turn that lay a flat face part along the head's surface at (x, y). */
function surfaceAngles(x: number, y: number): [number, number, number, 'YXZ'] {
  const slope = (headRadiusAt(y + 0.01) - headRadiusAt(y - 0.01)) / 0.02;
  const pitch = Math.atan(slope * HEAD_DEPTH);
  const yaw = Math.atan2(x, surfaceZ(x, y) / (HEAD_DEPTH * HEAD_DEPTH));
  return [pitch, yaw, 0, 'YXZ'];
}

const HEAD_GEOMETRY = strokeScale(
  new LatheGeometry(
    Array.from({ length: 33 }, (_, i) => {
      const t = Math.PI - (i / 32) * Math.PI; // bottom → top
      return new Vector2(profileX(t) * HEAD_HALF, Math.cos(t) * HEAD_HALF);
    }),
    40,
  ),
  5,
  2.5,
);

// The curl grows out of the head's point and hooks over toward Pinsan's left (+x) and back,
// tapering, its tip tucking down and in like a wave. Its root starts inside the head, a little
// thinner than the head there, so the two flow together without a ring.
const CURL_ROOT = 0.33;
const CURL_TURN = -0.6;
const CURL_TIP_RADIUS = 0.034;
const CURL_PATH = curve(
  [
    [0, 0],
    [0.005, 0.1],
    [0.05, 0.16],
    [0.115, 0.178],
    [0.178, 0.152],
    [0.2, 0.1],
    [0.182, 0.062],
  ].map(([s, y]) => [s * Math.cos(CURL_TURN), y, s * Math.sin(CURL_TURN)]),
);
const CURL_GEOMETRY = taperedTube(CURL_PATH, 0.058, CURL_TIP_RADIUS);
const CURL_TIP_GEOMETRY = new SphereGeometry(CURL_TIP_RADIUS, 12, 10);
const CURL_TIP = CURL_PATH.getPointAt(1);

// Plump cat ears on the sides, a little behind the face, pointing out and up.
const EAR_GEOMETRY = strokeScale(
  lathe(
    [
      [0, -0.06],
      [0.13, -0.06],
      [0.13, 0],
      [0.12, 0.07],
      [0.098, 0.14],
      [0.066, 0.2],
      [0.03, 0.245],
      [0, 0.256],
    ],
    18,
  ),
  1.2,
  0.6,
);

// ---- Face ---------------------------------------------------------------------------------

const EYE_X = 0.215;
const EYE_Y = -0.095;
const EYE_GEOMETRY = new SphereGeometry(0.1, 20, 16);
const HIGHLIGHT_GEOMETRY = new SphereGeometry(0.022, 10, 8);
/** Closed happy eyes for `done`: upside-down U arcs. */
const HAPPY_EYE_GEOMETRY = line(
  [
    [-0.062, -0.022],
    [-0.04, 0.02],
    [0, 0.04],
    [0.04, 0.02],
    [0.062, -0.022],
  ],
  0.017,
);

const BROW_Y = 0.105;
const BROW_GEOMETRY = line(
  [
    [-0.058, -0.01],
    [0, 0.012],
    [0.058, -0.01],
  ],
  0.013,
);

// Mouths: the open "D" smile (idle, done), the same shape flipped into a small frown (oops),
// a closed smile line (listening) and a wavy line (thinking).
const MOUTH_Y = -0.276;
const MOUTH_GEOMETRY = new CircleGeometry(0.09, 24, Math.PI, Math.PI);
const TONGUE_GEOMETRY = new CircleGeometry(0.046, 18);
const SMILE_GEOMETRY = line(
  [
    [-0.048, 0.012],
    [0, -0.012],
    [0.048, 0.012],
  ],
  0.011,
);
const SQUIGGLE_GEOMETRY = line(
  [
    [-0.05, 0.002],
    [-0.025, 0.013],
    [0.002, -0.002],
    [0.028, -0.013],
    [0.05, 0.002],
  ],
  0.0105,
);

/** A sweat drop for `oops`, point up. */
const SWEAT_GEOMETRY = lathe(
  [
    [0, -0.05],
    [0.026, -0.044],
    [0.036, -0.025],
    [0.032, 0.002],
    [0.016, 0.032],
    [0, 0.054],
  ],
  14,
);

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

// ---- Body ---------------------------------------------------------------------------------

/** Front to back the body is shallower than it is wide. */
const BODY_DEPTH = 0.8;

const SHIRT_GEOMETRY = strokeScale(
  lathe(
    [
      [0.3, 0.4],
      [0.326, 0.47],
      [0.336, 0.55],
      [0.33, 0.62],
      [0.305, 0.68],
      [0.25, 0.73],
      [0.13, 0.76],
      [0, 0.768],
    ],
    28,
  ),
  4,
  1,
);

// The overalls cover the shirt from the crotch up to the waist; the bib carries on up the chest.
const OVERALLS_GEOMETRY = strokeScale(
  lathe(
    [
      [0, 0.24],
      [0.2, 0.245],
      [0.31, 0.27],
      [0.346, 0.32],
      [0.352, 0.39],
      [0.346, 0.47],
      [0.342, 0.555],
    ],
    28,
  ),
  4,
  0.9,
);
const BIB_GEOMETRY = strokeScale(
  new CylinderGeometry(0.339, 0.35, 0.1, 12, 1, true, -0.62, 1.24),
  1,
  0.25,
);
// A patch pocket on the belly with a hem along its top, after the detail sheet.
const POCKET_GEOMETRY = strokeScale(
  new CylinderGeometry(0.356, 0.36, 0.16, 10, 1, true, -0.41, 0.82),
  0.6,
  0.4,
);
const POCKET_HEM_GEOMETRY = new CylinderGeometry(0.3595, 0.3605, 0.018, 10, 1, true, -0.41, 0.82);
const BUTTON_GEOMETRY = new CylinderGeometry(0.045, 0.047, 0.022, 18);
const STRAP_GEOMETRY = strokeScale(new BoxGeometry(0.058, 0.185, 0.018), 0.15, 0.4);

// Each leg swings from the hip: the shorts leg with its rolled cuff, and a boot-like foot.
const HIP_X = 0.2;
const HIP_Y = 0.33;
const LEG_GEOMETRY = strokeScale(new CylinderGeometry(0.15, 0.162, 0.18, 20), 1.6, 0.4);
const CUFF_GEOMETRY = strokeScale(new CylinderGeometry(0.172, 0.176, 0.05, 20), 1.8, 0.12);
const FOOT_GEOMETRY = strokeScale(new CapsuleGeometry(0.115, 0.13, 8, 16), 1.6, 1);

const SLEEVE_GEOMETRY = strokeScale(new SphereGeometry(0.118, 20, 14), 1.4, 0.7);
const ARM_GEOMETRY = strokeScale(new CapsuleGeometry(0.08, 0.09, 6, 14), 0.9, 0.5);
const HAND_GEOMETRY = strokeScale(new SphereGeometry(0.1, 18, 14), 1.1, 0.55);
const THUMB_GEOMETRY = strokeScale(new CapsuleGeometry(0.038, 0.045, 4, 10), 0.4, 0.3);

const HOP_MS = 600;
const BLINK_MS = 130;

/** Ease an object's uniform scale toward `target`; hide it once it has shrunk away. */
function showAs(part: Object3D, target: number, rate: number) {
  const s = MathUtils.lerp(part.scale.x, target, rate);
  part.scale.setScalar(s);
  part.visible = s > 0.01;
}

/** `mood` overrides the shared mood, for showing a fixed expression (sheets, snapshots). */
export function Pinsan({ mood: fixedMood }: { mood?: MascotMood }) {
  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const curlRef = useRef<Group>(null);
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
  const armRightRef = useRef<Group>(null);
  const armLeftRef = useRef<Group>(null);
  const nextBlink = useRef(2);
  const blinkStart = useRef(-1);

  useFrame((state) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    const curl = curlRef.current;
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
    const armRight = armRightRef.current;
    const armLeft = armLeftRef.current;
    if (!root || !body || !head || !curl || !eyes || !happyRight || !happyLeft) return;
    if (!browRight || !browLeft || !mouth || !frown || !smile || !squiggle || !sweat) return;
    if (!legRight || !legLeft || !armRight || !armLeft) return;
    const t = state.clock.elapsedTime;
    const shared = useMascotStore.getState();
    const mood = fixedMood ?? shared.mood;
    const sinceChange = fixedMood ? Infinity : Date.now() - shared.moodChangedAt;

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
    const w = walker.stepping;
    const swing = Math.sin(walker.phase);
    const lift = Math.cos(walker.phase);
    const stride = 0.5 * w;
    legLeft.rotation.x = swing * stride;
    legRight.rotation.x = -swing * stride;
    legLeft.position.y = HIP_Y + Math.max(-lift, 0) * 0.06 * w;
    legRight.position.y = HIP_Y + Math.max(lift, 0) * 0.06 * w;
    armLeft.rotation.x = -swing * 0.75 * w;
    armRight.rotation.x = swing * 0.75 * w;
    const dip = HIP_Y * (Math.cos(swing * stride) - 1);

    root.position.y = Math.sin(t * 2) * 0.02 * (1 - w) + dip + hop;
    root.rotation.z = MathUtils.lerp(root.rotation.z, tilt, 0.1);
    body.rotation.x = MathUtils.lerp(body.rotation.x, lean + w * 0.08, 0.1);
    body.rotation.z = swing * 0.06 * w;
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    head.rotation.y = MathUtils.lerp(head.rotation.y, headTurn, 0.1);
    curl.rotation.z = Math.sin(t * 2.4) * 0.08; // the curl sways a little

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
    if (t > nextBlink.current) {
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
    <group ref={rootRef}>
      <group ref={bodyRef}>
        <Leg side={-1} ref={legRightRef} />
        <Leg side={1} ref={legLeftRef} />

        <group scale={[1, 1, BODY_DEPTH]}>
          <mesh geometry={SHIRT_GEOMETRY} material={MAT.shirt} />
          <mesh geometry={OVERALLS_GEOMETRY} material={MAT.overalls} />
          <mesh geometry={BIB_GEOMETRY} material={MAT.overalls} position={[0, 0.55, 0]} />
          <mesh geometry={POCKET_GEOMETRY} material={MAT.pocket} position={[0, 0.41, 0]} />
          <mesh geometry={POCKET_HEM_GEOMETRY} material={MAT.hem} position={[0, 0.482, 0]} />
          <Strap side={-1} />
          <Strap side={1} />
        </group>

        <Arm side={-1} ref={armRightRef} />
        <Arm side={1} ref={armLeftRef} />

        {/* The head sits straight on the shoulders, no neck. */}
        <group ref={headRef} position={[0, HEAD_Y, 0]}>
          <mesh geometry={HEAD_GEOMETRY} material={MAT.skin} scale={[1, 1, HEAD_DEPTH]} />
          <group ref={curlRef} position={[0, CURL_ROOT, 0]}>
            <mesh geometry={CURL_GEOMETRY} material={MAT.skin} />
            <mesh geometry={CURL_TIP_GEOMETRY} material={MAT.skin} position={CURL_TIP} />
          </group>
          <Ear side={-1} />
          <Ear side={1} />

          <group ref={eyesRef} position={[0, EYE_Y, 0]}>
            <Eye x={-EYE_X} />
            <Eye x={EYE_X} />
          </group>
          <OnFace x={-EYE_X} y={EYE_Y} lift={0.012}>
            <mesh ref={happyRightRef} geometry={HAPPY_EYE_GEOMETRY} material={MAT.eye} scale={0} />
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
                position={[0, -0.068, 0.002]}
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

          <OnFace x={0.33} y={0.06} lift={0.035}>
            <mesh ref={sweatRef} geometry={SWEAT_GEOMETRY} material={MAT.sweat} scale={0} />
          </OnFace>
        </group>
      </group>
    </group>
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

/** One overall strap, front and back, with its button on the bib. */
function Strap({ side }: { side: -1 | 1 }) {
  return (
    <>
      {/* The strap runs from just above its button up over the shoulder, so the whole
          button shows. Turned to face outward first, then tilted back along the chest. */}
      <mesh
        geometry={BUTTON_GEOMETRY}
        material={MAT.button}
        position={[side * 0.2, 0.548, 0.294]}
        rotation={[Math.PI / 2, side * 0.6, 0, 'YXZ']}
      />
      <mesh
        geometry={STRAP_GEOMETRY}
        material={MAT.overalls}
        position={[side * 0.2, 0.648, 0.236]}
        rotation={[-0.63, side * 0.67, 0]}
      />
      <mesh
        geometry={STRAP_GEOMETRY}
        material={MAT.overalls}
        position={[side * 0.2, 0.648, -0.236]}
        rotation={[0.63, side * (Math.PI - 0.67), 0]}
      />
    </>
  );
}

function Leg({ side, ref }: { side: -1 | 1; ref: Ref<Group> }) {
  // Pivots at the hip, so walking swings the shorts leg, cuff and foot together.
  return (
    <group ref={ref} position={[side * HIP_X, HIP_Y, 0]}>
      <mesh
        geometry={LEG_GEOMETRY}
        material={MAT.overalls}
        position={[0, -0.075, 0]}
        scale={[1, 1, 0.86]}
      />
      <mesh
        geometry={CUFF_GEOMETRY}
        material={MAT.overalls}
        position={[0, -0.145, 0]}
        scale={[1, 1, 0.86]}
      />
      {/* Boot-like foot: a capsule lying front to back, flat-ish and wide, toe forward. */}
      <mesh
        geometry={FOOT_GEOMETRY}
        material={MAT.skin}
        position={[0, 0.105 - HIP_Y, 0.04]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1.3, 1.08, 0.95]}
      />
    </group>
  );
}

function Arm({ side, ref }: { side: -1 | 1; ref: Ref<Group> }) {
  // Hangs out from the shoulder and swings around it; the outward hang is applied first.
  return (
    <group ref={ref} position={[side * 0.36, 0.64, 0]} rotation={[0, 0, side * 0.45]}>
      {/* Puffed short sleeve */}
      <mesh
        geometry={SLEEVE_GEOMETRY}
        material={MAT.shirt}
        position={[0, -0.03, 0]}
        scale={[1, 0.92, 0.94]}
      />
      <mesh geometry={ARM_GEOMETRY} material={MAT.skin} position={[0, -0.14, 0]} />
      {/* Mitten hand, its thumb sticking up toward the front and the body */}
      <mesh
        geometry={HAND_GEOMETRY}
        material={MAT.skin}
        position={[0, -0.255, 0.005]}
        scale={[0.95, 1.08, 0.86]}
      />
      <mesh
        geometry={THUMB_GEOMETRY}
        material={MAT.skin}
        position={[-side * 0.05, -0.225, 0.07]}
        rotation={[0.6, 0, side * 0.7]}
      />
    </group>
  );
}

function Ear({ side }: { side: -1 | 1 }) {
  // A plump soft cone poking out and up from the side of the head.
  return (
    <mesh
      geometry={EAR_GEOMETRY}
      material={MAT.skin}
      position={[side * 0.36, 0, -0.09]}
      rotation={[0, 0, -side * 1.0]}
      scale={[1, 1, 0.72]}
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
