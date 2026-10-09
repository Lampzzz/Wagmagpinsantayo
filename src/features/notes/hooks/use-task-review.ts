import { create } from 'zustand';

import type { TaskSuggestion } from '../types';

/** Suggestions waiting in the review sheet, and the note they came from. */
export type TaskReview = {
  /** The route key of the note: its id, or 'new' while it has no row yet. */
  noteKey: string;
  suggestions: TaskSuggestion[];
  /** The note was long, so the AI may have missed some tasks. */
  long: boolean;
};

/** What the review saved, shown back in the note editor once the sheet closes. */
export type TaskReviewOutcome = { title: string; detail: string };

type TaskReviewState = {
  review: TaskReview | null;
  outcome: TaskReviewOutcome | null;
  startReview: (review: TaskReview) => void;
  finishReview: (outcome: TaskReviewOutcome) => void;
  cancelReview: () => void;
  clearOutcome: () => void;
};

// The editor hands suggestions to the sheet here rather than through route
// params, which would put the user's note text in the URL and limit its size.
export const useTaskReviewStore = create<TaskReviewState>((set) => ({
  review: null,
  outcome: null,
  startReview: (review) => set({ review, outcome: null }),
  finishReview: (outcome) => set({ review: null, outcome }),
  cancelReview: () => set({ review: null }),
  clearOutcome: () => set({ outcome: null }),
}));

/** The `noteId` route param for the review sheet. */
export function noteRouteKey(noteId: number | null): string {
  return noteId === null ? 'new' : String(noteId);
}
