# Submission answers

Ready-to-paste answers for every field of the AppBuilders PH Hackathon 2026 submission form, plus
the required "Why local?" answer.

Submit once, at cerebralvalley.ai/e/appbuildersph-hackathon-2026, before 10:00 AM on Oct 10. There
are no edits or resubmissions, so finish the checklist first.

## Before you submit

- [ ] Every `[PLACEHOLDER]` in this file, `README.md` and `docs/PITCH.md` is filled in or removed.
- [ ] Features that landed are flipped from "In progress" to "Done" in `README.md`, and the
      "(in progress)" notes below are removed for them.
- [ ] The final commit is pushed before 10:00 AM. Judges see the repository as of the deadline.
- [ ] The repository is public. Open it in a private browser window to check.
- [ ] The GitHub default branch is still `planning-stage`, which has no app code. Set the default
      branch to `development` (or merge `development` into it), so judges land on this README.
- [ ] The demo video is posted on X or LinkedIn, tags Devin / Cognition and includes
      #AppBuildersPH.
- [ ] Team name and member names match the official list at appbuildersph.com/hackathon.

## The project

### Project name

Pinsan AI

### Short description

Under 280 characters:

> Pinsan AI is a private assistant for notes, tasks and reminders, built for Filipino students and
> young workers with unreliable mobile data. Its AI runs on the phone, so it works in airplane
> mode, needs no account, and your notes never leave the device.

One-line variant:

> A private notes, tasks and reminders assistant whose AI runs on your phone, so it works with no
> signal and no account.

### Team members

- Team name: [PLACEHOLDER: official team name]
- [PLACEHOLDER: member 1 name, as on the official list]
- [PLACEHOLDER: member 2 name, as on the official list]

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
> - Text AI: LFM2.5 1.2B through React Native ExecuTorch. It drafts voice notes and turns free-form
>   Assistant requests into actions. It will also power Summarize and Extract Tasks (in progress).
> - Speech to text: Whisper base.en, with the FSMN voice-activity model, through React Native
>   ExecuTorch. Used for voice notes and voice requests.
> - Spoken replies: the phone's own text-to-speech voice.
> - Dates and times: our own parser, in code, with unit tests. The AI never works out a date.
> - Notes, tasks and reminders: SQLite on the phone. Reminder alerts are local notifications.
> - The 3D mascot and island are drawn on the phone. Fonts are bundled.
>
> Only one model is in memory at a time. Notes, tasks, reminders and the rule-based Assistant work
> even before the AI download. After the download, everything works in airplane mode.

### What requires internet

> Only the one-time download of the AI models, about 1.1 GB, from Hugging Face
> (huggingface.co/software-mansion). Nothing downloads until the user taps Download.
>
> During that download, react-native-executorch also sends anonymous download statistics: a
> download-counter request to Hugging Face, and an event to Software Mansion (ai.swmansion.com)
> with the model file name, the country code from the phone's language setting, the platform,
> whether it's an emulator and the library version. No user content is sent. We have not
> switched this off.
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
> All three are pre-trained and unmodified. They download once and run on the phone. Spoken
> replies use the phone's built-in text-to-speech, not a model of ours.

### Technologies and frameworks

> Expo SDK 57, React Native 0.86, React 19.2, TypeScript, Expo Router, Expo development build
> (expo-dev-client). On-device AI: React Native ExecuTorch 0.10.5 (Software Mansion), built on
> ExecuTorch. Data and device: expo-sqlite, expo-file-system, expo-notifications, expo-speech,
> react-native-audio-api. 3D: three.js, React Three Fiber, expo-gl, expo-linear-gradient. UI:
> Reanimated, React Native Gesture Handler, React Native Keyboard Controller, React Native
> Screens, Safe Area Context, expo-symbols, Zustand, expo-font with @expo-google-fonts (Fredoka,
> Nunito). Tooling: Jest (jest-expo), ESLint, Prettier, and Python with Pillow and NumPy for the
> island bake script.

### APIs and cloud services

> No cloud AI API, no backend, no user accounts and no analytics of our own.
>
> - Hugging Face: hosts the model files for the one-time download.
> - Software Mansion download statistics: built into react-native-executorch and on by default.
>   Sent only while models download. No user content.
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
>   [PLACEHOLDER: name of the AI image model or tool]. Our script `scripts/bake-island.py` turns
>   the map into the ground texture and layout data. Only the map is in the repository.
> - Design inspiration: the Tolan app's screens on Mobbin, for layout patterns only. Pinsan is an
>   original character, and no Tolan assets are used.
> - Planning notes (rules summary and idea lists) were started during the briefing, before
>   building began at 2:30 PM. They contain no code.
> - Agent instructions for AI coding tools (`AGENTS.md`, `CLAUDE.md`, `.claude/skills/`) were added
>   on Oct 9. They are development tooling, not app code.
> - [PLACEHOLDER: confirm nothing else existed before 2:30 PM on Oct 9, or list it here]

### AI development tools

> - Claude Code (Anthropic): used to plan, write and test code, and write the docs, including the
>   README, these answers and the pitch script. Several Claude Code sessions worked in parallel.
> - [PLACEHOLDER: the AI image model used for the island map, character sheets and reference
>   images]
> - [PLACEHOLDER: any other AI tools used (for example Devin, ChatGPT, GitHub Copilot), or delete
>   this line]

## Required answer

### Why does this product benefit from running AI locally?

> Pinsan AI handles personal things: your notes, your plans, your reminders and your voice.
> Running the AI on the phone changes four things for our users, students and young working
> Filipinos with unreliable mobile data:
>
> 1. **Private.** Notes, plans and voice recordings never leave the phone. There is no server to
>    send them to.
> 2. **Works with no signal.** The assistant works in airplane mode, on the commute and in class.
>    A cloud assistant stops working when the signal drops.
> 3. **No per-request cost.** No cloud AI bill for us, and no mobile data spent per request for
>    the user. The only download is the one-time model setup.
> 4. **No account.** Open the app and use it. Nothing to sign up for.
>
> The AI is the core of the app: it turns spoken and typed words into notes, tasks and reminders.
> Running it on the phone is what keeps that private, and working when there is no signal.
