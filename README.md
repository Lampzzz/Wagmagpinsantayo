# Pinsan AI

A private assistant for notes, tasks and reminders. Its AI runs on your phone, so it works with
no signal, needs no account, and your notes never leave the device.

Built during the AppBuilders PH Hackathon 2026 (theme: Local AI), Oct 9–10, 2026.

- **Demo video:** [PLACEHOLDER: demo video URL]
- **Team:** [PLACEHOLDER: official team name]: [PLACEHOLDER: member names]
- **Submission answers and full disclosures:** [docs/SUBMISSION.md](docs/SUBMISSION.md)

## Who it's for

Students and young working Filipinos with unreliable mobile data who want a private assistant.

Mobile data drops out on the commute and in class, and it costs money. Notes and plans are
personal. Pinsan AI keeps them on the phone and keeps working in airplane mode.

## What it does

You open the app and Pinsan, a 3D mascot, is walking around a small floating island. You type
or talk to it, it thinks on the phone, and it turns what you said into notes, tasks and
reminders.

Status as of the code freeze (10:00 AM, Oct 10, Manila time). "Done" means the feature is in the
code on this branch.

| Feature               | What it does                                                                                                                                                                                                                                                                                    | Status      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Pinsan's island       | Home screen. A 3D mascot built in code walks around a floating island and changes mood (idle, listening, thinking, done, oops). Drag, pinch or use + and − to move the camera. An "Offline · private" badge sits at the top.                                                                    | Done        |
| Notes                 | Write, edit and delete notes. Changes save automatically. Newest first.                                                                                                                                                                                                                         | Done        |
| Voice notes           | Speak and see a live transcript. The on-device AI drafts a title and a tidy body, and "list …" becomes bullet points. You edit, then save or discard. If the draft adds a number or date you never said, the app retries once, then falls back to your exact words.                             | Done        |
| Tasks                 | Create, edit, delete and tick off tasks, with priority and an optional due date or time. Grouped as Overdue, Today, Upcoming, No date and Done.                                                                                                                                                 | Done        |
| Reminders             | A local notification fires at the set time, even when the app is closed. Mark reminders done, dismiss, cancel or delete them. A reminder can belong to a task.                                                                                                                                  | Done        |
| Assistant (chat)      | Type or speak requests like "Remind me in 10 minutes to stretch" or "What tasks do I have today?". Common wordings are handled instantly by fixed rules. Other wordings go to the on-device AI. Asks when something is unclear, confirms before deleting, and replies aloud to spoken requests. | Done        |
| On-device AI setup    | One-time download of the AI models (about 1.1 GB), with progress, cancel, retry and a free-space check.                                                                                                                                                                                         | Done        |
| Summarize             | Turns a note into 3–5 bullet points. Copy it, insert it at the top of the note, or discard it.                                                                                                                                                                                                  | In progress |
| Extract Tasks         | Finds the to-dos in a note. You review, edit or untick them before anything is saved.                                                                                                                                                                                                           | In progress |
| Smart Quick Add       | One sentence, like "Pay electric bill tomorrow 5pm", becomes a task with a reminder. You confirm first.                                                                                                                                                                                         | In progress |
| Talk to Pinsan (Home) | Tap the mic on Home, see your words as you speak, and Pinsan answers in a speech bubble.                                                                                                                                                                                                        | In progress |
| Restyle               | Notes, Tasks, Reminders, Assistant and AI setup screens in Pinsan's look.                                                                                                                                                                                                                       | In progress |

Not built yet: search, rewrite, scan to text, health log, emergency screen, flashcards, walking
tracker.

### Rules that keep it predictable

- The AI only writes text or suggests items. Code works out every date and time.
- You confirm anything the AI made before it is saved. Deletes are always confirmed.
- The Assistant says which parts of a request worked and which didn't. It never claims an
  action that didn't happen.
- Repeating reminders ("every day at 8") are refused rather than saved as a one-time reminder.
- English only for now.

## What runs on the phone, and what needs internet

**On the phone, with no internet:**

| Part                    | How                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Text AI                 | LFM2.5 1.2B (Liquid AI) through React Native ExecuTorch                                         |
| Speech to text          | Whisper base.en (OpenAI), with the FSMN voice-activity model, through React Native ExecuTorch   |
| Spoken replies          | The phone's own text-to-speech voice (`expo-speech`)                                            |
| Dates and times         | Our own parser in `src/utils/parse-when.ts` and `src/utils/resolve-when.ts`, with tests. No AI. |
| Notes, tasks, reminders | SQLite on the phone (`expo-sqlite`)                                                             |
| Reminder alerts         | Local notifications scheduled on the phone (`expo-notifications`)                               |
| 3D scene and fonts      | Drawn on the phone (three.js, React Three Fiber, `expo-gl`). Fonts are bundled.                 |

Only one AI model is in memory at a time. Whisper is loaded while you record and released before
the text model runs.

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
- **Before the download**, notes, tasks, reminders and the rule-based Assistant already work.
  Voice and free-form requests need the download.

Spoken replies use the phone's own text-to-speech engine. Most phones include an offline English
voice; this is a phone setting, not part of the app.

For developers only: `npm install` and the first native build download packages, ExecuTorch's
prebuilt native libraries (from GitHub) and Android build tools.

## Requirements

- **Phone:** Android 13 or newer. We built and tested on Android only. iOS 17+ is set in the
  config but needs a Mac with Xcode, and we haven't tested it.
- **Storage:** about 1.1 GB free for the AI models. The app checks before it downloads.
- **A development build.** Expo Go can't run this app: `react-native-executorch` and other native
  modules aren't in Expo Go.
- **A real phone is best.** The 3D scene runs slowly on emulators, and their graphics support is
  unreliable.
- **Computer:** Node.js `^20.19.4`, `^22.13.0` or `^24.3.0` (we used 24.14.1), Android Studio
  with the Android SDK, and JDK 17.
- Tested on: [PLACEHOLDER: demo phone model, Android version and RAM]

## Setup

### 1. Get the code

The app is on the `development` branch.

```bash
git clone -b development https://github.com/Lampzzz/Wagmagpinsantayo.git
cd Wagmagpinsantayo
```

> **Windows: clone to a short path outside OneDrive**, for example `C:\pz`:
>
> ```powershell
> git clone -b development https://github.com/Lampzzz/Wagmagpinsantayo.git C:\pz
> cd C:\pz
> ```
>
> From a long path such as `C:\Users\…\OneDrive\Documents\GitHub\Wagmagpinsantayo` the native
> build fails with `ninja: error: mkdir(…): No such file or directory`. CMake 3.22.1's ninja
> can't handle paths over 260 characters, even with long paths enabled in Windows.

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

1. Open the app. Notes, tasks, reminders and typed Assistant requests work right away.
2. Open AI setup: tap **AI** at the top of the Notes tab, or **Set up AI** in the Assistant.
3. Tap **Download** (about 1.1 GB, Wi-Fi recommended). Keep the app open until it says
   **AI is ready**. If the download stops, tap **Try again**.

### 5. Try it in airplane mode

Turn on airplane mode, then:

- Notes tab: tap the mic and record a voice note.
- Assistant: type "Remind me in 2 minutes to stretch" and allow notifications when asked. Leave
  the app (don't force-stop it) and wait for the alert.
- Assistant: tap the mic and ask "What tasks do I have today?"

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
npm test              # Jest: date parsing, the Assistant, the AI-draft fact check, task and reminder grouping
```

## Project structure

```
src/
  app/              Expo Router routes: (tabs)/ Home, Notes, Assistant, Tasks, Reminders;
                    note, task and reminder editors; ai-setup; studio (development only)
  features/
    mascot/         Pinsan and the island in three.js, the 2D fallback, moods
    home/           Home screen
    notes/          Notes and voice notes
    tasks/          Tasks
    reminders/      Reminders and alerts
    assistant/      Chat: fixed rules, on-device AI commands, replies
    ai-setup/       One-time model download screen
  components/ui/    Buttons, chips, text fields and other building blocks
  lib/
    ai/             Model choice, download, text and speech model wrappers
    db/             SQLite and migrations
    notifications/  Local notifications
    audio/          Microphone stream and text-to-speech
  hooks/            Dictation, live queries, clock
  utils/            Date parsing, fact check for AI drafts, formatting (with tests)
  constants/        Theme tokens and config (MASCOT_3D)
assets/             App icons and the island ground texture
scripts/            bake-island.py: turns the island map into the ground texture and layout data
docs/               Features, front-end direction, planning, submission answers, pitch
```

## Tech stack

| Area          | What we used                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| App           | Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict), Expo Router, Expo development build (`expo-dev-client`)          |
| On-device AI  | React Native ExecuTorch 0.10.5 (`react-native-executorch`, Software Mansion), built on ExecuTorch, PyTorch's on-device runtime    |
| Data          | `expo-sqlite`, `expo-file-system`                                                                                                 |
| Alerts, voice | `expo-notifications`, `react-native-audio-api` (microphone), `expo-speech` (spoken replies)                                       |
| 3D            | three.js 0.186, React Three Fiber 9.8, `expo-gl`, `expo-linear-gradient`                                                          |
| UI            | Reanimated 4, React Native Gesture Handler, Keyboard Controller, Screens, Safe Area Context, `expo-symbols`, Zustand              |
| Fonts         | Fredoka and Nunito (SIL Open Font License) through `@expo-google-fonts`                                                           |
| Tooling       | Jest (`jest-expo`), ESLint (`eslint-config-expo`), Prettier, Python with Pillow and NumPy for `scripts/bake-island.py` (optional) |

## Known limits

- English only. Taglish and Filipino aren't supported yet.
- On Android 14 and later, reminders can arrive late until "Alarms & reminders" is allowed for the
  app in Settings. A force-stopped app gets no alerts until it's opened again.
- AI speed depends on the phone: [MEASURE ON DEMO PHONE].
- The installed app is still called "Wagmagpinsantayo" (the repository name).
- `MASCOT_3D` in `src/constants/config.ts` switches Home to a simple 2D mascot if the 3D scene is
  too slow on a phone.

## Disclosures

Full answers are in [docs/SUBMISSION.md](docs/SUBMISSION.md). In short:

- **Models:** LFM2.5 1.2B (Liquid AI), Whisper base.en (OpenAI) and FSMN voice-activity
  detection, as ExecuTorch exports from Software Mansion on Hugging Face. All run on the phone.
- **Frameworks:** listed under Tech stack.
- **APIs and cloud services:** no backend, no cloud AI and no accounts. Hugging Face hosts the
  model files for the one-time download, and `react-native-executorch` sends anonymous download
  statistics during it.
- **Existing code and assets:** the project started from Expo's blank TypeScript template, whose
  default icons are still in `assets/`. We use open-source libraries and pre-trained models as
  published, and the Fredoka and Nunito fonts (SIL OFL). All app code was written during the
  hackathon. Pinsan and the island are built in code from three.js shapes.
  The island map (`docs/design/island-map.png`), Pinsan's character sheets and the scene
  reference images were generated with an AI image model during the hackathon.
- **AI development tools:** Claude Code (Anthropic) was used to plan, write code and tests, and
  write these docs.
