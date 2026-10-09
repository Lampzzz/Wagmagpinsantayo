# Tonight's build plan

Code freeze: **10:00 AM, Oct 10** (Manila). Everything pushed by **9:30 AM**. Last updated just
after midnight, Oct 10.

Every Claude session working on this repo tonight reads this file first. The user is working
alone, and several Claude sessions build in parallel in the same folder (branch
`development`). So each workstream owns its files and nobody edits anyone else's.

Sessions: **session 2a** (`wagmagpinsantayo-2a`) coordinates, runs the app and the emulator,
and runs the background builders. **The 3D session** (`wagmagpinsantayo-2e`) owns Pinsan and
the island.

## Status board

| #   | Workstream                                                                         | Owner                   | Status                      |
| --- | ---------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| W1  | Summarize + Extract Tasks (FEATURES.md §2–3)                                       | Background builder, 2a  | Running                     |
| W2  | Restyle Notes, Tasks, Reminders, Assistant and AI setup in Pinsan's look           | Background builder, 2a  | Done: tokens and primitives |
| W2b | Apply the restyle inside Tasks, Reminders, Assistant and AI setup screens          | Background builder, 2a  | Running                     |
| W3  | Smart Quick Add through the Assistant's rules (FEATURES.md §4)                     | Background builder, 2a  | Done: 12/14, needs W6 Edit  |
| W4  | README, submission answers, pitch and video script                                 | Background builder, 2a  | Done: placeholders to fill  |
| W5  | 3D: camera focus on Pinsan, a head anchor for bubbles, keep the AI fast            | 3D session              | Waiting for the user's go   |
| W6  | Talk to Pinsan on Home: voice, live words on a note, Pinsan's reply bubble         | Session 2a              | Waiting for the user's spec |
| W7  | Advice bubble over Pinsan's head                                                   | Session 2a, after W6    | Waiting for the user's spec |
| W8  | Device test: a real AI call with the 3D scene running; measure speed for the pitch | Session 2a and the user | After W3 and W6             |
| W9  | Final checks, commit, push, demo video, submit once                                | The user and session 2a | Starts 8:00 AM              |

## File ownership

| Files                                                                                                                                | Owner                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/features/notes/**`, `src/app/extract-tasks.tsx`                                                                                 | W1                                                                                           |
| `src/constants/theme.ts`, `src/components/ui/**`, `src/components/common/**`, `src/app/(tabs)/_layout.tsx`                           | W2                                                                                           |
| `src/features/assistant/api/**`, `src/features/assistant/types.ts`                                                                   | W3                                                                                           |
| `README.md`, `docs/SUBMISSION.md`, `docs/PITCH.md`                                                                                   | W4                                                                                           |
| `src/features/mascot/**`                                                                                                             | W5                                                                                           |
| `src/features/tasks/components/**`, `src/features/reminders/components/**`, `src/features/ai-setup/components/**`                    | W2b (style only)                                                                             |
| `src/features/assistant/components/**`                                                                                               | W2b (style only) until it's done, then W6                                                    |
| `src/features/home/**`, `src/features/assistant/index.ts`, `src/features/assistant/hooks/**`                                         | W6, then W7                                                                                  |
| `src/app/_layout.tsx`                                                                                                                | Shared: W1 adds one `Stack.Screen`, W2 changes `screenOptions` only. Re-read before editing. |
| `docs/FEATURES.md`                                                                                                                   | Shared: each workstream ticks only its own section. Re-read before editing.                  |
| `docs/BUILD-PLAN.md`                                                                                                                 | Session 2a                                                                                   |
| Everything else                                                                                                                      | Ask session 2a or the user first                                                             |

## Rules for every session

- Edit only the files your workstream owns. If you need a change elsewhere, ask its owner or
  the user.
- Never run `git checkout`, `git switch`, `git stash`, `git reset`, `git restore`,
  `git clean`, `git add -A` or `git commit -a`. Other sessions' uncommitted work is in this
  folder. Commit only when the user asks, and `git add` only your own paths.
- Don't add or remove packages, and don't touch `android/` or `ios/`. A new native module
  forces a 4–16 minute rebuild of the development build, from a short path outside OneDrive
  (see docs/FRONTEND.md).
- Only session 2a runs the app, Metro and the emulator.
- Run the checks on your own files, because others are mid-edit: `npx tsc --noEmit` (fix
  every error in your files), `npx eslint <files>`, `npx prettier --write <files>`,
  `npx jest <your tests>`.
- Product rules: the AI only writes text or suggests items, code works out dates, and the
  user confirms before anything the AI made is saved. Specs are in docs/FEATURES.md, the look
  and feel in docs/FRONTEND.md.

## Pinsan interactions: draft spec, for the user to confirm

This is what the user described, written up so it can be corrected. Answer the questions in
chat with session 2a, or edit this section.

### 1. Talk to Pinsan (W5 + W6)

- Tap the mic on Home. The camera glides in to Pinsan's face. Pinsan stops walking, faces
  you and switches to `listening`.
- Your words appear live, as you speak, on a paper note beside Pinsan (a 2D overlay).
- Tap stop. Pinsan switches to `thinking`, and your words go through the Assistant,
  including W3's Quick Add rules.
- Pinsan's speech bubble answers, for example "Add “Pay electric bill” for tomorrow at
  5:00 PM? I'll remind you then." with Save and Cancel. Save makes Pinsan hop (`done`), and
  the note turns into the saved task.
- A few seconds later the camera glides back.
- **Questions:** Tap to start and tap to stop, or hold to talk? Should Pinsan read replies
  aloud? Keep a text box on Home for typing too?

### 2. Pinsan jotting it down (W5, optional)

- The 2D paper note is part of W6. A 3D notepad and pencil in Pinsan's hands while
  listening comes only if W5 has time left.
- **Question:** Is the 2D paper note enough for the demo?

### 3. Advice popping into Pinsan's head (W7)

- A thought bubble over Pinsan's head with one short line about your day, for example
  "3 tasks today. “Pay electric bill” is next, at 5 PM."
- Code picks the facts from your tasks and reminders. The on-device AI may rephrase the line
  in Pinsan's voice. If the AI's line drops or changes a fact, the plain line shows instead.
- **Questions:** When should it pop up: when the app opens, after you save something, when
  you tap Pinsan, or every few minutes? What kind of advice: what's next, nudges about
  overdue items, cheering when you finish something?

### Other features the user wants

- _Add them here._

## Prompts for other sessions

To use one, open a Claude session in this repo folder and paste the prompt. Each prompt tells
the session to read this file first. W1–W4 are already running; don't start them again.

### W5: for the 3D session

```text
You're on workstream W5 tonight. Read docs/BUILD-PLAN.md first: it has the shared rules and the file ownership. You own src/features/mascot/** only.

Add these to the mascot's public API (src/features/mascot/index.ts), in this order:
1. focusPinsan() and releaseFocus(). The camera glides to a close, slightly low front view of Pinsan's face (Pinsan already stops and faces the camera whenever the mood isn't 'idle'). releaseFocus() glides back to where the camera was before. Touch gestures still override both.
2. A head anchor for 2D speech and thought bubbles: the screen position in points, from the canvas's top-left, of a spot just above Pinsan's head, updated every frame, plus whether Pinsan is on screen. For example a Reanimated SharedValue<{ x: number; y: number; visible: boolean }> returned by usePinsanAnchor().
3. Keep the on-device AI fast. While the mood is 'thinking', the language model is running, so cut the scene's cost (a lower frame rate, skip non-essential animation). Check it with the FPS badge.
4. Only if time remains: a small notepad and pencil in Pinsan's hands with a writing motion while the mood is 'listening'.

When 1 and 2 are ready, message session wagmagpinsantayo-2a with the exact exports and how to call them. Run the scoped checks from the plan on your files.
```

### W6: Talk to Pinsan (only if the user moves it off session 2a)

```text
You're on workstream W6 tonight. Read docs/BUILD-PLAN.md first (shared rules, file ownership, and the "Talk to Pinsan" spec, which the user has confirmed), then CLAUDE.md, docs/FRONTEND.md (the Home layout, Pinsan's voice, the visual system) and docs/FEATURES.md §6. You own src/features/home/**, src/features/assistant/index.ts, src/features/assistant/components/** and src/features/assistant/hooks/**.

Build "Talk to Pinsan" on the Home screen (src/features/home/components/home-screen.tsx; remove the temporary mood button):
- A floating input at the bottom, "Tell Pinsan anything…", with a mic button and a send button. Typing and speaking both go through the existing Assistant: export useAssistant from src/features/assistant/index.ts and reuse it. Voice uses useDictation from src/hooks/use-dictation.ts, which gives a live transcript.
- Mic tap → setMood('listening') and focusPinsan() from @/features/mascot (built by W5; if it isn't exported yet, leave a TODO and skip the camera move). Show the live transcript on a paper-note card beside Pinsan. Stop → setMood('thinking') → send the transcript to the Assistant → setMood('done') or setMood('oops') → releaseFocus() a few seconds after the reply.
- Show the latest reply as Pinsan's speech bubble: white, rounded, pointing at Pinsan. Position it with usePinsanAnchor() from W5 if it exists, otherwise in the upper third. It shows the reply text, item cards (tap → /tasks/[id] or /reminders/[id]) and the question buttons (pick, confirm Save/Cancel, fill suggestions). Reuse the logic in src/features/assistant/components/message-bubble.tsx where you can. Tap outside to dismiss.
- If the AI isn't set up, keep the existing "Set up AI" button. The rule-based Assistant still works without the model.
- Bubbles enter with a Reanimated spring (scale 0.9 → 1 plus fade). Animate transform and opacity only. Text contrast at least 4.5:1, tap targets at least 44 pt.

Run the scoped checks from the plan. Don't run the app: session 2a does that.
```

### W7: Advice bubble (only if the user moves it off session 2a; start after W6 is done)

```text
You're on workstream W7 tonight. Start only after W6 is finished, because you share its files. Read docs/BUILD-PLAN.md first (rules, ownership, and the "Advice" spec, which the user has confirmed). You own src/features/home/**.

Build the advice thought bubble on Home:
- A pure function, with jest tests that use a fixed `now`, that picks today's facts from tasks and reminders (listTasks from @/features/tasks, listReminders from @/features/reminders): the next item due, how many are overdue, how many tasks are left today, or a "nothing due" line. It returns a plain sentence written by code.
- Optionally rephrase it in Pinsan's voice with generateText from @/lib/ai, using a short strict prompt: one friendly sentence that keeps every title and time exactly. Show the code's sentence instead if the model isn't ready, fails, takes longer than about 15 seconds, or drops or changes a title or time.
- Show it in a thought bubble (a cloud with two small circles below it) above Pinsan's head, positioned with usePinsanAnchor() from W5 if it exists. It fades in, and fades out after about 6 seconds. Show it at the moments the user chose in the spec, never while a speech bubble is open.

Run the scoped checks from the plan. Don't run the app: session 2a does that.
```
