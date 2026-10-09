# Couz: Feature Tracker

Status of every feature. Tick `[x]` when an item is done, then update the summary table.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

**(needs the demo phone):** built, but it depends on the on-device AI's output or speed, which
only a real phone can show. The Android emulator can't run the models. Tick the line after the
check on the demo phone.

## Summary

Status at the code freeze (10:00 AM, Oct 10).

| #   | Feature                  | Status  | Progress | Open lines             |
| --- | ------------------------ | ------- | -------- | ---------------------- |
| 0   | Foundation               | ✅ Done | 5/5      |                        |
| 1   | Notes                    | ✅ Done | 13/14    | 1 needs the demo phone |
| 2   | Summarize (AI)           | ✅ Done | 10/11    | 1 needs the demo phone |
| 3   | Extract Tasks (AI)       | ✅ Done | 9/10     | 1 needs the demo phone |
| 4   | Smart Quick Add          | ✅ Done | 13/14    | 1 rule not built       |
| 5   | Tasks + Reminders        | ✅ Done | 14/14    |                        |
| 6   | Assistant (text + voice) | ✅ Done | 13/14    | 1 needs the demo phone |
| 7   | Home: talk to Pinsan     | ✅ Done | 10/11    | 1 needs the demo phone |
| 8   | Journal                  | ✅ Done | 7/7      |                        |
| 9   | Every-day reminders      | ✅ Done | 7/7      |                        |
| 10  | Emergency call           | ✅ Done | 8/8      |                        |
| 11  | Conversation history     | ✅ Done | 4/4      |                        |
| –   | Behavior across the app  | ✅ Done | 6/6      |                        |

Checked on the Android emulator: Quick Add → task and reminder; Save, Edit and Cancel in
Pinsan's bubble; the ☰ menu; Emergency → the dialer with 911 and no auto-dial; a journal entry
saved; a daily reminder that rang and rescheduled itself for the next day; Conversations →
History by day, and Clear.

---

## 0. Foundation

Setup the features depend on.

- [x] Migrate from template `App.tsx` to Expo Router in `src/app`
- [x] SQLite database for notes, tasks, reminders and the conversation history (migrations 1–4)
- [x] Local AI models wired into the app (React Native ExecuTorch: LFM2.5 1.2B
      text model, Whisper base.en speech model)
- [x] Models download once, when the user taps Download on the AI setup screen
      (Wi-Fi notice, progress, cancel, retry, free-space check); offline afterwards
- [x] Local notifications set up (permission + scheduling)

## 1. Notes

Write and keep notes on the phone. The notes are the journal's entries (section 8).

- [x] Create a note with an optional title and a body
- [x] Edit anytime; changes save automatically
- [x] Delete a note after a confirmation
- [x] Listed in the Journal by the day they were written, newest first
- [x] Stores creation time and last-edited time
- [x] Saved on the phone: works with no internet and no account
- [x] Edge: an empty note (no title and no body) is not saved
- [x] Edge: very long notes allowed; AI tools warn over ~1,500 words

**Voice notes**

- [x] Tap the mic in the Journal, speak, and see a live transcript
- [ ] AI drafts a title and body from the transcript; "list …" becomes bullet
      points (needs the demo phone)
- [x] The draft opens in the editor unsaved; the user edits, then saves or
      discards
- [x] Rule: AI keeps the user's words and never adds facts: a draft that adds a
      number or date is retried once, then the transcript is used
- [x] Edge: no speech captured → user told, nothing saved
- [x] Error: if the AI fails, the raw transcript becomes the body

## 2. Summarize (AI)

Turn a long note into a short summary, from the note editor.

- [x] Input: the text of one note
- [ ] Output: 3–5 bullet points with the main points (needs the demo phone; code
      keeps 2–5 bullets)
- [x] Share the summary (the share sheet offers Copy)
- [x] Insert the summary at the top of the note
- [x] Discard the summary
- [x] Runs on the local AI model, no internet
- [x] Rule: only uses information from the note: code drops any bullet that adds a
      number or date the note doesn't have
- [x] Rule: note under ~50 words is not summarized; user told it's already short
- [x] Rule: note over ~1,500 words shows a "may miss details" warning
- [x] Error: if the AI fails or times out, the user can retry
- [x] Error: the note is never changed unless the user inserts the summary

## 3. Extract Tasks (AI)

Find the to-dos in a note and turn them into tasks, from the note editor.

- [x] Input: the text of one note
- [x] Output: suggested tasks, each with a title and a due date/time if mentioned
- [x] Review screen: untick, edit or remove items, then save
- [x] Saved tasks go to the task list
- [x] Reminders scheduled for tasks with a due time
- [x] Rule: nothing is saved until the user confirms
- [x] Rule: AI finds tasks and titles only; code resolves dates ("tomorrow", "Friday", "next Monday")
- [x] Rule: task with no date in the note is saved without a due date
- [x] Rule: no tasks found → user is told, nothing created
- [ ] Test: "Call Ana tomorrow, finish slides by Friday, buy printer ink." → Call Ana (tomorrow),
      Finish slides (this Friday), Buy printer ink (no date) (needs the demo phone; the date
      half has a unit test with a fixed model reply)

## 4. Smart Quick Add

Create a task from one plain-English sentence, on Home or in Conversations.

- [x] Sentence → task with title, date, time and reminder (on, at due time),
      shown back with Save, Edit and Cancel
- [x] User can edit any field before saving: Edit opens the task editor filled in,
      with a "Remind me" switch
- [x] Code parses dates: today, tomorrow, weekday names, "next week", "Oct 15"
- [x] Code parses times: "5pm", "17:00", "in 2 hours"
- [x] Code reads the title for the usual wordings, without the AI. For other
      wordings the AI only writes the title, and code still works out the date
- [x] Rule: no date → task with no due date
- [x] Rule: date but no time → reminder defaults to 9:00 AM that day
- [x] Rule: time already passed today → ask if the user meant tomorrow
- [ ] Rule: sentence doesn't look like a task → offer to save as a note (not
      built: Pinsan lists what he can do; saying "note: …" saves it to the journal)
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

- [x] Create, edit and delete tasks (title, notes, priority, optional due date
      or time)
- [x] Mark a task done or not done
- [x] Grouped as Overdue, Today, Upcoming, No date and Done
- [x] Tasks can come from the Assistant, Quick Add, Extract Tasks, or manual
      entry
- [x] Rule: a date with no time is due all day, so the task is overdue only
      once that day ends

**Reminders**

- [x] Create, edit, cancel and delete reminders; mark them done or dismissed
- [x] Local notification fires at the set time, even if the app is closed
- [x] Notification shows the title and time; tapping it opens that reminder
- [x] A new time reschedules the notification; cancelling, finishing or
      deleting the reminder removes it
- [x] A reminder can be set for a task; finishing or deleting the task keeps
      the reminder
- [x] Asks for notification permission the first time a reminder is set; if
      notifications are off, the reminder is still saved and the app says it
      can't alert
- [x] Past-due reminders stay listed until they're marked done or dismissed
- [x] Works fully offline
- [x] Rule: a date with no time means 9:00 AM; a time that already passed
      today asks about tomorrow

Limits: on Android 14 and later, alerts can be late until "Alarms & reminders"
is allowed for the app in Settings; the Reminders screen shows a note with Open
settings. A force-stopped Android app gets no alerts until it's opened again.
iOS keeps at most 64 pending alerts, so the app schedules the soonest and tops
them up each time it opens.

## 6. Assistant (text + voice)

Manage tasks, reminders and the journal by typing or speaking: on Home (section 7)
or in ☰ → Conversations, a chat view of the same assistant.

- [x] Chat screen with a text box, a send button and a mic button
- [x] Voice: tap the mic, speak and see a live transcript; the request then
      runs exactly like typed text
- [x] "Start over" while you talk throws your words away and listens again
- [x] Replies show on screen and aren't read aloud, by design
      (`READ_REPLIES_ALOUD = false`); screen readers announce each reply
- [x] Common wordings are understood instantly by fixed rules, even before
      the AI download
- [x] Other wordings go to the on-device AI, which only proposes actions
- [x] Several requests in one message run in order: "Create a task to buy
      groceries, then remind me in 10 minutes to check my list"
- [x] "It" means the item just mentioned: "Remind me in 5 minutes to review it"
- [x] Asks which one when several items match, and asks when a reminder has
      no time
- [x] Asks before deleting
- [x] Says which parts worked and which didn't; never claims an action that
      didn't happen
- [x] Every-day requests ("every day at 8", "every morning at 8", "daily at
      9pm") make an every-day reminder (section 9); other repeats ("every
      Monday") are turned down rather than saved as a one-time reminder
- [x] Works offline; voice and free-form wording need the AI download
- [ ] Voice and free-form requests are heard and read correctly, at a usable
      speed (needs the demo phone)

## 7. Home: talk to Pinsan

Home is Pinsan's island. You talk to him there, and the ☰ menu opens everything else.

- [x] Home is the island, full screen, with no tab bar; ☰ at the top right opens
      Conversations, Journal, Tasks, Reminders, Emergency and AI setup
- [x] Tap the mic to start and again to stop; the camera glides in to Pinsan's
      face while he listens
- [x] Your words appear live on a paper note
- [x] "Start over" on the paper note throws your words away, and Pinsan listens
      again
- [x] A keyboard button for typing; typed requests take the same path
- [x] Pinsan answers in a speech bubble with buttons; a question stays until
      it's answered, and a finished reply fades after about 6 seconds
- [x] Quick Add proposals show Save, Edit and Cancel; Edit opens the task editor
      filled in, with a "Remind me" switch
- [x] Moods: listening, thinking, done (a hop) and oops (a worried tilt)
- [x] Before the AI download, the mic says it needs the on-device AI and offers
      Set up AI; typing works
- [x] The 3D scene draws at most 15 frames a second while the AI thinks
- [ ] Voice on Home with the 3D scene running next to the models, at a usable
      speed (needs the demo phone)

## 8. Journal

Notes about life, grouped by day and found by day.

- [x] ☰ → Journal: every note, grouped by the day it was written, newest first,
      under sticky day headers
- [x] A strip of days at the top to jump between days
- [x] Search box over titles and bodies
- [x] "Write today's entry" opens a new note; the mic records a voice entry
- [x] Saying or typing "write in my journal: …", "journal: …", "dear journal …"
      or "note: …" asks "Save this to today's journal?" and saves a note
- [x] The entry keeps the user's words; nothing in it is read as a request
- [x] "Write in my journal" with no words asks what to write

## 9. Every-day reminders

Reminders that ring at the same time every day, such as medicine.

- [x] "Remind me to take my medicine every day at 8 AM", "every morning at 8"
      and "daily at 9pm" make a daily reminder, shown back for a yes
- [x] No time given → asks "What time every day?" with suggestions
- [x] The reminder editor has a "Repeat every day" switch
- [x] Rings every day with the phone's daily alert (checked on the emulator:
      it rang and rescheduled itself for the next day)
- [x] Done or Dismiss only skips today ("Done for today" and "Skip today" in the
      editor); Cancel stops it
- [x] Other repeats ("every Monday", "every 2 hours") are turned down, not saved
      as a one-time reminder
- [x] Saved in SQLite (migration 3: `reminders.repeat`)

## 10. Emergency call

The app starts the call; the user does the talking. The number is 911, the
Philippines' national emergency hotline.

- [x] ☰ → Emergency asks "Call emergency services?", then opens the phone's
      dialer with 911 filled in
- [x] Saying or typing "call emergency", "call 911", "call an ambulance", "I need
      help" or "Emergency!" → Pinsan asks "Call emergency services (911)?" with
      Call 911 and Cancel
- [x] Never dials by itself: the user presses call in the dialer, so it needs no
      phone permission (a `tel:` link)
- [x] Rule: code matches the call phrase, not the AI model
- [x] Rule: only the whole message counts, so "Remind me to update my emergency
      contacts" and "Call the police station tomorrow" are left alone
- [x] A typed call for help goes through even while Pinsan is still answering
- [x] If the dialer can't open, the app says to dial 911 yourself
- [x] Works offline: opening the dialer needs no internet

## 11. Conversation history

Everything said to Pinsan, kept on the phone and read back by day.

- [x] Every line, on Home or in Conversations, and Pinsan's replies, saved in
      SQLite on the phone (migration 4)
- [x] Conversations → History shows it by day, newest day first, under sticky
      day headers
- [x] Clear deletes it after a confirmation; notes, tasks and reminders stay
- [x] A failed save never breaks the conversation

## Behavior across the app

- [x] **Offline:** every feature works in airplane mode; only the one-time model download needs internet
- [x] **Private:** no account, no cloud, all data in SQLite on the phone, including the conversation history
- [x] **Local AI:** voice, voice notes, free-form requests, Summarize and Extract Tasks run on-device
- [x] **Predictable:** AI writes text or suggests items; code handles dates; user confirms before saving. The Assistant acts on what the user asks for, but code still works out every date and item, and deletes are confirmed
- [x] **Language:** English only
- [x] **One-time AI download:** the AI models (~1.1 GB) download once, when the user taps Download; after that every AI feature works offline, and notes, tasks, reminders and the rules work even before the download

---

## After the MVP

| Feature                 | Description                                                         | Status                                                                             |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Journal                 | Notes grouped by day, found by day, written by voice                | ✅ Done (section 8)                                                                |
| Every-day reminders     | "Take my medicine every day at 8 AM"                                | ✅ Done (section 9)                                                                |
| Conversation history    | Everything said to Pinsan, by day                                   | ✅ Done (section 11)                                                               |
| Emergency               | Medical ID, call emergency or contacts by voice or tap, first aid   | 🟨 Calling 911 by voice or the ☰ menu is done (section 10); the rest is below     |
| Search                  | Find notes and tasks by keyword                                     | ✅ Done: the journal's search box for notes; "Find tasks about …" in the Assistant |
| Rewrite                 | Make a note shorter, more formal, more casual, or fix grammar       | ⬜ Not started                                                                     |
| Scan to text            | Photo of a document becomes an editable note                        | ⬜ Not started                                                                     |
| Task lists & checklists | Group tasks, add sub-steps                                          | ⬜ Not started                                                                     |
| Health log              | Blood pressure, blood sugar, weight, medicine taken; weekly summary | ⬜ Not started                                                                     |
| Flashcards              | Generate study cards from a note                                    | ⬜ Not started                                                                     |
| Walking tracker         | Step count                                                          | ⬜ Not started                                                                     |

### Emergency: what's left

- [ ] User sets the emergency number (911 is fixed for now)
- [ ] Saved list of emergency contacts (name and number); tap one, or say
      "call <contact name>", to open the dialer
- [ ] Medical ID screen a responder can read from the phone
- [ ] First-aid steps
- [ ] Point users to "Hey Siri / Hey Google" and the phone's Emergency SOS for
      when the phone is locked

Dropped: dialing by itself with the `CALL_PHONE` permission after a countdown.
The team decided the app never dials by itself (Oct 10, ~12:40 AM).

**Why the app can't always call by itself**

- iOS always asks the user to confirm before an app starts a call, for any
  number.
- Android blocks regular apps from auto-dialing official emergency numbers;
  other numbers are allowed with `CALL_PHONE`.
- An app can't speak into a phone call, and automated calls to emergency lines
  are restricted (in the US, by the TCPA).
