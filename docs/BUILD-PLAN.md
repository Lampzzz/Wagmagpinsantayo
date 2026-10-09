# Tonight's build plan

Code freeze: **10:00 AM, Oct 10** (Manila). Last updated 12:55 AM, Oct 10.

Every Claude session working on this repo tonight reads this file first. The user is asleep
until 5 AM and authorized overnight work. Nobody pushes or submits; that waits for the user.
Several Claude sessions build in parallel, each in its own worktree. Each workstream owns its
files, and nobody edits anyone else's.

## The user's decisions

- **Oct 10, ~12:40 AM, relayed by the 3D session:**
  - Remove the bottom tab bar. Home is Pinsan's island, full screen. A ☰ button at the top
    right opens a side sheet: Conversations, Journal, Tasks, Reminders, Emergency, AI setup.
  - A mic button on Home. Tapping it zooms the camera onto Pinsan's face, and his reply comes
    as a bubble with Save and Cancel. A keyboard button for typing, for the noisy demo hall.
  - "Call emergency" → Pinsan confirms → the phone's dialer opens with 911 filled in. No
    auto-dial, no new permission.
  - Journal: notes about life, grouped by day and retrievable by day. Saying "write in my
    journal: …" saves a note.
  - Stretch, if time allows: every-day reminders ("take my medicine every day at 8 AM") and
    conversation history saved by day.
- **Defaults picked by session 2a** (the user didn't say): tap to start and tap to stop the
  mic; Pinsan doesn't read replies aloud (`READ_REPLIES_ALOUD = false`).
- **Waiting for the user at 5 AM:** GitHub's default branch (it's `planning-stage`, with no app
  code) and making the repo public; turning off the AI library's download statistics; the
  advice bubble (W7) and a 3D notepad.

## Where the work happens

The OneDrive folder is retired. All work is in `C:\dev` worktrees of one repository:

| Folder                  | Branch                   | Workstream                 | Owner session                        |
| ----------------------- | ------------------------ | -------------------------- | ------------------------------------ |
| `C:\dev\pinsan`         | `development`            | Integration, emulator, APK | 2a merges; 2e builds the APK at 4:30 |
| `C:\dev\pinsan-3d`      | `feat/w5-pinsan-focus`   | W5                         | 2e                                   |
| `C:\dev\pinsan-home`    | `feat/home-quick-add`    | W6, then W13               | 2a's builder                         |
| `C:\dev\pinsan-restyle` | `feat/w10-nav`           | W10                        | 2a's builder                         |
| `C:\dev\pinsan-skills`  | `feat/assistant-skills`  | W11                        | 2e's builder                         |
| `C:\dev\pinsan-journal` | `feat/journal-and-daily` | W12                        | 2e's builder                         |

Sessions: **2a** (`wagmagpinsantayo-2a`) coordinates, merges every branch into `development`
and drives the emulator. **2e** (`wagmagpinsantayo-2e`) owns Pinsan and the island and runs
the W11 and W12 builders.

## Status board

| #   | Workstream                                                                           | Status                                       |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| W1  | Summarize + Extract Tasks                                                            | Merged. Test on a device                     |
| W2  | Restyle in Pinsan's look                                                             | Merged                                       |
| W3  | Smart Quick Add                                                                      | Merged. W6 adds the Edit button              |
| W4  | README, submission answers, pitch and video script                                   | Merged. The team fills the placeholders      |
| W5  | `focusPinsan()`, `releaseFocus()`, `usePinsanAnchor()`, lighter scene while thinking | Building, ready ~2 AM                        |
| W6  | Home: mic, live words on a paper note, Pinsan's reply bubble, keyboard input         | Building                                     |
| W7  | Advice bubble over Pinsan's head                                                     | On hold for the user                         |
| W8  | Device test: a real AI call with the 3D scene running                                | Emulator checks by 2a; speed needs the phone |
| W10 | No tab bar: a stack, Home full screen, ☰ side menu, Emergency → dialer              | Building                                     |
| W11 | Assistant skills: call emergency, "write in my journal", "every day"                 | Building                                     |
| W12 | Journal by day, every-day reminders (migration 3)                                    | Building                                     |
| W13 | Conversation history saved by day (migration after W12's)                            | After W6                                     |
| W9  | Final merge and checks, release APK (~4:30), then push, video, submit                | 2a and 2e, then the user at 5 AM             |

## File ownership

| Files                                                                                                                                | Owner                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `src/features/mascot/**`                                                                                                             | W5                               |
| `src/features/home/**`, `src/features/assistant/index.ts`, `src/features/assistant/components/**`, `src/features/assistant/hooks/**` | W6, then W13                     |
| `src/features/tasks/components/task-editor.tsx`, `src/app/tasks/new.tsx` (Edit prefill)                                              | W6                               |
| `src/app/**` (except `src/app/tasks/new.tsx`), new `src/components/common/menu-button.tsx` and `side-menu.tsx`                       | W10                              |
| `src/features/assistant/api/**`, `src/features/assistant/types.ts`, `src/lib/phone/**`                                               | W11                              |
| `src/features/notes/**`, `src/features/reminders/**`, `src/lib/notifications/**`, `src/lib/db/migrations.ts`                         | W12                              |
| `src/lib/db/migrations.ts` after W12 merges                                                                                          | W13 appends                      |
| `docs/BUILD-PLAN.md`                                                                                                                 | 2a                               |
| `docs/FEATURES.md`                                                                                                                   | Shared: tick only your own lines |
| Everything else                                                                                                                      | Ask 2a first                     |

## Integration seams (2a wires these at merge time)

- W6's `src/features/home/pinsan-stage.ts` → W5's `focusPinsan`, `releaseFocus`,
  `usePinsanAnchor` from `@/features/mascot`.
- W10's journal route → `JournalList` from `@/features/notes` (W12).
- W10's Emergency menu row → `callEmergency()` from `@/lib/phone` (W11).
- W11's "call emergency" command replies with a normal `confirm` question, so W6's bubble
  shows it on Home with no extra UI.
- Migrations: W12 adds migration 3 (`reminders.repeat`); W13 appends the next one after W12
  merges.

## Rules for every session

- Work only in your own worktree and branch, with absolute paths.
- Edit only the files your workstream owns. If you need a change elsewhere, ask its owner or
  2a.
- Commit your finished work on your own branch: `git add` only your paths, and end the message
  with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push. Then message 2a
  with the branch and commit; 2a merges into `development`.
- Never run `git reset --hard`, `git clean` or `git stash`, or check out another session's
  branch.
- No new packages. Don't touch `android/`, `ios/`, `app.json` or `package.json`: a native
  change forces a rebuild of the development build.
- Only 2a drives the emulator. 2e has a slot from 2:00 to 2:20 AM to check W5.
- Before committing, all of these pass in your worktree: `npx tsc --noEmit`, `npx expo lint`,
  `npx prettier --check .` and `npx jest`.
- Product rules: the AI only writes text or suggests items, code works out dates, and the user
  confirms before anything the AI made is saved. Specs are in docs/FEATURES.md, the look and
  feel in docs/FRONTEND.md.

## Schedule

| Time           | What                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Now – 2:00 AM  | W5, W6, W10, W11, W12 build. 2a checks the merged app on the emulator.                            |
| ~2:00 AM       | W5 ready; 2e checks it on the emulator (2:00–2:20). Merges start.                                 |
| 2:00 – 3:30 AM | Merge each branch, wire the seams, test every flow on the emulator. W13.                          |
| 3:30 – 4:15 AM | Fixes only. `development` final by 4:15.                                                          |
| ~4:30 AM       | 2e builds the release APK from `C:\dev\pinsan` and puts it on the local server.                   |
| 5:00 AM        | The user: install the APK on the phone, measure speed, push, GitHub settings, video, submit once. |
