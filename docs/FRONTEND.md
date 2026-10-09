# Front-end direction: Pinsan AI

Branch: `front-end`. Written Oct 9 for the UI lead and the developer. It covers how the app
looks and feels, how the 3D mascot works, and the order to build the screens. Scope is the
MVP loop from the plan: **write or type something → Pinsan turns it into tasks and reminders.**

## The idea in one line

Open the app and Pinsan, a 3D mascot, is standing on a small island. You tell it
something, it thinks on-device, and it answers in a speech bubble with the tasks it made.
Notes and Tasks are one tap away. The world is home base, so there is no tab bar.

## What we take from Tolan, and what we don't

References (Mobbin): [home world](https://mobbin.com/screens/ff79dcbf-b0bc-4576-a362-7fe01841cb38),
[floating card over world](https://mobbin.com/screens/9e064fe9-0cf0-4809-a4d8-cd8c359b4a80),
[chat over scene](https://mobbin.com/screens/5a4666e3-bc29-47e2-aa70-5cd14b804afe),
[tap to text / talk](https://mobbin.com/screens/fef8f596-cf97-475f-bb17-d3ca5fb435f7),
[input with character](https://mobbin.com/screens/cf502da6-521e-4c6c-b0a6-d5e2c10b19f1).

**Take the patterns:**

- The home screen is a full-bleed 3D scene. The character is the interface, not decoration.
- Chrome is minimal and floating: round icon buttons in the corners and a small dock at
  the bottom. No header bar, no tab bar.
- Replies come as white rounded speech bubbles over the scene, with the character visible.
- Cards float over the world (rounded, slightly translucent) and can be dismissed.
- Soft "clay" 3D: flat colors, soft light, a blurred blob shadow under the character, no
  hard shadows.
- Small celebrations when you finish something.
- Big rounded pill buttons and chunky, friendly type.

**Don't take the character or the brand.** The plan requires an original mascot. Avoid
everything that reads as a Tolan: tall pink body, frond or tentacle "hair", a scarf,
clothes, an alien or planet theme, the Tolan wordmark. We also skip their paywall,
affirmations and quiz content, which are not our product.

## Pinsan, the mascot

**Built from three.js primitives, not a downloaded model.** It is original by
construction, needs no asset pipeline, and every part can be animated directly.
`components/pinsan.tsx` follows the AI-generated character sheets made during the
hackathon:

- **Model sheet** (front, side, back, top-down with guide lines). The proportions come from
  its guide lines: 1.7 units tall, the chin at 0.74, the head about as wide as it is tall.
  - The head is a lathed onion shape that flows into a tapered curl hooking back and to
    Pinsan's left.
  - Cat ears stick out on the sides, with tall glossy eyes and an open "D" smile.
  - Cream shirt with puffed sleeves under sage overalls: buttoned straps, a belly pocket,
    shorts with rolled cuffs.
  - Mitten hands with thumbs and boot-like feet.
- **Detail sheet.** The painted look comes from its texture swatches:
  `scene/brush-strokes.ts` paints short diagonal dabs in a few shades per material into a
  small texture made in code.
- **Expression sheet:** the five moods below.
- **Walk sheet:** legs swing from the hips, arms swing against them, and the body dips and
  waddles.

`<Pinsan mood="…" />` shows a fixed expression regardless of the shared mood. Use it to make
the PNG snapshots for the 2D fallback.

The sky is an `expo-linear-gradient` behind the canvas, not a 3D sky. It could tint by time
of day: peach in the morning, blue during the day, indigo at night.

### Moods

Each mood maps to an app state. All animation is procedural, inside `useFrame`.

| Mood        | When                    | Face and pose                                                        |
| ----------- | ----------------------- | -------------------------------------------------------------------- |
| `idle`      | Default                 | Open smile, a blink every 3–5 s, slow bob; strolls around the island |
| `listening` | Quick Add input focused | Raised brows, small closed smile, leans in; stops and faces you      |
| `thinking`  | On-device LLM running   | One brow up, one down, wavy mouth, head turns and tilts              |
| `done`      | Task or note saved      | Closed `^ ^` eyes, big smile, a hop with squash and stretch          |
| `oops`      | AI or parsing failed    | Worried brows, small open frown, head tilt, a sweat drop             |

The plan names `idle`, `thinking` and `done`; build those first. `done` and `oops` are
reactions: the store sets the mood back to `idle` after 3 seconds.

### The seam: `features/mascot`

The rest of the app only sees this:

```ts
// src/features/mascot/index.ts
export { Mascot } from './components/mascot'; // renders 3D or the 2D fallback
export { useMascot } from './hooks/use-mascot'; // { mood, setMood }
export type { MascotMood } from './types';
```

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

- **`expo-gl` 57.0.2** (the WebGL context) is **included in Expo Go**. The UI lead can
  build the mascot in Expo Go now, without waiting for the dev build that
  `react-native-executorch` needs, as long as the screens use fake data and don't import
  the AI module.
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
   - Only Pinsan is lit live (Lambert, 3 lights). Change the light in `LIGHTS` so the baked
     light and the live light stay in step.
   - No shadow maps and no post-processing.
5. **Judge smoothness on a real phone.** The emulator tops out at 15–30 fps even for an
   empty scene. Development builds show an fps badge in the bottom-left corner.
6. All text, cards, inputs and buttons are React Native views layered over the canvas.
   Never render UI inside three.js.

## Screens and routes

These replace the five tabs in the plan. The world screen is the hub.

```
src/app/
  _layout.tsx          Stack, fonts, providers
  index.tsx            Home: world + Pinsan + Quick Add + dock
  notes/index.tsx      Notes list (search in the header)
  notes/[id].tsx       Note editor + AI tools menu (Summarize, Extract Tasks)
  tasks.tsx            Task list with tick-off
  extract-tasks.tsx    formSheet: review extracted tasks before saving (param: noteId)
```

Later, after the MVP: `emergency.tsx` and `health/`, both pushed from the menu button.

### Home

```
┌─────────────────────────────┐
│ ☰        ( Today ▾ )     🔒 │  floating round buttons; 🔒 = "Offline · private"
│  ┌───────────────────────┐  │
│  │ Next: Pay bill · 5 PM │  │  Today card (slides down from the pill)
│  └───────────────────────┘  │
│      ╭──────────────────╮   │
│      │ Got it! I'll     │   │  Pinsan's speech bubble = Quick Add confirm card
│      │ remind you at 5. │   │  [Save]  [Edit]
│      ╰───────┬──────────╯   │
│            (• ‿ •)          │  3D Pinsan on the island
│        ~~~~~~~~~~~~~~       │
│ ┌─────────────────────────┐ │
│ │ Tell Pinsan anything… ➤ │ │  Quick Add pill (typing sets `listening`)
│ └─────────────────────────┘ │
│     [ Notes ]   [ Tasks ]   │  floating dock
└─────────────────────────────┘
```

- **Quick Add confirm** appears as Pinsan's speech bubble, not a separate screen. It shows
  title, date and time, and reminder type, with Save and Edit. Save sets `done` and plays
  a haptic.
- **Today card**: the next reminder and today's task count. Tap to open Tasks.
- **Offline badge**: always visible. It's the pitch, so make it look good.

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

## Visual system (first draft; tune it)

These go in `src/constants/theme.ts`. The app stays light-only for the hackathon.

| Token      | Value                                                                  | Use                                                            |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `ink`      | `#2A2340`                                                              | Main text                                                      |
| `inkMuted` | `#6E6A80`                                                              | Secondary text                                                 |
| `surface`  | `#FFFFFF` (≈ 92% over the scene)                                       | Cards, bubbles                                                 |
| `mango`    | `#FFB627`                                                              | Primary buttons (use **ink** text on it; white fails contrast) |
| `coral`    | `#FF7A6B`                                                              | Accents, the mascot                                            |
| `leaf`     | `#6CC57C`                                                              | Done states, ticks                                             |
| `danger`   | `#E5484D`                                                              | Errors, Emergency later                                        |
| `sky*`     | dawn `#FFD9B8→#BFE3FF`, day `#8FD3FF→#E8F6FF`, night `#2B2A5C→#5B4B8A` | Home gradient                                                  |

- **Radii:** 12 / 20 / 28 / pill. **Spacing:** 4-pt scale. Tap targets ≥ 44 pt.
- **Type:** Fredoka for headings and buttons (rounded, chunky), Nunito for body. Both are
  OFL and bundled with `expo-font`, so they work offline.
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

**Tell the developer before step 0:** the plan's starter was "Expo Router tabs". This
direction uses a Stack with Home as the hub, so don't scaffold `(tabs)/`.

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
- Final mascot look (shape and color) and final app name.

## Disclosures to add

Frameworks: three.js, React Three Fiber, expo-gl, Reanimated, Zustand, React Native Gesture
Handler. Fonts: Fredoka and Nunito (SIL OFL). Assets: mascot and island built in code during
the hackathon. The island layout map, the character sheets (turnaround, model sheet,
expressions, walk cycle, details) and the scene, prop and sky reference images were
generated with an AI image model during the hackathon; the ground texture is derived from
the map.
