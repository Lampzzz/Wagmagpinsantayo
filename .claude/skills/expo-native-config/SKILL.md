---
name: expo-native-config
description: Native configuration and build rules for this Expo app. Use when installing a library, adding native capabilities or permissions, editing app.json or a config plugin, deciding between Expo Go and a development build, or running EAS build, submit or update.
---

# Native config and builds

## Installing packages

1. Prefer an Expo SDK module when one exists (https://docs.expo.dev/versions/v57.0.0/). Otherwise check https://reactnative.directory for New Architecture support.
2. Install with `npx expo install <pkg>` so the version matches SDK 57.
3. If the package has native code, Expo Go can't run it. Build a development build with `npx expo run:android|ios`, or `npx eas-cli@latest build --profile development`.
4. Run `npx expo-doctor` after dependency changes.

## Continuous Native Generation

The `ios/` and `android/` folders are generated output (`npx expo prebuild`) and are gitignored. All native configuration goes in:

- `app.json` (switch to `app.config.ts` only when values have to be computed): name, icons, permissions, `ios.infoPlist`, `android.permissions`, `plugins`.
- Config plugins: a library's own plugin, listed in `plugins` with its options. For custom native changes, write a local plugin in `plugins/<name>.js`.

Every permission needs a usage-description string that is specific to the user (for example "Wagmagpinsantayo uses your camera to scan receipts").

## EAS

- Use `npx eas-cli@latest` for every EAS command. Build profiles live in `eas.json`: `development`, `preview`, `production`.
- `eas update` ships JS and asset changes over the air. A native change (new native package, plugin, permission or SDK bump) needs a new build.
- Secrets for builds go in EAS environment variables, not in the repo.

## SDK upgrades

Follow https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough.md: `npx expo install expo@^<next>`, then `npx expo install --fix`, then `npx expo-doctor`. Read the changelog for breaking changes before editing code.
