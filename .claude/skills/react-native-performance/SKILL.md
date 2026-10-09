---
name: react-native-performance
description: Performance rules for this React Native app. Use when rendering a list or feed, a screen feels slow or janky, adding animations or gestures, investigating re-renders, or adding a heavy dependency.
---

# React Native performance

Expo runs Hermes and the New Architecture, so the framework is rarely the bottleneck. Look for the cause in app code: extra renders, unvirtualized lists, or JS-thread animations.

## Lists

- Render collections longer than a screen with `FlatList`/`SectionList` (or `@shopify/flash-list`, installed with `npx expo install`). `ScrollView` + `.map()` is only for short, bounded content.
- Always pass a stable `keyExtractor` that returns a stable ID, not the array index.
- When rows have a fixed height, pass `getItemLayout`.
- Define `renderItem` outside JSX or with `useCallback`, and wrap the row component in `memo`.
- Paginate with `onEndReached` + `onEndReachedThreshold`. Don't load everything up front.

## Re-renders

- Check whether React Compiler is enabled (`experiments.reactCompiler` in `app.json`). If it is, leave memoization to the compiler. If not, use `memo`/`useCallback`/`useMemo` only where a profiler shows a cost, or for props passed to memoized children and list rows.
- Keep state as low in the tree as possible. Split contexts so a frequently changing value doesn't re-render unrelated consumers. With global stores, use selectors.
- Use the React DevTools profiler (press `j` in `npx expo start`) to find the cause before optimizing.

## Animation and gestures

- Use `react-native-reanimated` + `react-native-gesture-handler` so animations run on the UI thread. Animate `transform` and `opacity`, not layout properties.
- Don't drive animations with `setState`, and don't use the legacy `Animated` API without `useNativeDriver: true`.

## Startup and bundle

- Before adding a dependency, check its size and whether an Expo module already covers it.
- Use `import { x } from 'lib'`, not namespace imports from large libraries.
- Load fonts and splash-screen assets at startup. Fetch remote data after first paint.
- Release builds can be much faster than dev mode. Measure on a release build (`npx expo run:android --variant release`) before blaming the code.
