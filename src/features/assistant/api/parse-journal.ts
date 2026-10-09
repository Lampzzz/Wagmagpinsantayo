import type { Command } from '../types';

// Polite or calling words before the trigger: "Hey Pinsan, please take a note: …".
const LEAD =
  /^(?:(?:hey|hi|hello|ok|okay|so|please|pinsan|can you|could you|would you|will you|i want you to|i need you to|i'?d like you to|i want to|i'?d like to|let'?s)\b[\s,]*)+/i;

// The entry: any text, across lines too.
const ENTRY = '([\\s\\S]*)';
// What may sit between a trigger and the entry: "journal: …", "Dear journal, …".
const MARK = '[\\s:,;.!—–-]+';
const PUNCTUATION = '\\s*[:,;.!—–-]+\\s*';

/** Ways to start a journal entry. The entry is the first group that matched, if any. */
const TRIGGERS = [
  // "Write in my journal: …", "Add to my journal that …", "Put this in today's journal …"
  new RegExp(
    `^(?:write|put|add|log|record|save|jot(?: down)?)(?: (?:this|that|it))?(?: down)? (?:in|into|to|on) (?:my|the|today'?s) (?:journal|diary)(?: entry)?(?:\\s+that\\s+${ENTRY}|${MARK}${ENTRY})?$`,
    'i',
  ),
  // "Add a journal entry: …", "New journal entry, …"
  new RegExp(
    `^(?:write|add|make|log|start|new)(?: (?:a|an|my|today'?s))? (?:journal|diary) entry(?:${MARK}${ENTRY})?$`,
    'i',
  ),
  // "Journal: …", "Journal entry, …"
  new RegExp(`^(?:my )?(?:journal|diary)(?: entry)?(?:${PUNCTUATION}${ENTRY})?$`, 'i'),
  // "Dear journal, …"
  new RegExp(`^dear (?:journal|diary)(?:${MARK}${ENTRY})?$`, 'i'),
  // "Note: …", "Note to self …", "Note that …"
  new RegExp(`^note(?:${PUNCTUATION}${ENTRY})?$`, 'i'),
  new RegExp(`^note to (?:self|myself)(?:${MARK}${ENTRY})?$`, 'i'),
  new RegExp(`^note that\\s+${ENTRY}$`, 'i'),
  // "Take a note: …", "Make a note that …", "Make a note of …". "Make a note to call
  // Ana" and "Write a note to the teacher" are to-dos, so they're left alone.
  new RegExp(
    `^(?:take|make|write|write down|jot down) (?:a |an )?(?:quick |short )?notes?(?:${PUNCTUATION}${ENTRY}|\\s+(?:that|saying|of)\\s+${ENTRY})?$`,
    'i',
  ),
  // Spoken without a pause: "Take a note I parked on level 3".
  new RegExp(`^take (?:a |an )?(?:quick |short )?note\\s+(?!(?:to|for)\\b)${ENTRY}$`, 'i'),
];

/**
 * Reads a journal entry: "Write in my journal: …", "Journal: …", "Dear journal …",
 * "Note: …", "Take a note: …", "Make a note that …". The words after the trigger are
 * the entry, kept as the user said them, so nothing in them is read as a request.
 * An entry with no words still counts, and Pinsan asks what to write.
 */
export function parseJournalEntry(text: string): Command | null {
  const sentence = text.trim().replace(LEAD, '');
  for (const trigger of TRIGGERS) {
    const match = trigger.exec(sentence);
    if (match) {
      const entry = match.slice(1).find((group) => group !== undefined) ?? '';
      return { kind: 'add-note', text: entry.trim() };
    }
  }
  return null;
}
