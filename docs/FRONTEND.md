# Front-end direction: Couz

Written Oct 9 on `front-end` for the UI lead and the developer, and merged into
`development` that night (see "Screens and routes" for what the merge changed). It covers how
the app looks and feels, how the 3D mascot works, and the order to build the screens. Scope is
the MVP loop from the plan: **write or type something → Pinsan turns it into tasks and
reminders.**

## The idea in one line

Open the app and Pinsan, a 3D mascot, is standing on a small island. You tell it
something, it thinks on-device, and it answers in a speech bubble with the tasks it made.
Everything else is in the ☰ menu. The world is home base, so there is no tab bar.

## Design patterns

The layout patterns come from companion apps on Mobbin:

- The home screen is a full-bleed 3D scene. The character is the interface, not decoration.
- Chrome is minimal and floating: round icon buttons in the corners and a small dock at
  the bottom. No header bar, no tab bar.
- Replies come as white rounded speech bubbles over the scene, with the character visible.
- Cards float over the world (rounded, slightly translucent) and can be dismissed.
- Soft "clay" 3D: flat colors, soft light, a blurred blob shadow under the character, no
  hard shadows.
- Small celebrations when you finish something.
- Big rounded pill buttons and chunky, friendly type.

**The character and the brand are our own.** The plan requires an original mascot, so
Pinsan takes no other app's character, look, wordmark or assets.

## Pinsan, the mascot

**Built from three.js primitives, not a downloaded model.** It is original by
construction, needs no asset pipeline, and every part can be animated directly. The shapes
are in `scene/pinsan-shape.ts`, measured off the AI-generated character sheets made during
the hackathon (front and side silhouettes match the model sheet to about 0.02 units).
`components/pinsan.tsx` puts them together, paints them and animates them.

- **Model sheet** (front, side, back, top-down with guide lines): 1.7 units tall, the
  head's widest point at 1.0.
  - The head is a droplet: a full, round lower half (the cheeks) rising as a cone whose tip
    leans over into a thick wave of a curl, hooked back and to Pinsan's left. Head and curl
    are one swept surface, so there is no seam between them.
  - Plump ears on the sides, tall glossy eyes and an open "D" smile.
  - Cream shirt with short puffed sleeves growing out of it, under sage overalls: a bib
    front and back, straps with four-hole wooden buttons, a U-shaped patch pocket, shorts
    with rolled cuffs.
  - Mitten hands with thumbs, and round boot feet with flat soles.
- **Detail sheet.** The painted look comes from its texture swatches, kept quiet:
  `scene/brush-strokes.ts` paints broad, soft-edged, low-contrast dabs into a small texture
  per material, made in code. Texture coordinates run around each part, so the strokes
  follow its form and stay about the same size everywhere.
- **Expression sheet:** the five moods below.
- **Walk sheet:** legs swing from the hips, arms swing against them, and the body dips and
  waddles.

So that it reads as rounded clay:

- Smooth surfaces only: lathes and sweeps with normals taken from their outlines, never
  faceted primitives, and enough segments that the outline stays round close up.
- Matte Lambert with wrap lighting (light reaches a little past the edge of each form, as on
  soft clay), patched into three's shader in `pinsan.tsx`.
- Contact shading baked into vertex colors where parts crowd each other: under the head,
  inside the sleeves and cuffs, where the ears meet the head.
- Soft contact shadows: a broad one under the body and one under each foot that follows
  the foot and fades as it lifts. On the bridge each foot stands on the deck right under it
  (`groundUnder` in `scene/walker.ts`), so neither floats nor sinks on the slope.

**Studio (development only).** `wagmagpinsantayo://studio?view=front&paint=0` (on Android:
`adb shell am start -a android.intent.action.VIEW -d "wagmagpinsantayo://studio?view=front&paint=0"`)
shows Pinsan alone on the character sheets' light grey, in the island's light. Views: `front`,
`turnaround`, `walk` (the walk sheet's six poses) and `moods`. `paint=0` hides the brush
strokes so shape and light can be judged on their own. Check model changes here against the
sheets before looking at them on the island.

`<Pinsan mood="…" still stride={…} />` shows a fixed expression, holds still, or holds a walk
pose, whatever the shared state. Use it for the PNG snapshots of the 2D fallback.

The sky is an `expo-linear-gradient` behind the canvas, not a 3D sky. It could tint by time
of day: peach in the morning, blue during the day, indigo at night.

### Moods

Each mood maps to an app state. All animation is procedural, inside `useFrame`.

| Mood        | When                  | Face and pose                                                        |
| ----------- | --------------------- | -------------------------------------------------------------------- |
| `idle`      | Default               | Open smile, a blink every 3–5 s, slow bob; strolls around the island |
| `listening` | Mic on, or typing     | Raised brows, small closed smile, leans in; stops and faces you      |
| `thinking`  | On-device LLM running | One brow up, one down, wavy mouth, head turns and tilts              |
| `done`      | Task or note saved    | Closed `^ ^` eyes, big smile, a hop with squash and stretch          |
| `oops`      | AI or parsing failed  | Worried brows, small open frown, head tilt, a sweat drop             |

The plan names `idle`, `thinking` and `done`; build those first. `done` and `oops` are
reactions: the store sets the mood back to `idle` after 3 seconds.

### The seam: `features/mascot`

The rest of the app only sees this:

```ts
// src/features/mascot/index.ts
export { Mascot } from './components/mascot'; // renders 3D or the 2D fallback
export { useMascot } from './hooks/use-mascot'; // { mood, setMood }
export { usePinsanAnchor } from './hooks/use-pinsan-anchor'; // where to hang bubbles
export type { PinsanAnchor } from './scene/anchor'; // { x, y, visible }
export { focusPinsan, releaseFocus } from './scene/orbit'; // close-up while you talk
export type { MascotMood } from './types';
```

- **Talking to Pinsan:** call `focusPinsan()` when the mic opens. The camera glides in, in
  about half a second, to a front view of his head and upper body (`FOCUS` in
  `scene/orbit.ts`). The anchor sits about 38% down the screen, leaving the space between the
  title bar and his curl for the bubble. Pinsan already turns to face the camera whenever his
  mood isn't `idle`.
  `releaseFocus()` glides back to the view from before. A drag, pinch, the zoom buttons or a
  double-tap also end the close-up, because touch always wins.
- **Bubbles:** `usePinsanAnchor()` is a Reanimated shared value holding the spot just above
  the tip of Pinsan's curl, in points from the 3D view's top-left (the screen, on a
  full-screen Home), plus whether it's on screen. It updates every frame while the scene
  renders. Read it in `useAnimatedStyle`, so bubbles follow Pinsan without React re-renders.
- **While the AI thinks** (mood `thinking`), the canvas draws at most 15 frames a second
  (`THINKING_FPS` in `mascot-3d.tsx`), so the phone's cores go to the model. Nothing to call.
- Keep mood in a tiny store (`zustand`). Inside `useFrame`, read it with
  `useMascotStore.getState()` so mood changes never re-render the canvas.
- Features set the mood around AI calls (`setMood('thinking')` → await →
  `setMood('done')`). The developer's AI functions don't need to know the mascot exists.
- `Mascot` picks between `mascot-3d.tsx` and `mascot-2d.tsx` with one constant,
  `MASCOT_3D` in `src/constants/config.ts`. **The 2D fallback is our insurance for the
  live demo.** It uses PNG snapshots of the 3D mascot, one per mood, animated with
  Reanimated (bob, scale, hop), so the 3D work carries over either way.

## 3D tech: verified for Expo SDK 57

Checked against the SDK 57 docs and npm on Oct 9:

- **`expo-gl` 57.0.2** (the WebGL context) is included in Expo Go, which is how the mascot
  was built. **Since the merge into `development` the app needs a development build:**
  `react-native-executorch`, SQLite, the audio API and the keyboard controller aren't in
  Expo Go. Build and install it with `npx expo run:android`, then start Metro with
  `npx expo start --dev-client`.
  - The first build installs NDK 27.0 and 27.1, CMake 3.22.1 and Android platform 36 by
    itself (about 16 minutes); later builds take about 4.
  - **On Windows, build from a short path outside OneDrive** (for example a clone in
    `C:\src\pinsan`). From a long path, such as a folder inside OneDrive, the native build
    fails with `ninja: error: mkdir(…): No such file or directory`: CMake 3.22.1's ninja
    can't handle paths over 260 characters, even with long paths enabled in Windows.
- **`@react-three/fiber` 9.8.1** supports React `>=19 <19.4` (we're on 19.2.3) and React
  Native `>=0.78`. Its other peers are `three`, `expo-gl`, `expo-asset` and
  `expo-file-system`. Import `Canvas` from `@react-three/fiber/native`.
- **`three` 0.186.1.** Add `@types/three` as a dev dependency.
- **Keep the `three` redirect in `metro.config.js`.** three 0.186's CommonJS entry
  (`build/three.cjs`) calls Node's `process.emitWarning` on load. Native bundles pick that
  entry, so the app crashed on the phone with "undefined is not a function" at the
  `@react-three/fiber/native` import. Web never reaches that file, so a web test won't catch it.
- Skip `@react-three/drei` unless we load a `.glb`. If we do, use `@react-three/drei/native`
  and push `glb`/`gltf` onto `config.resolver.assetExts` in `metro.config.js`. Extend the
  defaults; don't replace them as the R3F docs example does.
- Test on a physical phone. A web screenshot proves the scene looks right, not that native
  loads it. GL on emulators and simulators is unreliable, and remote JS debugging breaks
  `GLView`.

```bash
npx expo install three @react-three/fiber expo-gl expo-asset expo-file-system \
  react-native-reanimated react-native-worklets expo-linear-gradient expo-haptics \
  expo-font @expo-google-fonts/fredoka @expo-google-fonts/nunito zustand
npm i -D @types/three
```

### Performance rules for the scene

The phone runs an LLM at the same time, so the 3D must stay cheap.

1. **One canvas, on the home screen only.** Other screens are plain React Native views.
2. **Pause rendering when it can't be seen.** Set `frameloop="never"` when home loses focus
   (`useFocusEffect` from `expo-router`) or the app goes to the background (`AppState`).
3. **Test the mascot during a real LLM call early, on the demo phone.** If generation slows
   down or frames stutter, freeze the 3D during `thinking` and show the 2D "…" bubble.
4. **Keep pixels cheap.** The graphics chip's pixel work is the limit, not the triangle
   count.
   - The canvas draws at no more than 2 pixels per point and is stretched to fill the
     screen (`RENDER_SCALE` in `mascot-3d.tsx`). The native `Canvas` has no `dpr` prop, so
     this is done by drawing into a smaller view and scaling it up.
   - Edge smoothing (MSAA) is off: `gl={{ antialias: false }}`.
   - Anything that doesn't move is unlit. The island's sunlight is baked into its vertex
     colors (`scene/lighting.ts`), so its 52k triangles are a single unlit draw call.
   - Only Pinsan is lit live (Lambert with wrap lighting, 3 lights). Change the light in
     `LIGHTS` so the baked light and the live light stay in step.
   - No shadow maps and no post-processing. Pinsan's contact shadows are soft textured
     squares on the ground.
   - Pinsan is about 31k triangles; the whole scene is about 84k triangles in 37 draw calls.
     Its shapes and textures are built once at startup, about 0.2 s in a development build.
5. **Judge smoothness on a real phone.** The emulator tops out at 15–30 fps even for an
   empty scene. Development builds show an fps badge in the bottom-left corner.
6. All text, cards, inputs and buttons are React Native views layered over the canvas.
   Never render UI inside three.js.

## Screens and routes

**Decided Oct 10: no tab bar.** Home is Pinsan's island, full screen. A round ☰ button in its
top-right corner opens the side menu, and every other screen is a stack screen pushed from
there, so Back always returns to the island:

```
src/app/
  _layout.tsx              Stack: fonts, gesture and keyboard providers, reminder alerts
  index.tsx                Home: the island and Pinsan, no header, with the ☰ button
  conversations/index.tsx  Conversations: chat with Pinsan (on-device AI)
  conversations/history    Earlier conversations, by day
  journal/index.tsx        Journal: notes grouped by day, with search
  tasks/index.tsx          Task list
  reminders/index.tsx      Reminders
  notes/new, [id]          Note editor; notes/voice records a voice note (modal)
  tasks/new, [id]          Task editor
  reminders/new, [id]      Reminder editor
  ai-setup.tsx             Downloads the on-device models (modal)
  extract-tasks.tsx        Reviews the tasks found in a note (form sheet)
  studio.tsx               Development only: Pinsan on grey for checking the model (see above)
```

- **The side menu** (`src/features/menu`): ☰ opens a sheet that slides in from the right over
  a dim backdrop. It is React Native's `Modal` plus Reanimated, animating transform and opacity
  only. Tap the backdrop, tap ✕ or press Android back to close it. The rows are Conversations,
  Journal, Tasks, Reminders, Emergency and AI setup: an icon and a Fredoka label, at least
  64 pt tall. A row closes the sheet first, then pushes its screen.
- **Emergency** is the red row: `danger` text on `dangerSurface` (4.9:1), its icon on
  `dangerFill`. It asks "Call emergency services?" with Cancel and Call 911. Call 911 opens
  the phone's dialer with 911 filled in through a `tel:` link. It never dials by itself, and it
  needs no phone permission.
- The island stops rendering while another screen is on top (`useSceneActive`). Under the open
  menu it keeps running, dimmed.
- The root layout waits for the fonts before it renders the navigator, so the reminder
  alerts run from `<ReminderAlerts />` beside it. A notification tap that launches the app
  navigates at once, and Expo Router throws if that happens before a navigator is mounted.
  The tap pushes `reminders/[id]` over Home.

Later, after the MVP: `health/`, pushed from the menu.

### Home

```
┌─────────────────────────────┐
│                          ☰  │  ☰ = round white button, opens the side menu
│                             │
│      ╭──────────────────╮   │
│      │ Remind you at    │   │  Pinsan's reply bubble, over his head
│      │ 5 PM: Pay bill?  │   │  [Save]  [Cancel]
│      ╰───────┬──────────╯   │
│            (• ‿ •)          │  3D Pinsan; the camera glides in while you talk
│        ~~~~~~~~~~~~~~       │
│                             │
│   [⌨]    (  mic  )          │  keyboard button, mic
│         Tap to talk         │  hint under the mic
└─────────────────────────────┘
```

- **The top-right corner belongs to ☰.** It floats over the island (48 pt, white at 92% like
  the mic hint, ink icon), and Pinsan's bubble stays below it. Nothing else sits at the top:
  no title, no badge. There is no dock and no tab bar: the menu leads everywhere else.
- **Talk:** tap the mic to start and tap it again to stop. The camera glides in to Pinsan's
  face (`focusPinsan()`), and your words appear on a paper note as you speak. The keyboard
  button opens a text box instead, for a noisy room.
- **Pinsan's reply** is a speech bubble over his head, not a separate screen. When he
  proposes a task, a reminder, a note or a journal entry, the bubble shows it with Save and
  Cancel, and nothing is saved until you tap Save. Save sets `done` and plays a haptic. A
  call for help asks first, then opens the dialer.

### The side menu

```
┌─────────────────────────────┐
│░░░░░╭───────────────────────┤
│░░░░░│ Menu               ✕  │  ✕ lands where ☰ was
│░░░░░│ ( ) Conversations     │
│░░░░░│ ( ) Journal           │
│░░░░░│ ( ) Tasks             │  white rows: icon + Fredoka label
│░░░░░│ ( ) Reminders         │
│░░░░░│ (!) Emergency     911 │  red row: asks, then opens the dialer
│░░░░░│ ( ) AI setup          │
│░░░░░╰───────────────────────┤
└─────────────────────────────┘
  ░ = the island, dimmed: tap it to close
```

### Notes, Tasks, Extract Tasks

- Plain stack screens on a soft pastel background, with big rounded cards (radius 20–28)
  and no 3D.
- The note editor's AI tools are a row of pill buttons. While the AI works, show the 2D
  mascot (small) with the "…" bubble inline, so the mood carries over without a second
  canvas.
- **Extract Tasks** uses `presentation: 'formSheet'` (native, no extra library) with
  `sheetAllowedDetents: [0.5, 1]` and `sheetCornerRadius: 28`. Android allows at most 3
  detents and no native header in a sheet, so the title and Save button go in the sheet
  body. Each row has a checkbox and an editable title, and the button reads "Save 3 tasks".

## Visual system

The restyle is done. The tokens live in `src/constants/theme.ts`, and the shared primitives in
`src/components/ui/` and the Notes, Tasks, Reminders, Conversations and AI setup screens use them.
The app stays light-only for the hackathon.

| Token                | Value                                                                  | Use                                                                                   |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ink`                | `#2A2340`                                                              | Main text                                                                             |
| `inkMuted`           | `#6E6A80`                                                              | Secondary text                                                                        |
| `surfaceTranslucent` | `#FFFFFF` at 92%                                                       | Cards and bubbles over the scene                                                      |
| `mango` / `primary`  | `#FFB627`                                                              | Fills only: primary buttons, selected chips, the user's bubble. Ink text on it, 8.5:1 |
| `primaryDark`        | `#8A5A00`                                                              | Mango-family text, icons and spinners on light backgrounds: 5.5:1 on `background`     |
| `coral`              | `#FF7A6B`                                                              | Accents, the mascot                                                                   |
| `leaf`               | `#6CC57C`                                                              | Done states, ticks                                                                    |
| `surfaceMuted`       | `#F6EBDD`                                                              | Quiet fills, such as a neutral badge. Put `text` on it; `textMuted` is only 4.4:1     |
| `borderStrong`       | `#DCCAB4`                                                              | Outlines of chips, ghost buttons and fields                                           |
| `danger`             | `#C62828`                                                              | Error text, the Emergency row: 5.6:1 on white, 5.2:1 on `background`                  |
| `dangerFill`         | `#E5484D`                                                              | Red behind an icon only, such as the stop-recording button. Too light for text        |
| `dangerSurface`      | `#FDECEC`                                                              | Pale red behind `danger` text: 4.9:1                                                  |
| `sky*`               | dawn `#FFD9B8→#BFE3FF`, day `#8FD3FF→#E8F6FF`, night `#2B2A5C→#5B4B8A` | Home gradient                                                                         |

- **Mango is a fill, never text.** It is 1.8:1 on white, so it only goes behind ink text
  (`onPrimary`). For text, icons and spinners in the mango family on a light background, use
  `primaryDark`. Keep all text at 4.5:1 or more.
- **The developer's names, Pinsan's colors.** The plain tokens the feature screens use kept
  their names and now hold this palette: `background` is cream `#FFF5E8`, `surface` white,
  `text` ink, `textMuted` inkMuted, `primary` mango, `onPrimary` ink, `border` `#EFE2D2`.
  `warning` and `success` are darkened so they pass as text on their tinted surfaces.
- **Shadows** (`SHADOWS`): soft and warm, never hard. `card` for cards and bubbles, `soft` for
  small raised controls, `primary` for the glow under mango buttons. Spread one into a
  style: `...SHADOWS.card`.
- **Cards:** white, radius `RADII.lg` (20), `SHADOWS.card`. Use `<Card>` from
  `@/components/ui/card`, or spread the same styles when the card itself is a `Pressable`.
- **Pressed:** controls shrink to `PRESSED_SCALE` (0.96) with
  `transform: [{ scale: PRESSED_SCALE }]` instead of dimming.
- **Radii:** 12 / 20 / 28 / pill (`md`, `lg`, `xl`, `pill`; `sm` is 8, for small controls).
  **Spacing:** 4-pt scale. Tap targets ≥ 44 pt.
- **Type:** Fredoka (`FONTS.display`) for headings and buttons (rounded, chunky), Nunito
  (`FONTS.body`, `FONTS.bodyBold`) for body. Both are OFL and bundled with `expo-font`, so they
  work offline. Sizes: `caption` 13, `label` 14, `body` 16, `title` 20, `heading` 26,
  `display` 28. Import `Text` from `@/components/ui/text` rather than `react-native` to get
  Nunito, and give each `TextInput` `fontFamily: FONTS.body`. Pick a font family instead of
  setting `fontWeight`: Android falls back to the system font when it meets a weight on a font
  loaded at runtime.
- **Motion:** Reanimated only. Bubbles and cards enter with a spring (scale from 0.9 plus
  fade). Animate `transform` and `opacity` only.
- **Voice:** Pinsan speaks in the first person, briefly and warmly. "Got it — I'll remind
  you tomorrow at 5 PM." "Reading your note…" "Done! 3 tasks saved." On failure: "Hmm, I
  couldn't catch the time. Want to pick it?" Don't use jokes in error states.

## Build order (UI track)

Timed against the plan's timeline. Fake data until the developer's functions land.

| Step                                                                               | Time         | Done when                                         |
| ---------------------------------------------------------------------------------- | ------------ | ------------------------------------------------- |
| 0. Migrate to `src/app` + Expo Router, add the theme and fonts                     | 30 min       | App boots to an empty Home with fonts loaded      |
| 1. **3D spike: Pinsan idling on the island, on the demo phone**                    | **≤ 90 min** | Smooth idle and blink in Expo Go                  |
| 2. Home: sky, floating chrome, Quick Add pill, speech bubble, dock                 | 1.5 h        | Typing → fake `thinking` → bubble → Save → `done` |
| 3. Notes list and editor, Tasks list                                               | 1.5 h        | Navigate, edit and tick with fake data            |
| 4. Extract Tasks sheet, AI tools row                                               | 1 h          | Review flow works with fake output                |
| 5. Wire to real data and AI, connect moods to real calls                           | with dev     | Full loop works in airplane mode                  |
| 6. Snapshot mood PNGs → 2D fallback, then polish (haptics, confetti, empty states) | rest         | `MASCOT_3D = false` still demos well              |

**Go/no-go gate after step 1:** if Pinsan isn't idling smoothly on the demo phone within 90
minutes, set `MASCOT_3D = false`, draw the 2D mascot, and move on. Reliability is 20% of
the score; the 3D look is part of the 15% for demo quality.

## The island (scene v2)

The home island is built from the AI-generated top-down map in `docs/design/island-map.png`.

- **Bake step:** `python scripts/bake-island.py docs/design/island-map.png` (needs Pillow and
  NumPy) writes the ground texture `assets/scene/island-ground.jpg` and the layout data
  `src/features/mascot/scene/island-map.ts`. That data holds the outline, pond and stream
  edges, boulders, flower clumps, landmarks and a 64 × 64 grass/path/water grid. Run it again
  after changing the map, then `npm run format`.
- **Runtime:** `src/features/mascot/scene/build-*.ts` build cliffs, trees, rocks, props,
  flowers and grass from that data. Every piece gets per-face colors and all of them merge
  into one mesh, so the scene is one draw call (about 52k triangles), with the sunlight baked
  into its colors. The build takes about 0.6 s on the emulator, once per app launch. Its
  loops work on raw vertex arrays, because three's per-vertex helpers are slow on Hermes.
- **Camera:** drag to turn and tilt, pinch or use the + and − buttons to zoom (3.5–40 units),
  double-tap to return home. The buttons are there for anyone who can't pinch.
  The state lives in `scene/orbit.ts`. The camera trails Pinsan as it walks; zooming out
  shifts its focus from Pinsan to the whole island.
- **Walking:** `scene/walk-grid.ts` turns the terrain grid into a walkable map. Water, the rim,
  trees, rocks and props are blocked, and the bridge is the only way over the stream. A*
  finds paths across it, preferring the dirt paths to the grass. `scene/walker.ts` moves
  Pinsan:
  - It strolls between the landmarks on its own.
  - Tap the ground and it walks there.
  - Whenever its mood isn't `idle` (typing, the AI working), it stops and faces you.
- **Scale:** the island is about 16 units across, roughly 10 Pinsans.

## Open questions

- **"We have 3D / three.js":** do we already have a three.js scene or a `.glb` model? If
  it existed before Oct 9 2:30 PM, it must be listed under "Existing code and assets" in
  the submission, and the project still has to be mostly built during the hackathon.
- Which phone is the demo phone? The step-1 gate and the LLM-plus-3D test must run on it.

## Disclosures to add

Frameworks: three.js, React Three Fiber, expo-gl, Reanimated, Zustand, React Native Gesture
Handler. Fonts: Fredoka and Nunito (SIL OFL). Assets: mascot and island built in code during
the hackathon. The island layout map, the character sheets (turnaround, model sheet,
expressions, walk cycle, details) and the scene, prop and sky reference images were
generated with an AI image model during the hackathon; the ground texture is derived from
the map.
