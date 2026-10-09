import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import {
  CatmullRomCurve3,
  LatheGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
} from 'three';

import { useMascotStore } from '../hooks/use-mascot';

// Pinsan, built from primitives to match the character turnaround sheet:
// teardrop head with a curled tip, side cat ears, tall glossy eyes, open smile,
// cream shirt, sage overalls with buttons and a pocket, stubby limbs.
// Units: Pinsan is about 1.65 tall, feet at y = 0.

const MAT = {
  skin: new MeshStandardMaterial({ color: '#E8892E', roughness: 0.95 }),
  shirt: new MeshStandardMaterial({ color: '#F3ECDA', roughness: 1 }),
  overalls: new MeshStandardMaterial({ color: '#8EA57C', roughness: 1 }),
  pocket: new MeshStandardMaterial({ color: '#7F9770', roughness: 1 }),
  button: new MeshStandardMaterial({ color: '#C8955A', roughness: 0.8 }),
  eye: new MeshStandardMaterial({ color: '#141018', roughness: 0.15 }),
  highlight: new MeshBasicMaterial({ color: '#FFFFFF' }),
  mouth: new MeshBasicMaterial({ color: '#4A1A22' }),
  tongue: new MeshBasicMaterial({ color: '#E8808E' }),
};

// Head: a lathed teardrop, round at the bottom, pointed on top. Half-height 0.5.
const HEAD_HALF = 0.5;
const HEAD_WIDEN = 1.25;

function profileX(t: number) {
  return Math.sin(t) * Math.pow(Math.sin(t / 2), 1.6) * HEAD_WIDEN;
}

// Head surface radius at height y (relative to head center), for placing face parts.
function headRadiusAt(y: number) {
  const t = Math.acos(MathUtils.clamp(y / HEAD_HALF, -1, 1));
  return profileX(t) * HEAD_HALF;
}

function surfaceZ(x: number, y: number) {
  const r = headRadiusAt(y);
  return Math.sqrt(Math.max(r * r - x * x, 0));
}

const HEAD_GEOMETRY = new LatheGeometry(
  Array.from({ length: 33 }, (_, i) => {
    const t = Math.PI - (i / 32) * Math.PI; // bottom → top
    return new Vector2(profileX(t) * HEAD_HALF, Math.cos(t) * HEAD_HALF);
  }),
  40,
);

// The curl rises out of the tip and hooks toward the viewer's right.
const CURL_POINTS = [
  new Vector3(0, 0.4, 0),
  new Vector3(0.01, 0.48, 0),
  new Vector3(0.05, 0.54, 0),
  new Vector3(0.11, 0.555, 0),
  new Vector3(0.15, 0.52, 0),
];
const CURL_GEOMETRY = new TubeGeometry(new CatmullRomCurve3(CURL_POINTS), 24, 0.055, 12, false);
const CURL_END = CURL_POINTS[CURL_POINTS.length - 1];

const EYE_X = 0.165;
const EYE_Y = -0.08;
const MOUTH_Y = -0.27;

const HOP_MS = 600;
const BLINK_MS = 130;

export function Pinsan() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const curl = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const mouth = useRef<Group>(null);
  const nextBlink = useRef(2);
  const blinkStart = useRef(-1);

  useFrame((state) => {
    if (!root.current || !body.current || !head.current || !curl.current) return;
    if (!eyes.current || !mouth.current) return;
    const t = state.clock.elapsedTime;
    const { mood, moodChangedAt } = useMascotStore.getState();
    const sinceChange = Date.now() - moodChangedAt;

    // Targets per mood; everything eases toward them so mood switches feel soft.
    let lean = 0;
    let tilt = Math.sin(t * 1.2) * 0.03;
    let headTurn = 0;
    let eyeLift = 0;
    let hop = 0;
    let squash = 1;
    let mouthOpen = 1;

    if (mood === 'listening') {
      lean = 0.15;
    } else if (mood === 'thinking') {
      headTurn = Math.sin(t * 1.5) * 0.3;
      eyeLift = 0.03;
      tilt = Math.sin(t * 2) * 0.06;
      mouthOpen = 0.3;
    } else if (mood === 'done') {
      mouthOpen = 1.35;
      if (sinceChange < HOP_MS) {
        const p = sinceChange / HOP_MS;
        hop = Math.sin(p * Math.PI) * 0.45;
        squash = 1 + Math.sin(p * Math.PI * 2) * 0.12;
      }
    } else if (mood === 'oops') {
      tilt = 0.22;
      mouthOpen = 0.45;
    }

    root.current.position.y = Math.sin(t * 2) * 0.025 + hop;
    root.current.rotation.z = MathUtils.lerp(root.current.rotation.z, tilt, 0.1);
    body.current.rotation.x = MathUtils.lerp(body.current.rotation.x, lean, 0.1);
    body.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    head.current.rotation.y = MathUtils.lerp(head.current.rotation.y, headTurn, 0.1);
    curl.current.rotation.z = Math.sin(t * 2.4) * 0.08; // the curl sways a little
    eyes.current.position.y = MathUtils.lerp(eyes.current.position.y, eyeLift, 0.15);
    mouth.current.scale.y = MathUtils.lerp(mouth.current.scale.y, mouthOpen, 0.2);

    // Blink every 3–5 s. Happy squint while celebrating.
    if (t > nextBlink.current) {
      blinkStart.current = t;
      nextBlink.current = t + 3 + Math.random() * 2;
    }
    const blinking = (t - blinkStart.current) * 1000 < BLINK_MS;
    const eyeOpen = mood === 'done' ? 0.35 : blinking ? 0.1 : 1;
    eyes.current.scale.y = MathUtils.lerp(eyes.current.scale.y, eyeOpen, 0.4);
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Feet */}
        <mesh material={MAT.skin} position={[-0.12, 0.08, 0.03]} scale={[1, 0.75, 1.2]}>
          <sphereGeometry args={[0.11, 20, 14]} />
        </mesh>
        <mesh material={MAT.skin} position={[0.12, 0.08, 0.03]} scale={[1, 0.75, 1.2]}>
          <sphereGeometry args={[0.11, 20, 14]} />
        </mesh>

        {/* Overall shorts, with a cuff at the bottom */}
        <mesh material={MAT.overalls} position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.25, 0.26, 0.24, 28]} />
        </mesh>
        <mesh material={MAT.overalls} position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.04, 28]} />
        </mesh>

        {/* Shirt torso and short sleeves */}
        <mesh material={MAT.shirt} position={[0, 0.45, 0]} scale={[1, 0.85, 0.9]}>
          <sphereGeometry args={[0.26, 28, 18]} />
        </mesh>
        <mesh material={MAT.shirt} position={[-0.24, 0.5, 0]}>
          <sphereGeometry args={[0.09, 16, 12]} />
        </mesh>
        <mesh material={MAT.shirt} position={[0.24, 0.5, 0]}>
          <sphereGeometry args={[0.09, 16, 12]} />
        </mesh>

        {/* Overall bib, straps, buttons, pocket */}
        <mesh material={MAT.overalls} position={[0, 0.42, 0.2]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.28, 0.2, 0.05]} />
        </mesh>
        <mesh material={MAT.overalls} position={[-0.11, 0.53, 0.17]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.055, 0.14, 0.03]} />
        </mesh>
        <mesh material={MAT.overalls} position={[0.11, 0.53, 0.17]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.055, 0.14, 0.03]} />
        </mesh>
        <mesh material={MAT.button} position={[-0.1, 0.49, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.015, 14]} />
        </mesh>
        <mesh material={MAT.button} position={[0.1, 0.49, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.015, 14]} />
        </mesh>
        <mesh material={MAT.pocket} position={[0, 0.39, 0.228]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.13, 0.08, 0.01]} />
        </mesh>

        {/* Arms with mitten hands, hanging slightly outward */}
        <Arm side={-1} />
        <Arm side={1} />

        {/* Head sits straight on the shoulders, no neck */}
        <group ref={head} position={[0, 1.02, 0]}>
          <mesh material={MAT.skin} geometry={HEAD_GEOMETRY} />
          <group ref={curl}>
            <mesh material={MAT.skin} geometry={CURL_GEOMETRY} />
            <mesh material={MAT.skin} position={CURL_END}>
              <sphereGeometry args={[0.055, 12, 10]} />
            </mesh>
          </group>

          {/* Cat ears on the sides, pointing out and up */}
          <Ear side={-1} />
          <Ear side={1} />

          <group ref={eyes}>
            <Eye x={-EYE_X} />
            <Eye x={EYE_X} />
          </group>

          {/* Open "D" smile with a tongue, tilted to follow the lower face */}
          <group
            ref={mouth}
            position={[0, MOUTH_Y, surfaceZ(0, MOUTH_Y) + 0.004]}
            rotation={[0.35, 0, 0]}
          >
            <mesh material={MAT.mouth} scale={[1.15, 1, 1]}>
              <circleGeometry args={[0.07, 24, Math.PI, Math.PI]} />
            </mesh>
            <mesh material={MAT.tongue} position={[0, -0.045, 0.002]} scale={[1.1, 0.6, 1]}>
              <circleGeometry args={[0.035, 16]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function Arm({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 0.27, 0.48, 0]} rotation={[0, 0, side * 0.3]}>
      <mesh material={MAT.skin} position={[0, -0.1, 0]}>
        <capsuleGeometry args={[0.065, 0.12, 6, 12]} />
      </mesh>
      <mesh material={MAT.skin} position={[0, -0.22, 0.01]} scale={[1, 1.1, 0.9]}>
        <sphereGeometry args={[0.078, 16, 12]} />
      </mesh>
    </group>
  );
}

function Ear({ side }: { side: -1 | 1 }) {
  // A broad, flattened triangle poking out and up from the side of the head.
  return (
    <mesh
      material={MAT.skin}
      position={[side * 0.37, 0.06, -0.03]}
      rotation={[0, 0, -side * 1.0]}
      scale={[1, 1, 0.55]}
    >
      <coneGeometry args={[0.13, 0.22, 16]} />
    </mesh>
  );
}

function Eye({ x }: { x: number }) {
  // Sink the eye slightly into the head so it reads as set into the face.
  const z = surfaceZ(x, EYE_Y) - 0.012;
  return (
    <group position={[x, EYE_Y, z]} rotation={[0.08, x * 1.1, 0]}>
      <mesh material={MAT.eye} scale={[0.78, 1.2, 0.45]}>
        <sphereGeometry args={[0.1, 20, 16]} />
      </mesh>
      <mesh material={MAT.highlight} position={[0.025, 0.058, 0.042]} scale={[1, 1.3, 0.5]}>
        <sphereGeometry args={[0.017, 10, 8]} />
      </mesh>
    </group>
  );
}
