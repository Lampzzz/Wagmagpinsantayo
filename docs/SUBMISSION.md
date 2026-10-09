# Submission answers

Ready-to-paste answers for every field of the AppBuilders PH Hackathon 2026 submission form, plus
the required "Why local?" answer.

Submit once, at cerebralvalley.ai/e/appbuildersph-hackathon-2026, before 10:00 AM on Oct 10. There
are no edits or resubmissions, so finish the checklist first.

## Before you submit

- [ ] Every `[PLACEHOLDER]` in this file, `README.md` and `docs/PITCH.md` is filled in or removed.
- [x] Every `[MEASURE ON DEMO PHONE]` in `README.md` and `docs/PITCH.md` is measured on the demo
      phone, or the line is removed.
- [x] The `[DECIDE]` note below is decided, and the answers here and in `README.md` match the
      choice.
- [x] After the demo-phone check, every feature that worked is changed from "Done, not yet tested
      on a phone" to "Done" in `README.md`, and its "(needs the demo phone)" line in
      `docs/FEATURES.md` is ticked.
- [ ] The final commit is pushed before 10:00 AM. Judges see the repository as of the deadline.
- [ ] GitHub's default branch is set to `development` (Settings → General → Default branch). It
      is still `planning-stage`, which has no app code, so judges would miss this README. Only
      the repository's owner can change it.
- [x] The repository is public.
- [ ] The demo phone is ready: the AI models are downloaded before the demo (☰ → AI setup says
      **AI is ready**), notifications are allowed, and "Alarms & reminders" is allowed for the app
      (Android 14 and later).
- [ ] The demo video is posted on X or LinkedIn, tags Devin / Cognition and includes
      #AppBuildersPH.
- [x] Team name and member names match the official list at appbuildersph.com/hackathon.

## The project

### Project name

Couz AI

### Short description

Under 280 characters (276):

> Couz AI is a private assistant for tasks, reminders and a journal, for Filipino students and
> young workers with unreliable mobile data. You talk to Pinsan, a 3D mascot. His AI runs on the
> phone, so he works in airplane mode, needs no account and keeps your data on the device.

One-line variant:

> Talk to Pinsan, a 3D mascot whose AI runs on your phone: tasks, reminders and a journal that
> work with no signal and no account.

### Team members

- Team name: Wagmagpinsantayo
- Aljon Aivan Francisco
- James Lampaza
- Rovic Villaralvo

### Public GitHub repository

https://github.com/Lampzzz/Wagmagpinsantayo/tree/development

(Use https://github.com/Lampzzz/Wagmagpinsantayo instead once `development` is the default branch.)

## The proof

### Demo video

[PLACEHOLDER: demo video URL]

### X / LinkedIn video URL

[PLACEHOLDER: X or LinkedIn post URL]

### What runs locally

> All of the AI and all of the data stay on the phone.
>
> - Talking to Pinsan: on Home you tap the mic or type. Speech to text is Whisper base.en, with
>   the FSMN voice-activity model, through React Native ExecuTorch. Pinsan answers in a speech
>   bubble on screen.
> - Text AI: LFM2.5 1.2B through React Native ExecuTorch. It drafts voice notes, summarizes notes,
>   finds the to-dos in a note (Extract Tasks), and turns free-form requests into proposed
>   actions.
> - Fixed rules in code, with unit tests, handle the common requests without the model: Smart
>   Quick Add ("Pay electric bill tomorrow 5pm" becomes a task and a reminder), every-day
>   reminders ("take my medicine every day at 8 AM"), journal entries ("write in my journal: …")
>   and calls for help ("call emergency").
> - Dates and times: our own parser, in code, with unit tests. The AI never works out a date.
> - Notes and the journal, tasks, reminders and the conversation history: SQLite on the phone.
>   Reminder alerts are local notifications, and every-day reminders use the phone's daily alert.
> - Emergency: the app asks first, then opens the phone's dialer with 911 filled in. It never
>   dials by itself and needs no phone permission.
> - The 3D mascot and island are drawn on the phone. Fonts are bundled.
>
> Only one model is in memory at a time. Notes, the journal, tasks, reminders, Quick Add,
> every-day reminders, the emergency call and typed requests the rules know work even before the
> AI download. After the download, everything works in airplane mode.

### What requires internet

> Only the one-time download of the AI models, about 1.1 GB, from Hugging Face
> (huggingface.co/software-mansion). Nothing downloads until the user taps Download.
>
> During that download, react-native-executorch also sends anonymous download statistics: a
> download-counter request to Hugging Face, and an event to Software Mansion (ai.swmansion.com)
> with the model file name, the country code from the phone's language setting, the platform,
> whether it's an emulator and the library version. No user content is sent. We left this on.
>
> No account, no backend and no cloud AI. After the download the app works in airplane mode.
> (Developers also need internet for npm install and the first native build.)

## The disclosures

### Models used

> - LFM2.5 1.2B (Liquid AI): text model. ExecuTorch export by Software Mansion
>   (huggingface.co/software-mansion/react-native-executorch-lfm-2.5), used as
>   `models.llm.LFM2_5_1_2B.DEFAULT`. On Android this is the quantized XNNPACK export
>   (`lfm_2_5_1_2b_xnnpack_8da4w.pte`).
> - Whisper base.en (OpenAI): English speech recognition. ExecuTorch export by Software Mansion
>   (huggingface.co/software-mansion/react-native-executorch-whisper-base.en), used as
>   `models.speechToText.WHISPER.EN.BASE.DEFAULT`.
> - FSMN voice activity detection: a small model the library downloads with Whisper and uses to
>   find speech in the live microphone stream
>   (huggingface.co/software-mansion/react-native-executorch-fsmn-vad).
>
> All three are pre-trained and unmodified. They download once and run on the phone. Pinsan's
> replies are shown on screen, not read aloud; the code to read them with the phone's built-in
> text-to-speech is there but switched off.

### Technologies and frameworks

> Expo SDK 57, React Native 0.86, React 19.2, TypeScript, Expo Router, Expo development build
> (expo-dev-client). On-device AI: React Native ExecuTorch 0.10.5 (Software Mansion), built on
> ExecuTorch. Data and device: expo-sqlite, expo-file-system, expo-notifications, expo-speech
> (installed, switched off for now), react-native-audio-api, and React Native's Linking for the
> dialer. 3D: three.js, React Three Fiber, expo-gl, expo-linear-gradient. UI: Reanimated, React
> Native Gesture Handler, React Native Keyboard Controller, React Native Screens, Safe Area
> Context, expo-symbols, Zustand, expo-font with @expo-google-fonts (Fredoka, Nunito). Tooling:
> Jest (jest-expo), ESLint, Prettier, and Python with Pillow and NumPy for the island bake
> script.

### APIs and cloud services

> No cloud AI API, no backend, no user accounts and no analytics of our own.
>
> - Hugging Face: hosts the model files for the one-time download.
> - Software Mansion download statistics: built into react-native-executorch and on by default.
>   Sent only while models download. No user content.
> - Android backup: left at Android's default (on). If the user has Google backup turned on,
>   Android can include the app's data (notes, tasks, reminders, conversation history) in it.
>   We haven't turned this off.
> - Development only: npm, GitHub (react-native-executorch downloads its prebuilt native libraries
>   during npm install) and the Android build tools' package repositories. eas.json is in the
>   repository, but we built locally and did not use EAS.

### Existing code and assets

> - The project started from Expo's blank TypeScript template (create-expo-app) at 5:00 PM on
>   Oct 9, after building began. The template's default app icons and splash image are still in
>   `assets/`.
> - Open-source libraries from npm, listed above, used as published.
> - Fonts: Fredoka and Nunito from Google Fonts (SIL Open Font License), bundled through
>   @expo-google-fonts.
> - Models: the three pre-trained models above.
> - Built during the hackathon: all app code. Pinsan the mascot and the island are built in code
>   from three.js shapes. No downloaded 3D models.
> - Generated with an AI image model during the hackathon: the island layout map
>   (`docs/design/island-map.png`), Pinsan's character sheets (turnaround, model sheet,
>   expressions, walk cycle, details) and the scene, prop and sky reference images. Image model:
>   ChatGPT's image generation (OpenAI). Our script `scripts/bake-island.py` turns
>   the map into the ground texture and layout data. Only the map is in the repository.
> - Design inspiration: layout patterns from companion apps on Mobbin. Pinsan is an original
>   character, and no assets from other apps are used.
> - Planning notes (rules summary and idea lists) were started during the briefing, before
>   building began at 2:30 PM. They contain no code.
> - Agent instructions for AI coding tools (`AGENTS.md`, `CLAUDE.md`, `.claude/skills/`) were added
>   on Oct 9. They are development tooling, not app code.
> - Nothing else existed before building began at 2:30 PM on Oct 9.

### AI development tools

> - Claude Code (Anthropic): used to plan, write and test code, and write the docs, including the
>   README, these answers and the pitch script. Several Claude Code sessions worked in parallel.
> - ChatGPT (OpenAI): its image generation made the island map, Pinsan's character sheets and
>   the scene, prop and sky reference images. We also used it to answer questions.
> - Figma, with Claude working in it through Figma's connector: used to make the demo video.

## Required answer

### Why does this product benefit from running AI locally?

> Couz AI handles personal things: your plans, your reminders, your journal, your voice, and
> everything you say to Pinsan. Running the AI on the phone changes four things for our users,
> students and young working Filipinos with unreliable mobile data:
>
> 1. **Private.** Journal entries, plans, voice recordings and the conversation history never
>    leave the phone. There is no server to send them to, and the history can be cleared from
>    the phone.
> 2. **Works with no signal.** Pinsan works in airplane mode, on the commute and in class. A
>    cloud assistant stops working when the signal drops.
> 3. **No per-request cost.** No cloud AI bill for us, and no mobile data spent per request for
>    the user. The only download is the one-time model setup.
> 4. **No account.** Open the app and talk to Pinsan. Nothing to sign up for.
>
> The AI is the core of the app: it turns spoken and typed words into tasks, reminders and
> journal entries. Running it on the phone is what keeps that private, and working when there is
> no signal.
