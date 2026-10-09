# Pinsan AI: Feature Tracker

Status of every MVP feature. Tick `[x]` when an item is done, then update the
summary table.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

## Summary

| #   | Feature                  | Status         | Progress |
| --- | ------------------------ | -------------- | -------- |
| 0   | Foundation               | 🟨 In progress | 1/5      |
| 1   | Notes                    | ✅ Done        | 14/14    |
| 2   | Summarize (AI)           | ✅ Done        | 11/11    |
| 3   | Extract Tasks (AI)       | 🟨 In progress | 9/10     |
| 4   | Smart Quick Add (AI)     | 🟨 In progress | 12/14    |
| 5   | Tasks + Reminders        | 🟨 In progress | 3/14     |
| 6   | Assistant (text + voice) | 🟨 In progress | 7/12     |
| –   | Behavior across the app  | ⬜ Not started | 0/6      |

---

## 0. Foundation

Setup the features depend on.

- [x] Migrate from template `App.tsx` to Expo Router in `src/app`
- [ ] SQLite database for notes and tasks
- [ ] Local AI models wired into the app (React Native ExecuTorch: LFM2.5 1.2B
      text model, Whisper base.en speech model)
- [ ] Models download once on first launch (Wi-Fi notice, progress, retry);
      offline afterwards
- [ ] Local notifications set up (permission + scheduling)

## 1. Notes

Write and keep notes on the phone.

- [x] Create a note with an optional title and a body
- [x] Edit anytime; changes save automatically
- [x] Delete a note after a confirmation
- [x] Sorted by last edited, newest first
- [x] Stores creation time and last-edited time
- [x] Saved on the phone: works with no internet and no account
- [x] Edge: an empty note (no title and no body) is not saved
- [x] Edge: very long notes allowed; AI tools warn over ~1,500 words

**Voice notes**

- [x] Tap the mic, speak, and see a live transcript
- [x] AI drafts a title and body from the transcript; "list …" becomes bullet
      points
- [x] The draft opens in the editor unsaved; the user edits, then saves or
      discards
- [x] Rule: AI keeps the user's words and never adds facts
- [x] Edge: no speech captured → user told, nothing saved
- [x] Error: if the AI fails, the raw transcript becomes the body

## 2. Summarize (AI)

Turn a long note into a short summary.

- [x] Input: the text of one note
- [x] Output: 3–5 bullet points with the main points
- [x] Copy the summary
- [x] Insert the summary at the top of the note
- [x] Discard the summary
- [x] Runs on the local AI model, no internet
- [x] Rule: only uses information from the note, never adds facts
- [x] Rule: note under ~50 words is not summarized; user told it's already short
- [x] Rule: note over ~1,500 words shows a "may miss details" warning
- [x] Error: if the AI fails or times out, the user can retry
- [x] Error: the note is never changed unless the user inserts the summary

## 3. Extract Tasks (AI)

Find the to-dos in a note and turn them into tasks.

- [x] Input: the text of one note
- [x] Output: suggested tasks, each with a title and a due date/time if mentioned
- [x] Review screen: untick, edit or remove items, then save
- [x] Saved tasks go to the task list
- [x] Reminders scheduled for tasks with a due time
- [x] Rule: nothing is saved until the user confirms
- [x] Rule: AI finds tasks and titles only; code resolves dates ("tomorrow", "Friday", "next Monday")
- [x] Rule: task with no date in the note is saved without a due date
- [x] Rule: no tasks found → user is told, nothing created
- [ ] Test: "Call Ana tomorrow, finish slides by Friday, buy printer ink." → Call Ana (tomorrow), Finish slides (this Friday), Buy printer ink (no date)

## 4. Smart Quick Add (AI)

Create a task from one plain-English sentence.

- [x] Sentence → task with title, date, time and reminder (on, at due time)
- [ ] User can edit any field before saving
- [x] Code parses dates: today, tomorrow, weekday names, "next week", "Oct 15"
- [x] Code parses times: "5pm", "17:00", "in 2 hours"
- [x] AI only cleans up the title (removes date and time words)
- [x] Rule: no date → task with no due date
- [x] Rule: date but no time → reminder defaults to 9:00 AM that day
- [x] Rule: time already passed today → ask if the user meant tomorrow
- [ ] Rule: sentence doesn't look like a task → offer to save as a note
- [x] Test: "Pay electric bill tomorrow 5pm"
- [x] Test: "Meeting with Carlo Monday 10am"
- [x] Test: "Submit report Oct 15"
- [x] Test: "Buy groceries"
- [x] Test: "Call mom in 2 hours"

## 5. Tasks + Reminders

Manage to-dos and get alerted on time. Tasks and reminders are separate: a
reminder can stand alone or be set for a task, and it stays when that task is
done or deleted.

**Tasks**

- [ ] Create, edit and delete tasks (title, notes, priority, optional due date
      or time)
- [ ] Mark a task done or not done
- [x] Grouped as Overdue, Today, Upcoming, No date and Done
- [ ] Tasks can come from the Assistant, Quick Add, Extract Tasks, or manual
      entry
- [x] Rule: a date with no time is due all day, so the task is overdue only
      once that day ends

**Reminders**

- [ ] Create, edit, cancel and delete reminders; mark them done or dismissed
- [ ] Local notification fires at the set time, even if the app is closed
- [ ] Notification shows the title and time; tapping it opens that reminder
- [ ] A new time reschedules the notification; cancelling, finishing or
      deleting the reminder removes it
- [ ] A reminder can be set for a task; finishing or deleting the task keeps
      the reminder
- [ ] Asks for notification permission the first time a reminder is set; if
      notifications are off, the reminder is still saved and the app says it
      can't alert
- [ ] Past-due reminders stay listed until they're marked done or dismissed
- [ ] Works fully offline
- [x] Rule: a date with no time means 9:00 AM; a time that already passed
      today asks about tomorrow

Limits: on Android 14 and later, alerts can be late until "Alarms & reminders"
is allowed for the app in Settings. A force-stopped Android app gets no alerts
until it's opened again. iOS keeps at most 64 pending alerts, so the app
schedules the soonest and tops them up each time it opens.

## 6. Assistant (text + voice)

Manage tasks and reminders by typing or speaking in a chat.

- [ ] Chat screen with a text box, a send button and a mic button
- [ ] Voice: tap the mic, speak and see a live transcript; the request then
      runs exactly like typed text
- [ ] Replies to spoken requests are read aloud in the phone's own voice
- [x] Common wordings are understood instantly by fixed rules, even before
      the AI download
- [ ] Other wordings go to the on-device AI, which only proposes actions
- [x] Several requests in one message run in order: "Create a task to buy
      groceries, then remind me in 10 minutes to check my list"
- [x] "It" means the item just mentioned: "Remind me in 5 minutes to review it"
- [x] Asks which one when several items match, and asks when a reminder has
      no time
- [x] Asks before deleting
- [x] Says which parts worked and which didn't; never claims an action that
      didn't happen
- [x] Repeating requests ("every day at 8") are refused rather than saved as a
      one-time reminder
- [ ] Works offline; voice and free-form wording need the AI download

## Behavior across the app

- [ ] **Offline:** every feature works in airplane mode
- [ ] **Private:** no account, no cloud, all data in SQLite on the phone
- [ ] **Local AI:** voice notes, the Assistant, Summarize, Extract Tasks and Quick Add titles run on-device
- [ ] **Predictable:** AI writes text or suggests items; code handles dates; user confirms before saving. The Assistant acts on what the user asks for, but code still works out every date and item, and deletes are confirmed
- [ ] **Language:** English only
- [ ] **One-time AI download:** the AI models (~1 GB) download once on first launch; after that every AI feature works offline, and notes work even before the download

---

## After the MVP

Start these only once the MVP features above are ✅.

| Feature                 | Description                                                         | Status         |
| ----------------------- | ------------------------------------------------------------------- | -------------- |
| Search                  | Find notes and tasks by keyword                                     | ⬜ Not started |
| Rewrite                 | Make a note shorter, more formal, more casual, or fix grammar       | ⬜ Not started |
| Scan to text            | Photo of a document becomes an editable note                        | ⬜ Not started |
| Task lists & checklists | Group tasks, add sub-steps                                          | ⬜ Not started |
| Health log              | Blood pressure, blood sugar, weight, medicine taken; weekly summary | ⬜ Not started |
| Emergency               | Medical ID, call emergency or contacts by voice or tap, first aid   | ⬜ Not started |
| Flashcards              | Generate study cards from a note                                    | ⬜ Not started |
| Walking tracker         | Step count                                                          | ⬜ Not started |

### Emergency plan

The app starts the call; the user does the talking. "Emergency number" means
whatever number the user sets (911 is only an example).

**Calling**

- [ ] User sets the emergency number (a default is filled in and can be edited)
- [ ] Big "Call emergency" button on the Emergency screen
- [ ] Saved list of emergency contacts (name and number); tap one to call
- [ ] Voice: say "call emergency" or "call <contact name>" and the app starts
      the call
- [ ] Official emergency number (911, 112 …) on iOS and Android: opens the
      dialer with the number filled in; the user taps Call once
- [ ] Any other number on iOS: the system asks "Call …?"; the user taps Call
      once
- [ ] Any other number on Android: dials automatically after the countdown
      (needs the `CALL_PHONE` permission and a small local native module using
      `ACTION_CALL`)
- [ ] Rule: code matches the call phrase, not the AI model
- [ ] Rule: a 3–5 second countdown with Cancel runs before any automatic call
- [ ] Rule: voice only works while the app is open; the screen points users to
      "Hey Siri / Hey Google" and the phone's Emergency SOS for when the phone
      is locked
- [ ] Edge: phrase not understood or contact not found → show the Emergency
      screen with its buttons; never guess a number
- [ ] Edge: `CALL_PHONE` denied → open the dialer instead (one tap)

**Also in scope**

- [ ] Medical ID screen a responder can read from the phone
- [ ] First-aid steps, read aloud with `expo-speech`

**Why the app can't always call by itself**

- iOS always asks the user to confirm before an app starts a call, for any
  number.
- Android blocks regular apps from auto-dialing official emergency numbers;
  other numbers are allowed with `CALL_PHONE`.
- An app can't speak into a phone call, and automated calls to emergency lines
  are restricted (in the US, by the TCPA).
