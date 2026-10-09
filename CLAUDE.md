@AGENTS.md

# Project conventions

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript strict · npm (`package-lock.json`, so use `npx`).

## Folder structure

Route files go in `src/app`. Everything else goes in `src/` next to it. Config, `assets/` and `scripts/` stay at the repo root.

```
src/
  app/                 # Expo Router routes and layouts only
  components/
    ui/                # design-system primitives: button, text, card, input
    common/            # shared composites built from ui/
  features/<feature>/  # one domain: auth, feed, profile …
    components/
    hooks/
    api/
    types.ts
    index.ts           # public surface of the feature
  hooks/               # cross-feature hooks
  lib/                 # integrations: api client, supabase, analytics
  store/               # global client state
  types/               # shared types
  constants/           # theme tokens, config values
  utils/               # pure helpers
assets/  scripts/  app.json  eas.json  package.json  tsconfig.json
```

- Route files stay thin. They read params, then render feature components.
- Other code imports a feature only through its `index.ts`.
- Small features start out in `components/` and `hooks/`. Move one to `features/` once it has its own screens, logic and API calls.
- The app still uses the template entry (`App.tsx`, `index.ts`). To migrate it to `src/app`, use the `expo-project-structure` skill.

## Naming

- **Files and folders are kebab-case**: `user-card.tsx`, `use-auth.ts`, `format-date.ts`, `format-date.test.ts`, `edit-profile.tsx`.
- Expo Router's reserved names keep their required syntax: `_layout.tsx`, `index.tsx`, `+not-found.tsx`, `(tabs)/`, `[id].tsx`.
- Platform variants add a suffix: `button.ios.tsx`, `button.android.tsx`, `button.web.tsx`.
- Symbols: components and types use `PascalCase`, hooks use `useCamelCase`, other values use `camelCase`, and module-level constants use `SCREAMING_SNAKE_CASE`.
- Use named exports: `user-card.tsx` → `export function UserCard`. The only `export default` is the screen or layout component in each `src/app` route file, because Expo Router requires it.
- Tests sit next to their source file as `<name>.test.ts(x)`.

## Imports

Import across folders with `@/` (for example `@/features/auth`, `@/components/ui/button`). Use relative imports only within the same folder. When `src/` is adopted, add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json`.

## Done

A task is done when `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm test` all pass.

## Skills

- `expo-project-structure`: placing, naming or moving a file, creating a feature, migrating to `src/app`
- `expo-router-navigation`: routes, layouts, tabs, modals, params, auth-gated screens
- `react-native-components`: building UI components, styling, theming, accessibility, images
- `react-native-performance`: lists, re-renders, animations, slow screens, bundle size
- `expo-data-and-state`: API calls, global state, persistence, secrets, env vars
- `expo-native-config`: adding native libraries, `app.json`, config plugins, dev builds, EAS
