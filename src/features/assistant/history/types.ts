/** Who said a line: the user, or Pinsan answering. */
export type HistoryRole = 'user' | 'pinsan';

/** One saved line of a conversation, from Home or the Conversations screen. */
export type HistoryMessage = {
  id: number;
  role: HistoryRole;
  /** What was shown: the user's words or tapped answer, or the text of Pinsan's reply. */
  text: string;
  /** True when the user said it out loud. Always false for Pinsan. */
  spoken: boolean;
  /** Milliseconds since the epoch. */
  createdAt: number;
};

export type NewHistoryMessage = Pick<HistoryMessage, 'role' | 'text' | 'spoken'>;

/** The lines of one local calendar day, oldest first. */
export type HistoryDay = {
  /** The local date, such as "2026-10-08". */
  key: string;
  /** "Today", "Yesterday", "Thu, Oct 8", or "Wed, Dec 31, 2025" for another year. */
  title: string;
  messages: HistoryMessage[];
};
