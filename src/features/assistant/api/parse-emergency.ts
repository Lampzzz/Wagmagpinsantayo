import { splitTrailingWhen } from '@/utils/parse-when';

import type { Command } from '../types';

// "9-1-1", "9 1 1" and "nine one one" all mean 911, however speech-to-text writes it.
const NINE_ONE_ONE = /\b(?:9[\s.-]*1[\s.-]*1|nine[\s-]+one[\s-]+one|nine[\s-]+eleven)\b/g;
const BREAK = /[.!?,;:]+/;
const BREAKS = /[.!?,;:]+/g;

// Words around a call for help that don't change it: "Hey Pinsan, please call 911 now".
const LEAD =
  /^(?:hey|hi|ok|okay|oh no|oh god|oh my god|please|pinsan|quick|quickly|hurry|just|can you|could you|would you|will you|i need you to|i want you to|i need to|i want to|i have to|i must|let'?s) /;
const TAIL =
  / (?:now|right now|right away|immediately|quick|quickly|fast|asap|please|pinsan|for me|for us)$/;

// Who to call. "Help" is here for "call for help" and "get help".
const SERVICE =
  '(?:(?:the )?(?:national )?emergency(?: (?:services?|numbers?|hotline|line))?|911|(?:an |the )?ambulance|(?:the )?police|(?:the )?cops|(?:the )?fire (?:department|brigade|station)|(?:the )?firefighters|(?:the )?rescue(?: team)?|help)';
const CALL =
  '(?:call|dial|phone|ring|contact|get|get me|get us|send|send me|send us|call for|send for)';
// Who it's for or where: "…for my dad", "…to my house", "…here".
const FOR_WHOM =
  " (?:for|to) (?:me|us|him|her|them|(?:my|our|this|the) [a-z']+(?: [a-z']+)?)| here| over here";

/** Every way of asking, once the extra words are trimmed. Each must be the whole phrase. */
const ASKS_FOR_HELP = [
  new RegExp(`^(?:help (?:me |us )?)?${CALL} ${SERVICE}(?:${FOR_WHOM})?$`),
  /^(?:an )?(?:medical )?emergency$/,
  /^(?:it'?s|this is|there'?s|there is|we have|i have|we'?ve got|i'?ve got) an? (?:medical |real )?emergency$/,
  /^(?:emergency|sos|mayday|911)(?: (?:emergency|call|911))?$/,
  /^(?:make|place) an? emergency call$/,
  /^(?:i|we) need (?:an ambulance|the police|police|the fire department|help|urgent help|emergency help|rescue)(?: here)?$/,
  /^(?:please )?help (?:me|us)$/,
  /^(?:somebody|someone|anybody|anyone|please) help(?: me| us)?$/,
  /^help(?: help)+$/,
  /^(?:there'?s|there is) a fire$|^fire$/,
];

// Parts that can stand next to a call for help without changing it: "Help! Call 911!"
const ALONGSIDE =
  /^(?:help|please|quick|quickly|hurry|hurry up|now|oh no|oh god|oh my god|hey|hey pinsan|pinsan|ok|okay|urgent)$/;

/**
 * Reads a call for help: "Call 911", "Call an ambulance", "Emergency!", "I need help".
 * Only the whole message counts, so "Remind me to update my emergency contacts",
 * "Help me plan my day" and "Call the police station tomorrow" are left alone. A bare
 * "help" is a question about the app. Pinsan always asks before the dialer opens.
 */
export function parseEmergency(text: string): Command | null {
  const phrase = text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(NINE_ONE_ONE, '911')
    .replace(/\s+/g, ' ')
    .trim();
  if (!phrase) return null;

  if (asksForHelp(phrase.replace(BREAKS, ' ').replace(/\s+/g, ' ').trim())) {
    return { kind: 'call-emergency' };
  }
  // Or in pieces: "Hey Pinsan, call an ambulance, quick!"
  let asked = false;
  for (const part of phrase.split(BREAK)) {
    const words = part.trim();
    if (!words) continue;
    if (asksForHelp(words)) asked = true;
    else if (!ALONGSIDE.test(words)) return null;
  }
  return asked ? { kind: 'call-emergency' } : null;
}

function asksForHelp(words: string): boolean {
  const trimmed = trimExtraWords(words);
  // A time makes it a to-do: "Call the police for my neighbor tomorrow".
  if (splitTrailingWhen(words) || splitTrailingWhen(trimmed)) return false;
  return ASKS_FOR_HELP.some((pattern) => pattern.test(words) || pattern.test(trimmed));
}

function trimExtraWords(words: string): string {
  let text = words;
  let previous;
  do {
    previous = text;
    text = text.replace(LEAD, '').replace(TAIL, '').trim();
  } while (text !== previous);
  return text;
}
