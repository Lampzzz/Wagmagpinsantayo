# Planning

Working notes for the planning stage of Wagmagpinsantayo.

## Baseline reference

- Video: https://www.youtube.com/watch?v=sTcnZ_tk8vA
- Summary: _to be filled in once the transcript is reviewed_

## Goals

_TBD_

## Scope

See [FEATURES.md](FEATURES.md) for the MVP feature list and progress.

## AI stack

Every AI feature runs on the phone through one library:
[React Native ExecuTorch](https://docs.swmansion.com/react-native-executorch/)
(`react-native-executorch`, Software Mansion).

| Need                        | Model                                  | Download |
| --------------------------- | -------------------------------------- | -------- |
| Voice → text                | Whisper base.en (`useSpeechToText`)    | ~234 MB  |
| Text AI (all text features) | LFM2.5 1.2B (`models.llm.LFM2_5_1_2B`) | ~758 MB  |
| Spoken replies              | The phone's own voice (`expo-speech`)  | None     |

- Models download once on first launch, then everything works offline. They
  are not bundled in the install, so the app stays small.
- The same library also covers later features: text embeddings for Search
  and OCR for Scan to text.
- Phones need iOS 17+ or Android 13+. Expo Go can't run it, so use a
  development build.
- Only one model is kept in memory at a time. Whisper is loaded while
  recording and released before the text model runs.
- The AI writes text or suggests items, and code resolves dates. The user
  confirms AI suggestions before they're saved.
- The Assistant tries fixed rules first, so common requests work instantly and
  before the download. Other wording goes to the text model, which only
  proposes actions as JSON. Code checks them, works out the dates and items,
  asks when something is unclear, and runs them. Replies are written by code
  from what actually happened.

## Open questions

_TBD_
