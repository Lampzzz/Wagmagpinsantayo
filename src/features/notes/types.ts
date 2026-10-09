/** What the user writes in a note. */
export type NoteContent = {
  title: string;
  body: string;
};

/** A note the AI suggested that hasn't been saved yet. */
export type NoteDraft = NoteContent;

/** A saved note. Times are milliseconds since the epoch. */
export type Note = NoteContent & {
  id: number;
  createdAt: number;
  updatedAt: number;
};

/**
 * A task the AI found in a note, waiting for the user to review it. The AI gives
 * the title and the date words; code works out `dueAt`.
 */
export type TaskSuggestion = {
  /** Stable key for the review list. */
  key: string;
  title: string;
  /** The date or time words as the note wrote them ("by Friday"), or '' when it gave none. */
  when: string;
  /** Null when there's no date. For an all-day deadline, the last millisecond of that day. */
  dueAt: number | null;
  /** False for an all-day deadline. */
  dueHasTime: boolean;
};

/** What the notes list shows for a note. `excerpt` is the start of the body. */
export type NoteSummary = {
  id: number;
  title: string;
  excerpt: string;
  updatedAt: number;
};
