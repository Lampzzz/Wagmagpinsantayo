# Tonight's build plan

Code freeze: **10:00 AM, Oct 10** (Manila). Everything pushed by **9:30 AM**. Last updated about
1:15 AM, Oct 10.

Every Claude session working on this repo tonight reads this file first. The user is working
alone, and several Claude sessions build in parallel. Each workstream owns its files, and
nobody edits anyone else's.

## Where the work happens

The OneDrive folder (`…\OneDrive\Documents\GitHub\Wagmagpinsantayo`) is retired: Android
builds fail there and OneDrive syncs `node_modules`. Work in the `C:\dev` worktrees, which
all share one repository:

| Folder                  | Branch                 | Metro port | Use                                                     |
| ----------------------- | ---------------------- | ---------- | ------------------------------------------------------- |
| `C:\dev\pinsan`         | `development`          | 8081       | Integration, emulator and phone builds (session 2a)     |
| `C:\dev\pinsan-home`    | `feat/home-quick-add`  | 8083       | W6, then W7: Talk to Pinsan and the advice bubble       |
| `C:\dev\pinsan-restyle` | `feat/restyle-screens` | 8084       | Restyle is already done (W2). Free for a new workstream |

Sessions: **session 2a** (`wagmagpinsantayo-2a`) coordinates, merges into `development`, and
runs the app and the emulator. **The 3D session** (`wagmagpinsantayo-2e`) owns Pinsan and the
island.

## Status board

| #   | Workstream                                                                         | Owner                                  | Status                                       |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| W1  | Summarize + Extract Tasks (FEATURES.md §2–3)                                       | Builder, 2a                            | Merged. Test on a device (W8)                |
| W2  | Restyle in Pinsan's look: tokens, primitives, tab bar, and every screen            | Builders, 2a                           | Merged                                       |
| W3  | Smart Quick Add through the Assistant's rules (FEATURES.md §4)                     | Builder, 2a                            | Merged, 12/14. The Edit button comes with W6 |
| W4  | README, submission answers, pitch and video script                                 | Builder, 2a                            | Merged. The team fills the placeholders      |
| W5  | 3D: camera focus on Pinsan, a head anchor for bubbles, keep the AI fast            | 3D session                             | Waiting for the user's go                    |
| W6  | Talk to Pinsan on Home: voice, live words on a note, Pinsan's reply bubble         | Session in `C:\dev\pinsan-home`, or 2a | Waiting for the user's answers               |
| W7  | Advice bubble over Pinsan's head                                                   | Same as W6, after W6                   | Waiting for the user's answers               |
| W8  | Device test: a real AI call with the 3D scene running; measure speed for the pitch | Session 2a and the user                | Next                                         |
| W9  | Final checks, push, set GitHub's default branch, demo video, submit once           | The user and session 2a                | Starts 8:00 AM                               |

## File ownership

| Files                                                                                                                                | Owner                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `src/features/mascot/**`                                                                                                             | W5                               |
| `src/features/home/**`, `src/features/assistant/index.ts`, `src/features/assistant/components/**`, `src/features/assistant/hooks/**` | W6, then W7                      |
| `docs/BUILD-PLAN.md`                                                                                                                 | Session 2a                       |
| `docs/FEATURES.md`                                                                                                                   | Shared: tick only your section   |
| Everything else                                                                                                                      | Ask session 2a or the user first |

## Rules for every session

- Work in your own `C:\dev` worktree and branch. Before you start, run `git merge development`
  so you build on everyone's finished work.
- Edit only the files your workstream owns. If you need a change elsewhere, ask its owner or
  the user.
- Commit your finished work on your own branch with a clear message. `git add` only your own
  paths. Don't push; the user pushes. Tell session 2a when a branch is ready, and 2a merges it
  into `development`.
- Never run `git reset --hard`, `git clean`, `git stash` or `git checkout` on someone else's
  branch or files.
- Don't add or remove packages, and don't touch `android/`, `ios/` or `app.json`. A native
  change forces a 4–16 minute rebuild of the development build.
- One emulator: only session 2a drives it, unless the user says otherwise.
- Checks before you hand off: `npx tsc --noEmit`, `npx expo lint`, `npx prettier --check .`
  and `npx jest` all pass.
- Product rules: the AI only writes text or suggests items, code works out dates, and the user
  confirms before anything the AI made is saved. Specs are in docs/FEATURES.md, the look and
  feel in docs/FRONTEND.md.

## Pinsan interactions: draft spec, for the user to confirm

This is what the user described, written up so it can be corrected. Answer the questions in
chat with session 2a, or edit this section.

**Decided Oct 9:** keep the tab bar for the demo. Home gets the Quick Add input and Pinsan's
speech bubble, without the dock.

### 1. Talk to Pinsan (W5 + W6)

- Tap the mic on Home. The camera glides in to Pinsan's face. Pinsan stops walking, faces
  you and switches to `listening`.
- Your words appear live, as you speak, on a paper note beside Pinsan (a 2D overlay).
- Tap stop. Pinsan switches to `thinking`, and your words go through the Assistant,
  including W3's Quick Add rules.
- Pinsan's speech bubble answers, for example "Add “Pay electric bill” for tomorrow at
  5:00 PM? I'll remind you then." with Save, Edit and Cancel. Save makes Pinsan hop
  (`done`), and the note turns into the saved task.
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

To use one, open a Claude session in the folder named in the prompt and paste it. W1–W4 are
done and merged; don't start them again.

### W5: for the 3D session

```text
You're on workstream W5 tonight. Read docs/BUILD-PLAN.md first: it has the shared rules, where to work (C:\dev, not the OneDrive folder) and the file ownership. You own src/features/mascot/** only. Run `git merge development` before you start.

Add these to the mascot's public API (src/features/mascot/index.ts), in this order:
1. focusPinsan() and releaseFocus(). The camera glides to a close, slightly low front view of Pinsan's face (Pinsan already stops and faces the camera whenever the mood isn't 'idle'). releaseFocus() glides back to where the camera was before. Touch gestures still override both.
2. A head anchor for 2D speech and thought bubbles: the screen position in points, from the canvas's top-left, of a spot just above Pinsan's head, updated every frame, plus whether Pinsan is on screen. For example a Reanimated SharedValue<{ x: number; y: number; visible: boolean }> returned by usePinsanAnchor().
3. Keep the on-device AI fast. While the mood is 'thinking', the language model is running, so cut the scene's cost (a lower frame rate, skip non-essential animation). Check it with the FPS badge.
4. Only if time remains: a small notepad and pencil in Pinsan's hands with a writing motion while the mood is 'listening'.

When 1 and 2 are committed, message session wagmagpinsantayo-2a with the branch, the exact exports and how to call them.
```

### W6: Talk to Pinsan (open the session in C:\dev\pinsan-home)

```text
You're on workstream W6 tonight, in C:\dev\pinsan-home on branch feat/home-quick-add. Run `git merge development` first. Read docs/BUILD-PLAN.md (shared rules, ownership, and the "Talk to Pinsan" spec, which the user has confirmed), then CLAUDE.md, docs/FRONTEND.md (the Home layout, Pinsan's voice, the visual system) and docs/FEATURES.md §4 and §6. You own src/features/home/**, src/features/assistant/index.ts, src/features/assistant/components/** and src/features/assistant/hooks/**.

Build "Talk to Pinsan" on the Home screen (src/features/home/components/home-screen.tsx; remove the temporary mood button; keep the tab bar):
- A floating input at the bottom, "Tell Pinsan anything…", with a mic button and a send button. Typing and speaking both go through the existing Assistant: export useAssistant from src/features/assistant/index.ts and reuse it. Voice uses useDictation from src/hooks/use-dictation.ts, which gives a live transcript.
- Mic tap → setMood('listening') and focusPinsan() from @/features/mascot (built by W5; if it isn't exported yet, leave a TODO and skip the camera move). Show the live transcript on a paper-note card beside Pinsan. Stop → setMood('thinking') → send the transcript to the Assistant → setMood('done') or setMood('oops') → releaseFocus() a few seconds after the reply.
- Show the latest reply as Pinsan's speech bubble: white, rounded, pointing at Pinsan. Position it with usePinsanAnchor() from W5 if it exists, otherwise in the upper third. It shows the reply text, item cards (tap → /tasks/[id] or /reminders/[id]) and the question buttons (pick, confirm, fill suggestions), reusing src/features/assistant/components/message-bubble.tsx where you can. Tap outside to dismiss.
- Quick Add proposals arrive as question.kind 'confirm' with action.kind 'create-task' (action.task holds title, dueAt, dueHasTime; action.remindAt holds the reminder time), yesLabel 'Save' and noLabel 'Cancel'. Add an "Edit" chip on those that opens the task editor (/tasks/new) pre-filled from action.task, which finishes FEATURES.md §4's "user can edit any field before saving". Tick it when done.
- If the AI isn't set up, keep the existing "Set up AI" button. The rule-based Assistant still works without the model.
- Bubbles enter with a Reanimated spring (scale 0.9 → 1 plus fade). Animate transform and opacity only. Use the theme tokens (mango fills take ink text; primaryDark for accent text). Text contrast at least 4.5:1, tap targets at least 44 pt.

Commit on feat/home-quick-add when the checks pass, then message session wagmagpinsantayo-2a. Don't drive the emulator: session 2a does that.
```

### W7: Advice bubble (after W6, in C:\dev\pinsan-home)

```text
You're on workstream W7 tonight, in C:\dev\pinsan-home on branch feat/home-quick-add, after W6 is committed. Run `git merge development` first. Read docs/BUILD-PLAN.md (rules, ownership, and the "Advice" spec, which the user has confirmed). You own src/features/home/**.

Build the advice thought bubble on Home:
- A pure function, with jest tests that use a fixed `now`, that picks today's facts from tasks and reminders (listTasks from @/features/tasks, listReminders from @/features/reminders): the next item due, how many are overdue, how many tasks are left today, or a "nothing due" line. It returns a plain sentence written by code.
- Optionally rephrase it in Pinsan's voice with generateText from @/lib/ai, using a short strict prompt: one friendly sentence that keeps every title and time exactly. Show the code's sentence instead if the model isn't ready, fails, takes longer than about 15 seconds, or drops or changes a title or time.
- Show it in a thought bubble (a cloud with two small circles below it) above Pinsan's head, positioned with usePinsanAnchor() from W5 if it exists. It fades in, and fades out after about 6 seconds. Show it at the moments the user chose in the spec, never while a speech bubble is open.

Commit when the checks pass, then message session wagmagpinsantayo-2a. Don't drive the emulator: session 2a does that.
```
