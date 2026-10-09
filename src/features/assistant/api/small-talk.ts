// Words around small talk that don't change it: "Thanks po", "Good night, Pinsan".
const TRAILING =
  / (?:po|pinsan|couz|cuz|cousin|buddy|friend|my friend|bro|sis|again|so much|lol|haha)$/;
const LEADING = /^(?:oh|aw+|well|ok|okay|so) /;
// A greeting before more small talk: "Hi, how are you?" is answered as "How are you?".
const GREETING_FIRST =
  /^(?:hi|hello|hey|yo|good (?:morning|afternoon|evening))(?: (?:pinsan|couz|cuz|po))? (?=\S)/;

const JOKES = [
  'Why did the calendar feel so popular? It had a lot of dates!',
  "Why don't eggs tell jokes? They'd crack each other up.",
  'What do you call a lazy kangaroo? A pouch potato!',
];

const HELP =
  'I can add tasks, set reminders (even every day), write in your journal and tell you what\'s coming up. Try "Remind me at 7 to call Mom" or "What do I have today?"';

type Answer = string | ((match: RegExpExecArray, now: number) => string);

const FEELINGS: Record<string, string> = {
  tired: "Sounds like a long day. Get some rest, and I'll keep track of things.",
  sad: "I'm sorry you're feeling down. I'm right here. If it helps, say \"Dear journal\" and tell me about it.",
  stressed:
    'Take a deep breath. One thing at a time, okay? Ask me "What do I have today?" and we\'ll sort it out.',
  bored: "Let's plan something fun! Tell me what and when, and I'll put it on your list.",
  good: "That's great to hear!",
  sick: 'Oh no, take care of yourself! Rest and drink lots of water.',
  hungry:
    'Time for a snack! Want something on your shopping list? Just say "Add bread to my list".',
  busy: 'You\'ve got a lot going on. Ask me "What do I have today?" and we\'ll go through it.',
};
const FEELING_WORDS: Record<string, keyof typeof FEELINGS> = {
  tired: 'tired',
  sleepy: 'tired',
  exhausted: 'tired',
  drained: 'tired',
  sad: 'sad',
  down: 'sad',
  lonely: 'sad',
  upset: 'sad',
  stressed: 'stressed',
  anxious: 'stressed',
  nervous: 'stressed',
  worried: 'stressed',
  overwhelmed: 'stressed',
  bored: 'bored',
  happy: 'good',
  good: 'good',
  great: 'good',
  fine: 'good',
  okay: 'good',
  ok: 'good',
  alright: 'good',
  excited: 'good',
  awesome: 'good',
  better: 'good',
  sick: 'sick',
  unwell: 'sick',
  hungry: 'hungry',
  busy: 'busy',
};

/** Each kind of small talk, as the whole message once it's tidied, and Pinsan's answer. */
const SMALL_TALK: [RegExp, Answer][] = [
  [
    /^(?:hi|hello|hey|hiya|heya|yo|howdy|hi there|hello there|hey there|pinsan)$/,
    "Hi! What's on your mind?",
  ],
  [/^(?:good )?morning$/, "Good morning! What's on your plate today?"],
  [/^good afternoon$/, "Good afternoon! How's your day going?"],
  [/^good evening$/, 'Good evening! Anything I can help you wrap up?'],
  [
    /^(?:how are you(?: doing)?|how're you|how you doing|how(?:'s| is) it going|how have you been|how(?:'s| is) your day|how(?:'s| is) life|what'?s up|wassup|sup|k[au]musta(?: ka)?|musta)(?: today)?$/,
    "I'm doing great, thanks for asking! How about you?",
  ],
  [/^(?:maraming )?salamat$/, 'Walang anuman!'],
  [
    /^(?:(?:thanks|thank you|thank u|thx|ty|tysm|thanks a lot|thank you very much)(?: for (?:the help|your help|helping(?: me)?|everything)(?: today)?)?|much appreciated|(?:i )?appreciate (?:it|you))$/,
    "You're welcome!",
  ],
  [
    /^(?:ok|okay|alright|all right|got it|sure|cool|yes|yeah|yep|no|nope|nah)$/,
    'Okay! Just tell me when you need something.',
  ],
  [
    /^(?:great|awesome|perfect|nice|nice one|good job|well done|sweet|wow|yay|you'?re (?:the best|awesome|amazing|smart)|you are (?:the best|awesome|amazing|smart))$/,
    'Thanks! Happy to help.',
  ],
  [
    /^(?:(?:i )?love you|i like you|i missed you|miss you|you'?re (?:so )?(?:cute|adorable|sweet)|you are (?:so )?(?:cute|adorable|sweet)|so cute|cute)$/,
    "Aww, you're making me blush! I'm always here for you.",
  ],
  [/^(?:sorry|my bad|oops)$/, 'No worries!'],
  [
    /^(?:are you there|you there|are you awake|are you listening|can you hear me)$/,
    "I'm here! What can I do for you?",
  ],
  [
    /^(?:good ?night|nighty night|night night|sleep well|sweet dreams|(?:i'?m|i am) (?:going to|off to|heading to) (?:bed|sleep)|time for bed)$/,
    "Good night! Sleep well. I'll keep an eye on your reminders.",
  ],
  [
    /^i (?:have|got|'ve got) (?:a |the )?(?:headache|cold|fever|flu|cough|stomachache|toothache)$/,
    FEELINGS.sick,
  ],
  [
    /^(?:bye|bye bye|goodbye|good bye|see you|see ya|see you (?:later|soon|tomorrow)|talk to you later|ttyl|catch you later|take care)$/,
    "Bye for now! I'll be here on my island.",
  ],
  [
    /^(?:who are you|what are you|who is this|what'?s your name|what is your name|who(?:'s| is) pinsan|tell me about yourself|introduce yourself|what does pinsan mean)$/,
    "I'm Pinsan, your cousin on this little island! I keep your tasks, reminders and journal right here on your phone, even offline.",
  ],
  [
    /^(?:what can you do|what do you do|what can i (?:say|ask)(?: you)?|what should i say|how do you work|how does this work|how do i use (?:you|this|this app)|help|what are you for|what can you help (?:me )?with)$/,
    HELP,
  ],
  [
    /^(?:tell me (?:a|another) joke|tell me something funny|say something funny|make me laugh|(?:a )?joke|(?:do you )?know any jokes|give me a joke)$/,
    (_, now) => JOKES[Math.floor(now / 60_000) % JOKES.length],
  ],
  [
    /^(?:i'?m|i am|im|i feel|i'?m feeling|i am feeling|feeling)(?: (?:so|really|very|a bit|a little|kind of|kinda|pretty|super|quite|too))* ([a-z]+)(?: (?:today|right now|now|tonight|lately))?$/,
    (match) => FEELINGS[FEELING_WORDS[match[1]]],
  ],
];

/**
 * Pinsan's answer to small talk: a greeting, thanks, "How are you?", "Who are you?", "Tell
 * me a joke", "I'm tired". Only the whole message counts, so "Thanks, remind me at 5 to
 * call Ana" is still a request. Returns null for anything else.
 */
export function replyToSmallTalk(text: string, now: number): string | null {
  let words = text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let previous;
  do {
    previous = words;
    words = words.replace(TRAILING, '').replace(LEADING, '').trim();
  } while (words !== previous);
  return answer(words, now) ?? answer(words.replace(GREETING_FIRST, ''), now);
}

function answer(words: string, now: number): string | null {
  for (const [pattern, reply] of SMALL_TALK) {
    const match = pattern.exec(words);
    if (!match) continue;
    const text = typeof reply === 'string' ? reply : reply(match, now);
    // A feeling Pinsan has no answer for is left to the model.
    if (text) return text;
  }
  return null;
}
