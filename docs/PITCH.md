# Pitch and demo video

Scripts for the ~1-minute demo video and the 5-minute live pitch, plus likely judge questions.
Demo Day: 5 minutes of pitch and live demo, then 3 minutes of judge Q&A.

Everything below is in the app on `development`. The voice and AI steps haven't run on a real
phone yet (the emulator can't run the models), so rehearse them on the demo phone first and cut
any step that doesn't work there.

## Numbers to measure first

Never say a number we haven't measured. Fill these in on the demo phone, or leave them out of
the pitch.

| What                                                        | Result                  |
| ----------------------------------------------------------- | ----------------------- |
| Demo phone model, Android version, RAM                      | [PLACEHOLDER]           |
| A typed request the rules handle (until the bubble shows)   | [MEASURE ON DEMO PHONE] |
| A spoken Quick Add on Home, from the second mic tap to Save | [MEASURE ON DEMO PHONE] |
| A free-form request that goes to the AI                     | [MEASURE ON DEMO PHONE] |
| A 15-second voice note, from Stop to the draft              | [MEASURE ON DEMO PHONE] |
| Summarize and Extract Tasks on the seeded note              | [MEASURE ON DEMO PHONE] |
| Home screen fps, idle and while the AI is thinking          | [MEASURE ON DEMO PHONE] |
| Battery used by a 5-minute demo run                         | [MEASURE ON DEMO PHONE] |

## Demo video (~1 minute, airplane mode)

Record the phone screen with Android's screen recorder. Keep the airplane icon visible in the
status bar the whole time. If you speed up a wait, say so on screen ("sped up 2×"): fake demos
can get a team disqualified. Pinsan's replies aren't read aloud, so record the voice-over
separately or speak between his answers.

| Time      | Shot                                                                                                                                                                                                                                                        | Voice-over                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:05 | Pull down quick settings. Turn on airplane mode. Wi-Fi and data are off.                                                                                                                                                                                    | "This is Couz. Airplane mode is on. No Wi-Fi, no data."                                                                               |
| 0:05–0:12 | Open the app on Pinsan's island. He walks around. Zoom in on the "Offline · private" badge.                                                                                                                                                                 | "Meet Pinsan. He's a private assistant, and his AI runs on this phone."                                                               |
| 0:12–0:30 | Tap the mic. The camera glides in to Pinsan's face. Say "Pay electric bill tomorrow 5pm"; the words appear on the paper note as you speak. Tap the mic again. Pinsan thinks, then his bubble asks to add it for tomorrow at 5:00 PM. Tap Save. Pinsan hops. | "I just tell him. Whisper turns my voice into text on the phone, our code works out the date, and nothing is saved until I tap Save." |
| 0:30–0:38 | Tap ☰, then Tasks: "Pay electric bill" under Upcoming. Back, ☰ → Reminders: its 5:00 PM reminder.                                                                                                                                                         | "One sentence became a task and a reminder."                                                                                          |
| 0:38–0:46 | Home, mic: "Remind me to take my medicine every day at 8 AM". The bubble shows it back: every day at 8:00 AM. Tap Save.                                                                                                                                     | "Every-day reminders too."                                                                                                            |
| 0:46–0:54 | Home, mic: "Dear journal, today we built Pinsan." The bubble asks "Save this to today's journal?" Tap Save. ☰ → Journal: the entry under Today.                                                                                                            | "And a journal I can talk to."                                                                                                        |
| 0:54–1:00 | Back on Home with Pinsan. End card: "Couz · works offline · no account · your data stays on your phone".                                                                                                                                                    | "Private, offline, no account. Couz."                                                                                                 |

Swap-in shots, if there's time:

- **Summarize or Extract Tasks:** ☰ → Journal, open the seeded note, tap Summarize (or Extract
  tasks, untick one, Save). Voice-over: "The language model reads my note on the phone. It only
  suggests; I decide."
- **Emergency:** ☰ → Emergency shows "Call emergency services?". Tap Cancel. Voice-over: "In an
  emergency, it opens the dialer with 911. It never calls by itself." Never tap Call on camera.
- **A reminder arriving:** type "Remind me in 1 minute to call Ana" with the keyboard button at
  the start, then cut to the notification. Voice-over: "And the reminder arrives on time, still in
  airplane mode."

Post it on X or LinkedIn, tag Devin / Cognition and add #AppBuildersPH. Caption:

> Couz: talk to Pinsan, a 3D mascot whose AI runs on your phone. Tasks, reminders and a
> journal, shot in airplane mode. Built during the AppBuilders PH Hackathon 2026. #AppBuildersPH

## Live pitch (5 minutes, mostly demo)

At most one slide: what runs where. Everything else is the phone, mirrored to the screen.

| Time      | Part               | What to do and say                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Problem            | "Our users are students and young working Filipinos. Their mobile data drops out on the commute and costs money. Cloud assistants stop working without signal, need an account, and send what you tell them to a server. Couz runs its AI on the phone."                                                                                                                                                                                          |
| 0:30–0:45 | Airplane mode      | Turn on airplane mode where the judges can see it. On Home, tap the keyboard button and type "Remind me in 3 minutes to drink water". It should fire near the end of the demo.                                                                                                                                                                                                                                                                    |
| 0:45–1:00 | Pinsan's island    | "This is Pinsan, built in code during the hackathon. There's no tab bar: you talk to him, and everything else is in this ☰ menu. His mood shows what the AI is doing: listening, thinking, done."                                                                                                                                                                                                                                                |
| 1:00–1:45 | Quick Add by voice | Tap the mic: the camera glides in to his face. Say "Pay electric bill tomorrow 5pm" and point at the words appearing on the paper note. Tap the mic again. His bubble shows the task for tomorrow at 5:00 PM with Save, Edit and Cancel. "Edit opens the task editor, filled in, with a Remind me switch." Tap Save; he hops. ☰ → Tasks, then ☰ → Reminders. "Whisper ran on this phone, and code read the date: no model needed for this one." |
| 1:45–2:15 | Journal by voice   | Mic: "Dear journal, we built Pinsan overnight and I'm tired but happy." The bubble asks "Save this to today's journal?" Tap Save. ☰ → Journal: the entry under Today, the strip of days, the search box. "My words, kept as I said them, on the phone."                                                                                                                                                                                          |
| 2:15–2:40 | Every-day reminder | Mic: "Remind me to take my medicine every day at 8 AM." Pinsan shows it back: every day at 8:00 AM, and when the first one is. Tap Save. "Marking it done only skips today. It comes back tomorrow."                                                                                                                                                                                                                                              |
| 2:40–3:25 | Summarize, Extract | ☰ → Journal, open the seeded note. Tap Summarize: a few bullet points. Then Extract tasks: the review sheet lists the to-dos with their dates. Untick one, tap Save. "This is the 1.2B language model, on the phone. It only suggests. Code works out the dates, and nothing is saved until I say so."                                                                                                                                           |
| 3:25–3:45 | Emergency          | ☰ → Emergency. The phone asks "Call emergency services?". Tap **Cancel**. "Saying 'call emergency' does the same. It never dials by itself: it opens the dialer with 911 filled in, and I press call. No phone permission." Never tap Call 911 on stage.                                                                                                                                                                                         |
| 3:45–4:00 | Reminder           | The "drink water" reminder fires. "Still in airplane mode."                                                                                                                                                                                                                                                                                                                                                                                       |
| 4:00–4:30 | How it works       | One slide: LFM2.5 1.2B and Whisper base.en through React Native ExecuTorch. SQLite and local notifications. Everything said to Pinsan is kept on the phone, by day, and can be cleared. The only internet use is the one-time ~1.1 GB model download. The AI proposes, code checks and works out dates, the user confirms.                                                                                                                        |
| 4:30–5:00 | Close              | "Private, works with no signal, no per-request cost, no account. Next: Taglish, emergency contacts, scan to text. Thank you."                                                                                                                                                                                                                                                                                                                     |

Rehearse these exact sentences. If a voice step fails, type the same sentence with the keyboard
button: it takes the same path.

### Before going on stage

- The demo phone says **AI is ready** (☰ → AI setup). Download the models well before the demo,
  over Wi-Fi.
- Notifications are allowed, and "Alarms & reminders" is allowed for the app (Android 14+). ☰ →
  Reminders shows a note with **Open settings** for it.
- Do Not Disturb is off, so the reminder shows. Pinsan's replies aren't read aloud, so only the
  notification needs sound.
- Seed data: two or three tasks for today, and a note of 50 words or more with a few to-dos and
  dates in it (Summarize skips notes under 50 words).
- Restart the app to clear Pinsan's bubble and the Conversations chat. Earlier lines stay in
  Conversations → History; clear them there for a clean history.
- The app is open before you start. A development build loads its JavaScript from Metro at
  launch, so keep the phone on USB (`adb reverse tcp:8081 tcp:8081`), or install a release build
  that doesn't need Metro (`npx expo run:android --variant release`). Test whichever you choose.
- Mirror the phone over USB (for example with scrcpy), so the demo doesn't need the venue Wi-Fi.
  Test it on the venue display.
- The demo video is saved on the laptop as a file, not only on X.
- Rehearse twice with a timer.

### Backup plan

- **The room is noisy, or voice fails.** Tap the keyboard button on Home and type the same
  sentence. Typed and spoken requests take the same path.
- **The AI is slow.** Say what is happening: "This is running on the phone itself." Then switch to
  requests the fixed rules answer without the model, even before the download: "Pay electric bill
  tomorrow 5pm" (rule-based Quick Add), "Remind me in 10 minutes to stretch", "Remind me to take
  my medicine every day at 8 AM", "Journal: …" and "What tasks do I have today?".
- **The 3D scene stutters.** Set `MASCOT_3D = false` in `src/constants/config.ts` to show the 2D
  mascot. It's a code change: a development build needs a Metro reload, and a release build needs
  a rebuild. Decide during rehearsal, not on stage. The 2D mascot is a simple stand-in for now.
- **Call 911 gets tapped by mistake.** The dialer opens with 911 filled in, but nothing is dialed
  until someone presses call. Back out of the dialer.
- **The app crashes.** Reopen it. Notes, tasks, reminders and the history are saved on the phone.
- **Nothing works.** Play the demo video from the laptop and talk over it.

## Likely judge questions

**1. Why a 1.2B model?**
It has to download once over Wi-Fi or mobile data and run on a phone next to the 3D scene. With
speech, the whole download is about 1.1 GB. Its jobs are narrow: turn a sentence into a short
list of actions, summarize a note, find its to-dos, or tidy a transcript. Code checks every
output and works out dates, and the common requests skip the model entirely, so a small model is
enough. LFM2.5 1.2B is made for on-device use and comes ready-made in React Native ExecuTorch.
Speed on our phone: [MEASURE ON DEMO PHONE].

**2. What happens if there's no download?**
Notes, the journal, tasks, reminders, Quick Add, every-day reminders, the emergency call and the
typed requests the rules know still work. Voice, free-form requests, Summarize and Extract Tasks
show a "Set up AI" button. Nothing downloads until the user taps Download. The app checks free
space first, and a stopped download can be retried.

**3. How do you keep dates correct?**
The model never works out a date. It copies the user's time words, like "tomorrow at 5 pm", and
our code turns them into a time using the phone's clock. That code has unit tests with fixed
dates. A reminder date with no time means 9:00 AM. A time that already passed today makes the app
ask if you meant tomorrow. Every-day reminders work; other repeats, like "every Monday", are
turned down instead of saved wrong.

**4. How do you stop it from making things up?**
The model only proposes actions. Code checks each one against your real tasks and reminders, asks
when several match, and confirms deletes. Quick Add tasks, journal entries and every-day
reminders are shown back for a yes before they're saved. Replies are written by code from what
actually happened, so Pinsan never claims something he didn't do. Voice-note drafts and summary
points that add a number or date you didn't say are retried or dropped.

**5. Does anything leave the phone?**
Your notes, journal, tasks, reminders, voice and conversation history don't. The history of what
you said to Pinsan is kept on the phone only, by day, and Conversations → History → Clear deletes
it. There's no account, no server and no analytics of our own. The only network use is the
one-time model download from Hugging Face. During it, the ExecuTorch library sends anonymous
download statistics (model file name, country code, platform) to Software Mansion; we haven't
switched that off. Android's own Google backup can also include app data if the user turned it
on; we haven't disabled that either.

**6. Can it call for help? Does it call by itself?**
Never by itself. Code, not the AI, recognizes "call emergency", "call 911" or "I need help".
Pinsan asks "Call emergency services (911)?", and only then does the phone's dialer open with 911
filled in; the user presses call. So it needs no phone permission. A typed call for help goes
through even while Pinsan is still answering, and the ☰ menu's Emergency row works at any time.
The app has to be open; on a locked phone, the phone's own emergency call is faster.

**7. What about battery and heat?**
We haven't measured it properly: [MEASURE ON DEMO PHONE]. What helps: the model loads only for a
task and is freed right after, only one model is in memory at a time, common requests skip the
model entirely, the 3D scene draws at most 15 frames a second while the AI thinks, and it stops
drawing when you leave Home.

**8. Does it understand Taglish or Filipino?**
Not yet. It's English-only: Whisper base.en only knows English, and our rules are written in
English. The same library has multilingual Whisper models. We'd need to test them, and our rules
and prompts, on Taglish before we could claim it.

**9. Why doesn't Pinsan talk back?**
A choice for the demo: his answer is in the bubble, and a hall is noisy. Reading replies aloud
with the phone's own voice is one switch in the code (`READ_REPLIES_ALOUD`). Screen readers
announce every reply either way.

**10. Which phones can run it?**
The AI needs Android 13 or newer, and the app checks. It also needs about 1.1 GB of free storage.
We demo on [PLACEHOLDER: demo phone model]. We haven't tested low-memory phones. On older phones,
notes, the journal, tasks, reminders and the rule-based requests still work.

**11. What's new here?**
It's an assistant that acts, not just a chatbot: you talk to a character, and he turns plain
speech into tasks, reminders and journal entries, fully on the phone, with no account. Pinsan's
moods (listening, thinking, done, oops) show what the AI is doing, so a wait on a phone feels
friendly instead of broken.

**12. What did you build, and what did you reuse?**
We built the app during the hackathon, starting from Expo's blank template. We used open-source
libraries, pre-trained models and the Fredoka and Nunito fonts, all disclosed. Pinsan and the
island are built in code. The island map and character reference images were made with an AI
image model during the hackathon. We used Claude Code as an AI coding tool.
