# Couz AI

Built during the AppBuilders PH Hackathon 2026 (theme: Local AI), Oct 9–10, 2026.

- **Demo video:** [PLACEHOLDER: demo video URL]
- **Team:** Wagmagpinsantayo: Aljon Aivan Francisco, James Lampaza and Rovic Villaralvo
- **Submission answers and full disclosures:** [docs/SUBMISSION.md](docs/SUBMISSION.md)

## Problem

Students and young working Filipinos have a lot to keep track of: tasks, reminders, plans and
their days. But their mobile data is unreliable. It drops out on the commute and in class, and
it costs money. Cloud assistants stop working when the signal drops, need an account, and send
what you tell them to a server, even though plans, journals and voice recordings are personal.

## Project Name

**Couz AI.** "Couz" is Filipino texting slang for cousin, which is what _pinsan_ means in
Tagalog. The mascot you talk to is Pinsan.

## Brief Description

Couz AI is a private assistant for tasks, reminders and a journal, for Filipino students and
young workers with unreliable mobile data. You talk to Pinsan, a 3D mascot on a floating island.
His AI runs on the phone, so he works in airplane mode, needs no account and keeps your data on
the device.

## Tools

| Area          | What we used                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App           | Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict), Expo Router, Expo development build (`expo-dev-client`), `expo-build-properties` (Android minimum SDK), `expo-constants`                                              |
| On-device AI  | React Native ExecuTorch 0.10.5 (`react-native-executorch`, Software Mansion), built on ExecuTorch, PyTorch's on-device runtime, with its peer dependencies `react-native-blob-util` (model file downloads) and `react-native-worklets` |
| Data          | `expo-sqlite`, `expo-file-system`, `expo-asset` (bundled images such as the ground texture)                                                                                                                                            |
| Alerts, voice | `expo-notifications`, `react-native-audio-api` (microphone, alarm tone), `expo-speech` (spoken replies, off for now)                                                                                                                   |
| 3D            | three.js 0.186, React Three Fiber 9.8, `expo-gl`, `expo-linear-gradient`                                                                                                                                                               |
| UI            | Reanimated 4, React Native Gesture Handler, Keyboard Controller, Screens, Safe Area Context, `expo-symbols`, Zustand                                                                                                                   |
| Fonts         | Fredoka and Nunito (SIL Open Font License) through `@expo-google-fonts`                                                                                                                                                                |
| Tooling       | Jest (`jest-expo`), ESLint (`eslint-config-expo`), Prettier, Python with Pillow and NumPy for `scripts/bake-island.py` (optional)                                                                                                      |

AI tools used to build it:

- **Claude Code (Anthropic):** planned, wrote and tested the code, and wrote the docs. Several
  Claude Code sessions worked in parallel.
- **ChatGPT (OpenAI):** its image generation made the island map, the app icon, Pinsan's
  character sheets and the scene reference images. We also used it to answer questions.
- **Figma, with Claude working in it:** used to make the demo video.

## Assets

- **App icon:** a painted portrait of Pinsan, made with ChatGPT's image generation (OpenAI)
  during the hackathon (`assets/icon.png` and the `assets/android-icon-*.png` files).
- **Pinsan and the island:** built in code from three.js shapes. No downloaded 3D models.
- **Island ground:** the island map (`docs/design/island-map.png`) was made with ChatGPT's image
  generation. Our script `scripts/bake-island.py` turns it into the ground texture
  (`assets/scene/island-ground.jpg`) and layout data.
- **Reference images:** Pinsan's character sheets and the scene, prop and sky references were
  made with ChatGPT's image generation and used only as references. They aren't in the
  repository.
- **Fonts:** Fredoka and Nunito from Google Fonts (SIL Open Font License), bundled through
  `@expo-google-fonts`.
- **Sound:** the alarm screen's tone is made in code. Other alerts use the phone's own sounds.
- **From Expo's blank TypeScript template:** the splash image and web favicon in `assets/`.
- **Design inspiration:** layout patterns from companion apps on Mobbin. Pinsan is an original
  character, and no assets from other apps are used.

All app code was written during the hackathon, which started at 2:30 PM on Oct 9.

## Models

| Model                    | What it does in Couz AI                                                                                                                                 | Source                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| LFM2.5 1.2B (Liquid AI)  | Text model: turns free-form requests into actions that code checks, drafts voice notes, summarizes notes and finds the to-dos in a note (Extract Tasks) | `huggingface.co/software-mansion/react-native-executorch-lfm-2.5`         |
| Whisper base.en (OpenAI) | English speech to text, live while you talk                                                                                                             | `huggingface.co/software-mansion/react-native-executorch-whisper-base.en` |
| FSMN voice activity      | Finds speech in the live microphone stream, for Whisper                                                                                                 | `huggingface.co/software-mansion/react-native-executorch-fsmn-vad`        |

All three are pre-trained and unmodified ExecuTorch exports by Software Mansion, run with React
Native ExecuTorch. On Android the text model is the quantized XNNPACK export
(`lfm_2_5_1_2b_xnnpack_8da4w.pte`). They download once, about 1.1 GB, and then run on the phone.
Speech and text models take turns in memory. There is no cloud AI. Dates, times and the common
requests are handled by code with unit tests, not by a model.

## What it does

You open the app on Pinsan's island. Tap the mic and talk to him, or tap the keyboard button
and type. He turns what you say into tasks, reminders and journal entries, shows each one back
to you, and saves it only when you tap Save. Everything else is in the ☰ menu at the top right.

Status as of the code freeze (10:00 AM, Oct 10, Manila time):

- **Done:** the feature is in the code on this branch.

The Android emulator can't run the AI models, so the AI features were checked on a real phone,
a POCO X3 GT: talking to Pinsan by voice, voice notes, Summarize, Extract Tasks, free-form
requests and the AI setup download.

Checked on the Android emulator tonight: Quick Add → task and reminder; Save, Edit and Cancel in
Pinsan's bubble; the ☰ menu; Emergency → the dialer with 911 and no auto-dial; a journal entry
saved; a daily reminder that rang and rescheduled itself for the next day; Conversations →
History by day, and Clear; an alarm reminder that opened its alarm screen and rang, with Snooze
and Done.

| Feature                 | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                   | Status |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Pinsan's island (Home)  | Home is the island, full screen, with no tab bar. Pinsan, a 3D mascot built in code, walks around and shows his mood: listening, thinking, done (a hop) and oops (a worried tilt). Drag, pinch or use + and − to move the camera.                                                                                                                                                                                                              | Done   |
| ☰ menu                 | Opens Conversations, Journal, Tasks, Reminders, Emergency and AI setup.                                                                                                                                                                                                                                                                                                                                                                        | Done   |
| Talk to Pinsan by text  | The keyboard button on Home opens a text box. Pinsan answers in a speech bubble with buttons, such as Save, Edit and Cancel. A question stays until you answer or close it. A short finished reply fades on its own after about 6 seconds; lists and errors stay until you close them.                                                                                                                                                         | Done   |
| Talk to Pinsan by voice | Tap the mic to start and tap it again to stop. The camera glides in to Pinsan's face, your words appear live on a paper note, and he answers in his bubble. "Start over" on the note throws your words away, and he listens again. Replies show on screen and aren't read aloud. Needs the AI download.                                                                                                                                        | Done   |
| Smart Quick Add         | "Pay electric bill tomorrow 5pm" becomes a proposal with Save, Edit and Cancel. Save adds the task and a reminder at 5 PM. Edit opens the task editor filled in, with a "Remind me" switch. Code reads the sentence, so this works without the AI model.                                                                                                                                                                                       | Done   |
| Every-day reminders     | "Remind me to take my medicine every day at 8 AM", "every morning at 8" or "daily at 9pm". Pinsan shows it back before saving. The reminder editor has a "Repeat every day" switch. Done or Dismiss on a daily reminder only skips today.                                                                                                                                                                                                      | Done   |
| Alarm reminders         | A "Ring as alarm" switch in the reminder editor, or say "Set an alarm for 7 AM to take my medicine" or "Wake me up at 6 AM". On Android it rings at alarm volume, even on silent, and the alert has Snooze and Done. With the app open, a full-screen alarm screen rings for up to 5 minutes, with Done and Snooze 10 min.                                                                                                                     | Done   |
| Journal                 | ☰ → Journal: your notes grouped by the day you wrote them, a strip of days to jump between, search, "Write today's entry" and a mic for a voice entry. Saying or typing "write in my journal: …", "journal: …", "dear journal …" or "note: …" makes Pinsan ask "Save this to today's journal?"                                                                                                                                                | Done   |
| Notes                   | Write, edit and delete notes. Changes save automatically. Notes are the journal's entries.                                                                                                                                                                                                                                                                                                                                                     | Done   |
| Voice notes             | Speak and see a live transcript. The on-device AI drafts a title and a tidy body, and it's asked to turn "list …" into bullet points. You edit, then save or discard. If the draft adds a number or date you never said, the app retries once, then falls back to your exact words.                                                                                                                                                            | Done   |
| Summarize               | In the note editor: turns a note into up to 5 bullet points. Insert them at the top of the note, share them (the share sheet has Copy), or discard them. Notes under 50 words are already short and aren't summarized.                                                                                                                                                                                                                         | Done   |
| Extract Tasks           | In the note editor: finds the to-dos in a note. You review them, edit their titles or untick them before anything is saved. Code works out the dates, and tasks with a due time get a reminder.                                                                                                                                                                                                                                                | Done   |
| Tasks                   | Create, edit, delete and tick off tasks, with priority and an optional due date or time. Grouped as Overdue, Today, Upcoming, No date and Done.                                                                                                                                                                                                                                                                                                | Done   |
| Reminders               | A local notification fires at the set time, even when the app is closed. Mark reminders done, dismiss, cancel or delete them. A reminder can belong to a task.                                                                                                                                                                                                                                                                                 | Done   |
| Emergency               | ☰ → Emergency, or say or type "call emergency". The app asks first (Pinsan's bubble asks "Call emergency services (911)?"; the ☰ menu asks in a dialog), then the phone's dialer opens with 911 filled in, and you press call. It never dials by itself and needs no phone permission. A typed call for help goes through even while Pinsan is still answering, on Home or in Conversations, and the ☰ menu's Emergency row works any time. | Done   |
| Conversations           | ☰ → Conversations: the same assistant as a chat, with example requests, a text box and a mic.                                                                                                                                                                                                                                                                                                                                                 | Done   |
| Conversation history    | Everything you say to Pinsan, on Home or in Conversations, and the text of his answers, is kept on the phone. Conversations → History shows it by day. Clear deletes it.                                                                                                                                                                                                                                                                       | Done   |
| Free-form requests      | Wordings the fixed rules don't know go to the on-device AI. Code checks every action it suggests and turns down unknown actions and names you never said. Checked actions run right away and Pinsan says what he did; deletes ask first. Needs the AI download.                                                                                                                                                                                | Done   |
| On-device AI setup      | ☰ → AI setup: one-time download of the AI models (about 1.1 GB), with progress, cancel, retry and a free-space check.                                                                                                                                                                                                                                                                                                                         | Done   |

Not built yet: rewrite, scan to text, health log, emergency contacts and medical ID, flashcards,
walking tracker.

### How to use it

1. **Home.** Tap the mic, say what you need, then tap the mic again. Or tap the keyboard button
   and type. Pinsan answers in his bubble. Tap its buttons, or tap anywhere else to close it.
2. **Things to say:**
   - "Pay electric bill tomorrow 5pm": a task with a reminder, after you tap Save.
   - "Remind me in 10 minutes to stretch": a reminder.
   - "Remind me to take my medicine every day at 8 AM": an every-day reminder.
   - "Wake me up at 6 AM" or "Set an alarm for 8 AM to take my medicine": a reminder that rings
     like an alarm.
   - "Journal: we finished the slides today": an entry in today's journal.
   - "What tasks do I have today?" or "Find tasks about groceries": a list in the bubble.
   - "Call emergency": asks first, then opens the dialer with 911.
3. **☰ menu**, top right: Conversations (and its History), Journal, Tasks, Reminders, Emergency
   and AI setup.
4. **Notes.** In the journal, open an entry for the note editor, with Summarize and Extract tasks.

### Rules that keep it predictable

- The AI only writes text or suggests items. Code works out every date and time.
- Code checks every action the AI suggests before it runs, and turns down anything that names
  a task or reminder you don't have. Voice-note drafts, summaries and extracted tasks are saved
  only when you say so. Pinsan shows Quick Add tasks, journal entries and every-day reminders
  back for a yes. Deletes are always confirmed.
- Pinsan says which parts of a request worked and which didn't. He never claims an action that
  didn't happen.
- Code, never the AI, matches a call for help. The app asks before the dialer opens, and only
  you can press call.
- Every day is the only repeat. Other repeats ("every Monday", "every 2 hours") are turned down
  rather than saved as a one-time reminder.
- English only for now.

## What runs on the phone, and what needs internet

**On the phone, with no internet:**

| Part                                           | How                                                                                                                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text AI                                        | LFM2.5 1.2B (Liquid AI) through React Native ExecuTorch                                                                                                                                                                    |
| Speech to text                                 | Whisper base.en (OpenAI), with the FSMN voice-activity model, through React Native ExecuTorch                                                                                                                              |
| Dates and times                                | Our own parser in `src/utils/parse-when.ts` and `src/utils/resolve-when.ts`, with tests. No AI.                                                                                                                            |
| Quick Add, journal, every-day and help phrases | Fixed rules in `src/features/assistant/api/`, with tests. No AI.                                                                                                                                                           |
| Notes, tasks, reminders, conversation history  | SQLite on the phone (`expo-sqlite`)                                                                                                                                                                                        |
| Reminder alerts                                | Local notifications scheduled on the phone (`expo-notifications`), including the phone's own daily alert for every-day reminders. Alarm reminders use their own alarm channel, and the alarm screen's tone is made in code |
| Emergency call                                 | A `tel:` link opens the phone's dialer with 911 filled in. No phone permission, and nothing is dialed until you press call.                                                                                                |
| 3D scene and fonts                             | Drawn on the phone (three.js, React Three Fiber, `expo-gl`). Fonts are bundled.                                                                                                                                            |
| Spoken replies                                 | Off for now (`READ_REPLIES_ALOUD = false`). When on, the phone's own text-to-speech voice (`expo-speech`). Screen readers announce each reply.                                                                             |

The speech and text models take turns in memory: Whisper (with its small voice-activity model)
is loaded while you record and released before the text model runs.

**Needs internet: only the one-time model download (about 1.1 GB).**

- Nothing downloads until you tap **Download** on the AI setup screen.
- The model files come from Hugging Face (`huggingface.co/software-mansion/…`), fetched by
  `react-native-executorch`.
- During that download the library also sends anonymous download statistics: a download-counter
  request to Hugging Face, and a small event to Software Mansion (`ai.swmansion.com`) with the
  model file name, the country code from the phone's language setting, the platform, whether it
  is an emulator and the library version. No notes, tasks, voice or other personal content. We
  have not switched this off (`setTelemetryEnabled(false)` in `react-native-executorch`).
- After the download, everything works in airplane mode.
- **Before the download**, notes, the journal, tasks, reminders, Smart Quick Add, every-day
  reminders, the emergency call and typed requests the fixed rules know already work. Voice,
  free-form requests, Summarize and Extract Tasks need the download.

For developers only: `npm install` and the first native build download packages, ExecuTorch's
prebuilt native libraries (from GitHub) and Android build tools.

## Requirements

- **Phone:** Android 13 or newer for the on-device AI. We built and tested on Android only. iOS
  17+ is set in the config but needs a Mac with Xcode, and we haven't tested it.
- **Storage:** about 1.1 GB free for the AI models. The app checks before it downloads.
- **A development build.** Expo Go can't run this app: `react-native-executorch` and other native
  modules aren't in Expo Go.
- **A real phone for the AI.** The Android emulator can't run the AI models, its 3D scene is
  slow, and its graphics support is unreliable.
- **Computer:** Node.js `^20.19.4`, `^22.13.0` or `^24.3.0` (we used 24.14.1), Android Studio
  with the Android SDK, and JDK 17.
- Tested on: a POCO X3 GT.

## Setup

### 1. Get the code

The app is on the `development` branch.

```bash
git clone -b development https://github.com/Lampzzz/Wagmagpinsantayo.git
cd Wagmagpinsantayo
```

> **Windows: clone to a short path outside OneDrive**, for example `C:\src\pinsan`:
>
> ```powershell
> git clone -b development https://github.com/Lampzzz/Wagmagpinsantayo.git C:\src\pinsan
> cd C:\src\pinsan
> ```
>
> From a long path, such as a folder inside OneDrive, the native build fails with
> `ninja: error: mkdir(…): No such file or directory`. CMake 3.22.1's ninja can't handle paths
> over 260 characters, even with long paths enabled in Windows.

### 2. Install packages

```bash
npm install
```

This also runs `react-native-executorch`'s install step, which downloads its prebuilt native
libraries.

### 3. Build and install the app

Connect an Android phone with USB debugging on, then:

```bash
npx expo run:android
```

This builds the development build, installs it and starts Metro. The first build also installs
NDK 27.0 and 27.1, CMake 3.22.1 and Android platform 36 by itself. On our machine it took about
16 minutes the first time and about 4 after that.

Next time, skip the build. Start Metro and open the installed app:

```bash
npx expo start --dev-client
```

### 4. Set up the on-device AI (first launch)

1. Open the app. Typed requests on Home, the journal, tasks, reminders and the emergency call
   work right away.
2. Open AI setup: tap ☰ at the top right of Home, then **AI setup**. **Set up AI** buttons also
   appear in Pinsan's bubble when you tap the mic, in Conversations and in the note editor.
3. Tap **Download** (about 1.1 GB, Wi-Fi recommended). Keep the app open until it says
   **AI is ready**. If the download stops, tap **Try again**.

### 5. Try it in airplane mode

Turn on airplane mode, then on Home:

- Tap the mic, say "Pay electric bill tomorrow 5pm", and tap the mic again. Tap **Save** in
  Pinsan's bubble, then open ☰ → Tasks and ☰ → Reminders.
- Tap the keyboard button, type "Remind me in 2 minutes to stretch" and allow notifications when
  asked. Leave the app (don't force-stop it) and wait for the alert. On Android 14 and later,
  allow "Alarms & reminders" first, or the alert can be late (☰ → Reminders → **Open
  settings**).
- Tap the mic and say "Dear journal, today I tried Pinsan in airplane mode." Tap **Save**, then
  open ☰ → Journal.
- Open ☰ → Emergency to see the confirm, then tap **Cancel**.

A development build loads its JavaScript from Metro when it starts. Once the app is open, it
keeps running in airplane mode. Over a USB cable Metro stays reachable even in airplane mode
(`adb reverse tcp:8081 tcp:8081`).

<details>
<summary>Optional ways to build (not part of our tested path)</summary>

- **Standalone APK without Metro:** `npx expo run:android --variant release` builds a release
  version with the JavaScript inside it.
- **Cloud build with EAS** (needs an Expo account; links the project the first time):
  `npx eas-cli@latest build --profile development --platform android`, install the result, then
  `npx expo start --dev-client`.

</details>

## Checks

```bash
npm run lint          # ESLint (expo lint)
npm run typecheck     # tsc --noEmit
npm run format:check  # Prettier
npm test              # Jest: see below
```

The Jest tests cover date parsing, the Assistant's rules (Quick Add, journal, every-day and
emergency phrasing), its replies and conversation turns, the AI-draft fact check, Summarize and
Extract Tasks with fixed model replies, every-day repeat rules, task and reminder grouping, the
journal and history by day, and the emergency dialer.

## Project structure

```
src/
  app/              Expo Router routes: index (Home), conversations/ (chat and history),
                    journal/, tasks/, reminders/, notes/ (new, voice, editor), ai-setup,
                    extract-tasks (review sheet), studio (development only)
  features/
    home/           Home: talk to Pinsan with the mic or keyboard, the paper note, his bubble
    menu/           The ☰ button, the side menu and the emergency confirm
    mascot/         Pinsan and the island in three.js, the camera close-up, moods, 2D fallback
    assistant/      Fixed rules, Quick Add, on-device AI commands, replies, conversation history
    notes/          Notes, journal, voice notes, Summarize, Extract Tasks
    tasks/          Tasks
    reminders/      Reminders, every-day repeats, alarms and alerts
    ai-setup/       One-time model download screen
  components/       ui/ building blocks (buttons, chips, text fields); common/ date field
  lib/
    ai/             Model choice, download, text and speech model wrappers
    db/             SQLite and migrations
    notifications/  Local notifications
    audio/          Microphone stream and text-to-speech
    phone/          Opens the dialer with the emergency number
  hooks/            Dictation, live queries, clock
  utils/            Date parsing, fact check for AI drafts, formatting (with tests)
  constants/        Theme tokens and config (MASCOT_3D)
assets/             App icons and the island ground texture
scripts/            bake-island.py: turns the island map into the ground texture and layout data
docs/               Features, front-end direction, planning, submission answers, pitch
```

## Known limits

- English only. Taglish and Filipino aren't supported yet.
- Voice, free-form requests, Summarize and Extract Tasks need the one-time AI download.
- The Android emulator can't run the AI models, so those features can only be checked on a real
  phone.
- On Android 14 and later, reminders can arrive late until "Alarms & reminders" is allowed for
  the app in Settings. The Reminders screen shows a note with **Open settings**, which opens the
  app's settings page. A force-stopped app gets no alerts until it's opened again.
- Every day is the only repeat a reminder can have.
- A bare hour means the next one between 6 AM and 11 PM: "Wake me up at 6" said in the afternoon
  sets 6 PM. Say "6 AM" for a morning alarm.
- With the app closed, an alarm reminder plays the phone's alert sound once, not on a loop, and
  it can't take over the lock screen. The alarm screen rings only while the app is open, at media
  volume.
- The emergency number is 911, the Philippines' national hotline. There are no emergency
  contacts or medical ID yet, and the app must be open to ask for help.
- Pinsan doesn't read replies aloud. They show in his bubble, and screen readers announce them.
- AI speed depends on the phone. On our POCO X3 GT it's fast enough to demo, but we haven't
  timed it yet.
- `MASCOT_3D` in `src/constants/config.ts` switches Home to a simple 2D mascot if the 3D scene is
  too slow on a phone.

## Disclosures

Tools, assets and models are listed at the top of this README. Full answers are in
[docs/SUBMISSION.md](docs/SUBMISSION.md).

- **APIs and cloud services:** no backend, no cloud AI and no accounts. Hugging Face hosts the
  model files for the one-time download, and `react-native-executorch` sends anonymous download
  statistics during it. Android's own backup is left at its default (on), so if Google backup is
  on for the phone, Android can include the app's data in it.
