---
name: expo-project-structure
description: Folder and file-naming rules for this Expo app. Use when creating, placing, naming, moving or renaming a file, creating a feature module, or migrating App.tsx to src/app (Expo Router).
---

# Project structure

The folder tree and naming rules are in `CLAUDE.md`. This skill covers how to apply them.

## Placing a new file

Ask these questions in order and stop at the first "yes":

1. Is it a screen or a layout? → `src/app/…`. The file holds the default-exported screen component and nothing else.
2. Is it used by exactly one feature? → `src/features/<feature>/{components,hooks,api}/`
3. Is it a design-system primitive with no domain knowledge? → `src/components/ui/`
4. Is it a reusable composite that two or more features use? → `src/components/common/`
5. Is it a hook used by two or more features? → `src/hooks/`
6. Does it wrap an SDK or service client (HTTP, Supabase, analytics)? → `src/lib/`
7. Is it global client state? → `src/store/`
8. Is it a pure function? → `src/utils/`. Is it a type or constant? → `src/types/` or `src/constants/`

Promotion rule: code starts in the narrowest home. When a second feature needs it, move it up one level and update the imports. Don't copy it.

## Naming checklist

- Filename is kebab-case and matches the main export: `profile-card.tsx` → `export function ProfileCard`.
- A hook file is named after its hook: `use-session.ts` → `export function useSession`.
- Route files can use reserved syntax (`_layout`, `[id]`, `(group)`, `+not-found`). Every other segment is kebab-case.
- Platform variants share one base name: `map-view.ios.tsx` and `map-view.tsx` (fallback). Every importer uses `./map-view`.

✅ `src/features/profile/components/profile-card.tsx` → `export function ProfileCard`
❌ `src/components/ProfileCard.tsx` → `export default ProfileCard`

## Creating a feature

```
src/features/<name>/
  components/   hooks/   api/
  types.ts
  index.ts      # re-exports only what other code consumes
```

Only `index.ts` is public. Files inside the feature import each other with relative paths. Code outside the feature imports `@/features/<name>`.

## Migrating the template to Expo Router (`src/app`)

Before starting, read https://docs.expo.dev/router/installation.md and https://docs.expo.dev/router/reference/src-directory.md. Then:

1. `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar`
2. In `package.json`, set `"main": "expo-router/entry"`, then delete `index.ts`.
3. Move the contents of `App.tsx` into `src/app/index.tsx` (default export), add `src/app/_layout.tsx` with a `<Stack />`, then delete `App.tsx`.
4. In `app.json`, add `"scheme": "wagmagpinsantayo"` and `"experiments": { "typedRoutes": true }`.
5. In `tsconfig.json`, add `"paths": { "@/*": ["./src/*"] }` and `"include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]`.
6. Run `npx expo start --clear`, then lint and typecheck.

The migration is done when the app boots to `src/app/index.tsx` and lint and typecheck both pass.
