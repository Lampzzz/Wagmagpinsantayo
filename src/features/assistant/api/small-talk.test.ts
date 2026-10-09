import { replyToSmallTalk } from './small-talk';

describe('replyToSmallTalk', () => {
  it.each([
    ['Hi!', "Hi! What's on your mind?"],
    ['Pinsan?', "Hi! What's on your mind?"],
    ['Good morning po', "Good morning! What's on your plate today?"],
    ['Hi, how are you?', "I'm doing great, thanks for asking! How about you?"],
    ['Good morning Pinsan, how are you?', "I'm doing great, thanks for asking! How about you?"],
    ['Kumusta ka?', "I'm doing great, thanks for asking! How about you?"],
    ['Thanks so much!', "You're welcome!"],
    ['Okay, thanks.', "You're welcome!"],
    ['Thank you for helping me today', "You're welcome!"],
    ['Salamat po!', 'Walang anuman!'],
    ['Who are you?', expect.stringContaining("I'm Pinsan, your cousin")],
    ['What can you do?', expect.stringContaining('I can add tasks, set reminders')],
    ['Help', expect.stringContaining('I can add tasks, set reminders')],
    [
      "I'm so tired today.",
      "Sounds like a long day. Get some rest, and I'll keep track of things.",
    ],
    ["I'm feeling a bit sad", expect.stringContaining("I'm sorry you're feeling down.")],
    ['I have a headache', 'Oh no, take care of yourself! Rest and drink lots of water.'],
    ["I'm going to bed", "Good night! Sleep well. I'll keep an eye on your reminders."],
    ['I love you', "Aww, you're making me blush! I'm always here for you."],
    ['See you tomorrow', "Bye for now! I'll be here on my island."],
  ])('answers %p', (text, answer) => {
    expect(replyToSmallTalk(text, 0)).toEqual(answer);
  });

  it('tells a different joke as the minutes go by', () => {
    const first = replyToSmallTalk('Tell me a joke', 0);
    const next = replyToSmallTalk('Tell me a joke', 60_000);
    expect(first).toEqual(expect.any(String));
    expect(next).not.toBe(first);
  });

  it.each([
    'Thanks, remind me at 5 to call Ana',
    'Thank Ana for the gift',
    'Hi, add a task to buy milk',
    "I'm done with the laundry",
    "I'm stressed about my exam tomorrow",
    "What's the weather like?",
    'Later',
    '',
  ])('leaves %p to the rest of the assistant', (text) => {
    expect(replyToSmallTalk(text, 0)).toBeNull();
  });
});
