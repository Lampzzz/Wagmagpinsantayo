import { Canvas } from '@react-three/fiber/native';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { LIGHTS } from '../scene/lighting';
import type { MascotMood } from '../types';
import { Pinsan, showPaint } from './pinsan';

// A development page that shows Pinsan alone on light grey, as on the character sheets, so its
// shape, light and walk can be checked against them without the island around it. Straight-on
// orthographic views, the same lights as the island.

export type StudioView = 'front' | 'turnaround' | 'walk' | 'moods';

type Figure = {
  x: number;
  y: number;
  /** Turn about the vertical: 0 faces the camera, −π/2 faces left. */
  turn: number;
  mood?: MascotMood;
  stride?: { phase: number; stepping: number };
};

type Layout = { figures: Figure[]; left: number; right: number; bottom: number; top: number };

const SIDE = -Math.PI / 2;
const STANDING = { phase: 0, stepping: 0 };

const LAYOUTS: Record<StudioView, Layout> = {
  front: {
    figures: [{ x: 0, y: 0, turn: 0 }],
    left: -0.85,
    right: 0.85,
    bottom: -0.15,
    top: 1.9,
  },
  // Front, side, back and three-quarter, like the model sheet.
  turnaround: {
    figures: [
      { x: -0.8, y: 2.1, turn: 0 },
      { x: 0.8, y: 2.1, turn: SIDE },
      { x: -0.8, y: 0, turn: Math.PI },
      { x: 0.8, y: 0, turn: -0.6 },
    ],
    left: -1.6,
    right: 1.6,
    bottom: -0.15,
    top: 3.95,
  },
  // Facing right through one walk cycle, like the walk sheet: contact, down, passing, up,
  // contact, passing.
  walk: {
    figures: [0.5, 0.75, 1, 1.25, 1.5, 2].map((turns, i) => ({
      x: i % 2 ? 0.8 : -0.8,
      y: (2 - Math.floor(i / 2)) * 2.05,
      turn: -SIDE,
      stride: { phase: turns * Math.PI, stepping: 1 },
    })),
    left: -1.6,
    right: 1.6,
    bottom: -0.15,
    top: 6.05,
  },
  // The expression sheet: idle, listening, thinking, done, oops.
  moods: {
    figures: (['idle', 'listening', 'thinking', 'done', 'oops'] as const).map((mood, i) => ({
      x: i % 2 ? 0.8 : -0.8,
      y: (2 - Math.floor(i / 2)) * 1.95,
      turn: 0,
      mood,
    })),
    left: -1.6,
    right: 1.6,
    bottom: -0.15,
    top: 5.75,
  },
};

export function PinsanStudio({ view, paint }: { view: StudioView; paint: boolean }) {
  const { width, height } = useWindowDimensions();
  const layout = LAYOUTS[view];
  const zoom = Math.min(
    width / (layout.right - layout.left),
    height / (layout.top - layout.bottom),
  );

  useEffect(() => {
    showPaint(paint);
    return () => showPaint(true);
  }, [paint]);

  return (
    <View style={styles.backdrop}>
      <Canvas
        key={view}
        style={styles.fill}
        orthographic
        camera={{
          zoom,
          near: 0.1,
          far: 100,
          position: [(layout.left + layout.right) / 2, (layout.bottom + layout.top) / 2, 20],
          rotation: [0, 0, 0],
        }}
      >
        <ambientLight intensity={LIGHTS.ambient.intensity} color={LIGHTS.ambient.color} />
        <hemisphereLight args={[LIGHTS.sky.color, LIGHTS.sky.ground, LIGHTS.sky.intensity]} />
        <directionalLight
          position={LIGHTS.sun.position}
          intensity={LIGHTS.sun.intensity}
          color={LIGHTS.sun.color}
        />
        {layout.figures.map((figure, i) => (
          <group key={i} position={[figure.x, figure.y, 0]} rotation={[0, figure.turn, 0]}>
            <Pinsan mood={figure.mood ?? 'idle'} stride={figure.stride ?? STANDING} still />
          </group>
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  // The grey of the character sheets.
  backdrop: { flex: 1, backgroundColor: '#D9DBDE' },
  fill: { flex: 1 },
});
