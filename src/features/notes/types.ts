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

/** What the notes list shows for a note. `excerpt` is the start of the body. */
export type NoteSummary = {
  id: number;
  title: string;
  excerpt: string;
  updatedAt: number;
};
