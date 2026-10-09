import { parseDailyReminder } from './parse-daily-reminder';

describe('parseDailyReminder', () => {
  it.each([
    [
      'Remind me to take my medicine every day at 8 AM',
      { title: 'take my medicine', when: 'at 8 AM' },
    ],
    [
      'Remind me to take my medicine everyday at 8 AM.',
      { title: 'take my medicine', when: 'at 8 AM' },
    ],
    [
      'Remind me every morning at 8 to take my vitamins',
      { title: 'take my vitamins', when: 'this morning at 8' },
    ],
    ['Remind me daily at 9pm to stretch', { title: 'stretch', when: 'at 9pm' }],
    ['Remind me every night to take my meds', { title: 'take my meds', when: 'tonight' }],
    ['Remind me each afternoon to drink water', { title: 'drink water', when: 'this afternoon' }],
    ['Set a daily reminder at 7:30 to walk the dog', { title: 'walk the dog', when: 'at 7:30' }],
    ['Remind me to stretch every day', { title: 'stretch' }],
    ['Remind me every day', { title: '' }],
    ['Take my medicine every day at 8 AM', { title: 'Take my medicine', when: 'at 8 AM' }],
    ['Water the plants every evening', { title: 'Water the plants', when: 'this evening' }],
  ])('reads %p as a daily reminder', (text, fields) => {
    expect(parseDailyReminder(text)).toEqual({ kind: 'add-reminder', ...fields, repeat: 'daily' });
  });

  it.each([
    [
      'Set an alarm every day at 8 AM to take my medicine',
      { title: 'take my medicine', when: 'at 8 AM' },
    ],
    ['Wake me up every day at 6', { title: 'Wake up', when: 'at 6' }],
  ])('reads %p as a daily alarm', (text, fields) => {
    expect(parseDailyReminder(text)).toEqual({
      kind: 'add-reminder',
      ...fields,
      alarm: true,
      repeat: 'daily',
    });
  });

  it.each([
    'Remind me every Monday at 8 to take out the trash',
    'Remind me every 2 hours to drink water',
    'Remind me every other day to water the plants',
    'Remind me every weekday at 7 to leave for work',
    'Remind me every day and every Monday to stretch',
    'Create a task to exercise every day',
    'What reminders do I have every day?',
    'Remind me tomorrow at 8 to call Ana',
    'Exercise daily',
  ])('leaves %p alone', (text) => {
    expect(parseDailyReminder(text)).toBeNull();
  });
});
