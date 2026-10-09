---
name: expo-data-and-state
description: Data, state and persistence rules for this Expo app. Use when calling an API, fetching or caching server data, adding global state, persisting data on device, storing tokens or secrets, or reading environment variables.
---

# Data and state

## Where code goes

- `src/lib/<service>.ts`: one configured client per service (HTTP, Supabase, …). Only this file reads that service's base URL or keys.
- `src/features/<feature>/api/`: typed request functions that use the client from `lib/`. Name each one after what it returns (`getProfile`, `updateProfile`).
- `src/features/<feature>/hooks/`: hooks that wrap requests with loading and error state (`use-profile.ts`).
- `src/store/`: global **client** state only (session, UI preferences). Server data belongs in a server-cache library (for example TanStack Query), not in a global store.

Components call hooks. Hooks call API functions. API functions call the `lib/` client. Components never call `fetch` directly.

## Persistence

| Data                                         | Use                                         |
| -------------------------------------------- | ------------------------------------------- |
| Tokens, keys, credentials                    | `expo-secure-store`                         |
| Structured or relational data, offline cache | `expo-sqlite`                               |
| Small non-sensitive preferences              | `@react-native-async-storage/async-storage` |
| Files and downloads                          | `expo-file-system`                          |

Install with `npx expo install <pkg>`. Before using a storage API, check https://docs.expo.dev/versions/v57.0.0/.

## Environment variables

- Client code can read only `EXPO_PUBLIC_*` variables, through static dot access: `process.env.EXPO_PUBLIC_API_URL`. Bracket access and destructuring are not inlined.
- `EXPO_PUBLIC_*` values ship in plain text in the app bundle. Store only public values there (API URLs, publishable keys). Keep private keys on a server.
- Read env vars in one place (`src/constants/env.ts`) and export typed constants from there.
- `.env` can be committed. `.env*.local` is gitignored. For EAS environments, use `eas env:pull`.

## Error and loading states

Every async UI handles loading, error and empty states explicitly. Type API responses and validate them at the boundary, inside the `api/` function.
