/**
 * Schema changes in the order they were added. Each one runs once, in a
 * transaction, and `PRAGMA user_version` records how many have run.
 * Never edit or reorder a migration that has shipped. Append a new one instead.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: notes. Times are milliseconds since the epoch.
  `CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX notes_by_updated_at ON notes (updated_at DESC);`,

  // 2: tasks and reminders. A reminder may point at a task but outlives it.
  // `due_at` of an all-day task is the last millisecond of that day.
  `CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    due_at INTEGER,
    due_has_time INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX tasks_by_status_and_due ON tasks (status, due_at);
  CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled', 'completed', 'dismissed', 'cancelled')),
    notification_id TEXT,
    task_id INTEGER REFERENCES tasks (id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX reminders_by_status_and_time ON reminders (status, scheduled_at);`,

  // 3: every-day reminders. `repeat` is 'daily', or NULL for a one-off reminder.
  `ALTER TABLE reminders ADD COLUMN repeat TEXT;`,

  // 4: conversation history, one row per line, on Home or the Conversations screen.
  // `role` 'pinsan' is a reply. `spoken` is 1 when the user said the line out loud.
  `CREATE TABLE conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('user', 'pinsan')),
    text TEXT NOT NULL,
    spoken INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX conversation_messages_by_time ON conversation_messages (created_at);`,
];
