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

/** A note as the journal shows it: dated by when it was written, with its whole text for search. */
export type JournalEntry = {
  id: number;
  title: string;
  body: string;
  createdAt: number;
};

/** One day of the journal: the entries written that day, newest first. */
export type JournalDay = {
  /** The local calendar date, such as "2026-10-06". Stable, so it keys the day's section. */
  key: string;
  /** "Today", "Yesterday", "Mon, Oct 6", or "Mon, Oct 6, 2025" in another year. */
  title: string;
  /** Local midnight at the start of the day. */
  startsAt: number;
  entries: JournalEntry[];
};
