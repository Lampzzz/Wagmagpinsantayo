# Pitch and demo video

Scripts for the ~1-minute demo video and the 5-minute live pitch, plus likely judge questions.
Demo Day: 5 minutes of pitch and live demo, then 3 minutes of judge Q&A.

Features marked "(if done)" are still in progress. Use those shots only if the feature landed
before the code freeze; otherwise skip them. The rest is in the app today.

## Numbers to measure first

Never say a number we haven't measured. Fill these in on the demo phone, or leave them out of
the pitch.

| What                                                     | Result                  |
| -------------------------------------------------------- | ----------------------- |
| Demo phone model, Android version, RAM                   | [PLACEHOLDER]           |
| A typed request the rules handle (until the reply shows) | [MEASURE ON DEMO PHONE] |
| A free-form request that goes to the AI                  | [MEASURE ON DEMO PHONE] |
| A 15-second voice note, from Stop to the draft           | [MEASURE ON DEMO PHONE] |
| Home screen fps, idle and while the AI is thinking       | [MEASURE ON DEMO PHONE] |
| Battery used by a 5-minute demo run                      | [MEASURE ON DEMO PHONE] |

## Demo video (~1 minute, airplane mode)

Record the phone screen with Android's screen recorder. Keep the airplane icon visible in the
status bar the whole time. If you speed up a wait, say so on screen ("sped up 2×"): fake demos
can get a team disqualified.

| Time      | Shot                                                                                                                                                                       | Voice-over                                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:06 | Pull down quick settings. Turn on airplane mode. Wi-Fi and data are off.                                                                                                   | "This is Pinsan AI. Airplane mode is on. No Wi-Fi, no data."                                                                  |
| 0:06–0:14 | Open the app. Pinsan walks around the island. Zoom in on the "Offline · private" badge.                                                                                    | "Pinsan is a private assistant for notes, tasks and reminders. Its AI runs on this phone."                                    |
| 0:14–0:30 | Notes tab, tap the mic. Say: "Groceries for Saturday, list eggs, rice and coffee." The live transcript appears. Stop. The draft shows a title and bullets. Save.           | "I talk. Whisper turns my voice into text on the phone, and a small language model tidies it into a note. It keeps my words." |
| 0:30–0:44 | Assistant tab. Type "Remind me in 1 minute to call Ana." The Assistant confirms the time. Then tap the mic and ask "What tasks do I have today?" The answer is read aloud. | "The Assistant turns plain English into tasks and reminders. Code works out every date, so the time is right."                |
| 0:44–0:52 | Cut to the reminder notification on the lock screen.                                                                                                                       | "And the reminder arrives on time. Still in airplane mode."                                                                   |
| 0:52–1:00 | Back on Home with Pinsan. End card: "Pinsan AI · works offline · no account · your notes stay on your phone".                                                              | "Private, offline, no account. Pinsan AI."                                                                                    |

Swap-in shots, only if done:

- **Talk to Pinsan (if done):** replace 0:30–0:44 with: tap the mic on Home, Pinsan turns to
  listen, your words appear as you speak, Pinsan answers in a speech bubble, tap Save, Pinsan
  hops. Voice-over: "I just tell Pinsan. It works out the task and the time, and I confirm."
- **Smart Quick Add (if done):** "Pay electric bill tomorrow 5pm" becomes a task with a reminder.
  Voice-over: "One sentence becomes a task with a reminder."
- **Extract Tasks (if done):** on a note that mentions three to-dos, tap Extract Tasks, review the
  list, tap Save. Voice-over: "It finds the to-dos in my note. Nothing is saved until I say so."
- **Summarize (if done):** a long note becomes 3–5 bullet points. Voice-over: "Long notes become
  a short summary, on the phone."

Post it on X or LinkedIn, tag Devin / Cognition and add #AppBuildersPH. Caption:

> Pinsan AI: a private notes, tasks and reminders assistant whose AI runs on the phone. Shot in
> airplane mode. Built during the AppBuilders PH Hackathon 2026. #AppBuildersPH

## Live pitch (5 minutes, mostly demo)

At most one slide: what runs where. Everything else is the phone, mirrored to the screen.

| Time      | Part          | What to do and say                                                                                                                                                                                                                                                                                                                                                    |
| --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Problem       | "Our users are students and young working Filipinos. Their mobile data drops out on the commute and costs money. Cloud assistants stop working without signal, need an account, and send your notes to a server. Pinsan AI runs its AI on the phone."                                                                                                                 |
| 0:30–0:45 | Airplane mode | Turn on airplane mode where the judges can see it. Type "Remind me in 3 minutes to drink water" in the Assistant. It should fire near the end of the demo.                                                                                                                                                                                                            |
| 0:45–1:00 | Home          | Pinsan on the island. "This is Pinsan, built in code during the hackathon." If Talk to Pinsan is done, add: "Its mood shows what the AI is doing: listening, thinking, done."                                                                                                                                                                                         |
| 1:00–1:45 | Voice note    | Record a short voice note with a list in it. Show the live transcript, then the tidy draft. "Speech to text and the language model both ran on this phone. The app rejects a draft that adds a number or date I didn't say."                                                                                                                                          |
| 1:45–2:45 | Assistant     | A typed request the rules handle instantly, such as "Create a task to call the dentist". Then a free-form one for the AI, such as "I need to pick up the dry cleaning on Friday, put that on my list". Then one by voice, with the reply read aloud. "Rules first, AI for everything else, and I confirm before anything is deleted." Rehearse these exact sentences. |
| 2:45–3:30 | If done       | Talk to Pinsan on Home, Smart Quick Add, Extract Tasks or Summarize. Skip whatever didn't land. Otherwise show the task list grouped as Today and Upcoming.                                                                                                                                                                                                           |
| 3:30–3:45 | Reminder      | The "drink water" reminder fires. "Still in airplane mode."                                                                                                                                                                                                                                                                                                           |
| 3:45–4:30 | How it works  | One slide: LFM2.5 1.2B and Whisper base.en through React Native ExecuTorch. SQLite and local notifications. The only internet use is the one-time ~1.1 GB model download. The AI proposes, code checks and works out dates, the user confirms.                                                                                                                        |
| 4:30–5:00 | Close         | "Private, works with no signal, no per-request cost, no account. Next: Taglish, search, scan to text. Thank you."                                                                                                                                                                                                                                                     |

### Before going on stage

- The demo phone says **AI is ready** (models downloaded).
- Notifications are allowed, and "Alarms & reminders" is allowed for the app (Android 14+).
- Do Not Disturb is off, so the reminder shows. Volume is up for spoken replies.
- Seed data: two or three tasks for today and a note with a few to-dos in it.
- Restart the app to clear the Assistant chat.
- The app is open before you start. A development build loads its JavaScript from Metro at
  launch, so keep the phone on USB (`adb reverse tcp:8081 tcp:8081`), or install a release build
  that doesn't need Metro (`npx expo run:android --variant release`). Test whichever you choose.
- Mirror the phone over USB (for example with scrcpy), so the demo doesn't need the venue Wi-Fi.
  Test it on the venue display.
- The demo video is saved on the laptop as a file, not only on X.
- Rehearse twice with a timer.

### Backup plan

- **The AI is slow.** Say what is happening: "This is running on the phone itself." Then switch to
  requests the fixed rules answer without the model, even before the download:
  "Remind me in 10 minutes to stretch", "Create a task to call the dentist", "What tasks do I
  have today?", "What reminders do I have today?". These are the example chips in the Assistant.
- **The 3D scene stutters.** Set `MASCOT_3D = false` in `src/constants/config.ts` to show the 2D
  mascot. It's a code change: a development build needs a Metro reload, and a release build needs
  a rebuild. Decide during rehearsal, not on stage. The 2D mascot is a simple stand-in for now.
- **The app crashes.** Reopen it. Notes, tasks and reminders are saved on the phone.
- **Nothing works.** Play the demo video from the laptop and talk over it.

## Likely judge questions

**1. Why a 1.2B model?**
It has to download once over Wi-Fi or mobile data and run on a phone next to the 3D scene. With
speech, the whole download is about 1.1 GB. Its jobs are narrow: turn a sentence into a short list of actions, or
tidy a transcript. Code checks every output and works out dates, so a small model is enough.
LFM2.5 1.2B is made for on-device use and comes ready-made in React Native ExecuTorch. Speed on our
phone: [MEASURE ON DEMO PHONE].

**2. What happens if there's no download?**
Notes, tasks, reminders and the rule-based Assistant still work. Voice and free-form requests show
a "Set up AI" button. Nothing downloads until the user taps Download. The app checks free space
first, and a stopped download can be retried.

**3. How do you keep dates correct?**
The model never works out a date. It copies the user's time words, like "tomorrow at 5 pm", and
our code turns them into a time using the phone's clock. That code has unit tests with fixed
dates. A reminder date with no time means 9:00 AM. A time that already passed today makes the app
ask if you meant tomorrow. Repeating reminders are refused instead of saved wrong.

**4. How do you stop it from making things up?**
The model only proposes actions. Code checks each one against your real tasks and reminders, asks
when several match, and confirms deletes. Replies are written by code from what actually
happened, so it never claims something it didn't do. Voice-note drafts that add a number or date
you didn't say are retried once, then replaced by your exact words.

**5. Does anything leave the phone?**
Your notes, tasks, reminders and voice don't. There's no account, no server and no analytics of
our own. The only network use is the one-time model download from Hugging Face. During it, the
ExecuTorch library sends anonymous download statistics (model file name, country code, platform)
to Software Mansion; we haven't switched that off. Android's own Google backup can also include
app data if the user turned it on; we haven't disabled that either.

**6. What about battery and heat?**
We haven't measured it properly: [MEASURE ON DEMO PHONE]. What helps: the model loads only for a
task and is freed right after, only one model is in memory at a time, common requests skip the
model entirely, and the 3D scene stops drawing when you leave Home.

**7. Does it understand Taglish or Filipino?**
Not yet. It's English-only: Whisper base.en only knows English, and our rules are written in
English. The same library has multilingual Whisper models. We'd need to test them, and our rules
and prompts, on Taglish before we could claim it.

**8. Which phones can run it?**
The AI needs Android 13 or newer, and the app checks. It also needs about 1.1 GB of free storage.
We demo on [PLACEHOLDER: demo phone model]. We haven't tested low-memory phones. On older phones,
notes, tasks, reminders and the rule-based Assistant still work.

**9. What's new here?**
It's an assistant that acts, not just a chatbot: it turns plain speech into notes, tasks and
reminders, fully on the phone, with no account. Pinsan's moods (listening, thinking, done) are
there to show what the AI is doing, so a wait on a phone feels friendly instead of broken. (Say
the last part only if Talk to Pinsan is done; that's where the moods connect to the AI.)

**10. What did you build, and what did you reuse?**
We built the app during the hackathon, starting from Expo's blank template. We used open-source
libraries, pre-trained models and the Fredoka and Nunito fonts, all disclosed. Pinsan and the
island are built in code. The island map and character reference images were made with an AI
image model during the hackathon. We used Claude Code as an AI coding tool.
