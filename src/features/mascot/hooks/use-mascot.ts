import { create } from 'zustand';

import type { MascotMood } from '../types';

type MascotState = {
  mood: MascotMood;
  // Bumped on every setMood so the scene can restart one-shot animations (hop, tilt).
  moodChangedAt: number;
  setMood: (mood: MascotMood) => void;
};

// The 3D scene reads this with getState() inside useFrame, so mood changes never
// re-render the canvas. React components use the hook with a selector.
export const useMascotStore = create<MascotState>((set) => ({
  mood: 'idle',
  moodChangedAt: 0,
  setMood: (mood) => set({ mood, moodChangedAt: Date.now() }),
}));

export function useMascot() {
  const mood = useMascotStore((s) => s.mood);
  const setMood = useMascotStore((s) => s.setMood);
  return { mood, setMood };
}
