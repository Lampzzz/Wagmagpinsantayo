import { create } from 'zustand';

import type { MascotMood } from '../types';

type MascotState = {
  mood: MascotMood;
  // Bumped on every setMood so the scene can restart one-shot animations (hop, tilt).
  moodChangedAt: number;
  setMood: (mood: MascotMood) => void;
};

// Reactions (the happy hop, the oops tilt) last a moment, then Pinsan goes back to idle.
const REACTION_MS = 3000;

// The 3D scene reads this with getState() inside useFrame, so mood changes never
// re-render the canvas. React components use the hook with a selector.
export const useMascotStore = create<MascotState>((set, get) => ({
  mood: 'idle',
  moodChangedAt: 0,
  setMood: (mood) => {
    const changedAt = Date.now();
    set({ mood, moodChangedAt: changedAt });
    if (mood !== 'done' && mood !== 'oops') return;
    setTimeout(() => {
      if (get().moodChangedAt === changedAt) set({ mood: 'idle', moodChangedAt: Date.now() });
    }, REACTION_MS);
  },
}));

export function useMascot() {
  const mood = useMascotStore((s) => s.mood);
  const setMood = useMascotStore((s) => s.setMood);
  return { mood, setMood };
}
