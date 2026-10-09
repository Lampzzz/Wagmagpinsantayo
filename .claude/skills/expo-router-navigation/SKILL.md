---
name: expo-router-navigation
description: Expo Router patterns for this app. Use when adding a screen, route, layout, tab bar, modal, dynamic route or deep link, reading route params, navigating programmatically, or gating screens behind auth.
---

# Expo Router navigation

Before using an API you aren't sure about, check https://docs.expo.dev/router/introduction.md. Router APIs change between SDK releases.

## Route files

- Every file in `src/app/` is a route. Keep components, hooks and helpers out of that folder.
- Route files are thin: read params, call feature hooks, render feature components.
- Notation: `[id].tsx` is dynamic, `(group)/` organizes routes without changing the URL, `index.tsx` is the directory's default route, `_layout.tsx` is the navigator, and `+not-found.tsx` catches unmatched URLs. Avoid `/assets` as a route path, because Metro reserves it.
- Segment names are kebab-case: `edit-profile.tsx` → `/edit-profile`.

```tsx
// src/app/profile/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { ProfileScreen } from '@/features/profile';

export default function ProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileScreen userId={id} />;
}
```

## Layouts

- `_layout.tsx` exports a navigator (`Stack`, `Tabs`) by default. The root `src/app/_layout.tsx` is where app-wide providers go (theme, query client, safe area).
- Put tabs in a group: `src/app/(tabs)/_layout.tsx` uses `<Tabs>`, and each tab is a file inside `(tabs)/`.
- Set screen options in the layout with `<Stack.Screen name="…" options={…} />`, so every screen's options live in one place.

## Modals

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
</Stack>
```

## Auth-gated screens

Use `Stack.Protected` (or `Tabs.Protected`) with a boolean `guard`:

```tsx
<Stack>
  <Stack.Protected guard={isLoggedIn}>
    <Stack.Screen name="(tabs)" />
  </Stack.Protected>
  <Stack.Protected guard={!isLoggedIn}>
    <Stack.Screen name="sign-in" />
  </Stack.Protected>
</Stack>
```

A screen can belong to only one protected group. Guards run only on the client, so the backend must still check authorization.

## Navigating

- Declarative: `<Link href="/profile/123">` or `<Link href={{ pathname: '/profile/[id]', params: { id } }}>`.
- Imperative: `router.push`, `router.replace` (after login or logout, so the user can't go back), `router.back`.
- Typed routes (`experiments.typedRoutes`) make an invalid `href` a type error. Run `npx tsc --noEmit` after renaming routes.
- Route params are always strings. Parse and validate them before use.
