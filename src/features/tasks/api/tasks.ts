import { getDatabase } from '@/lib/db';
import { notifyTableChanged, subscribeToTable } from '@/lib/db/table-changes';

import type { NewTask, Task, TaskChanges, TaskPriority } from '../types';

type TaskRow = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_at: number | null;
  due_has_time: number;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
};

type BindValue = string | number | null;

const COLUMNS =
  'id, title, description, status, priority, due_at, due_has_time, completed_at, created_at, updated_at';
const MAX_TITLE_LENGTH = 200;
const PRIORITIES: readonly string[] = ['low', 'normal', 'high'];

/** Calls `listener` after any task is created, changed or deleted. Returns an unsubscribe function. */
export function subscribeToTasks(listener: () => void): () => void {
  return subscribeToTable('tasks', listener);
}

/** Every task. A person's list is small, so it loads at once rather than in pages. */
export async function listTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(`SELECT ${COLUMNS} FROM tasks ORDER BY id`);
  return rows.map(toTask);
}

export async function getTask(id: number): Promise<Task | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(`SELECT ${COLUMNS} FROM tasks WHERE id = ?`, id);
  return row && toTask(row);
}

/** Stores a new task and returns it as saved. Throws for a missing title. */
export async function createTask(input: NewTask): Promise<Task> {
  const title = checkTitle(input.title);
  const dueAt = input.dueAt ?? null;
  const now = Date.now();
  const db = await getDatabase();
  const { lastInsertRowId } = await db.runAsync(
    `INSERT INTO tasks (title, description, priority, due_at, due_has_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    title,
    input.description?.trim() ?? '',
    input.priority ?? 'normal',
    dueAt,
    dueAt !== null && input.dueHasTime ? 1 : 0,
    now,
    now,
  );
  notifyTableChanged('tasks');
  return requireTask(lastInsertRowId);
}

/** Saves the given fields. A `dueAt` of null clears the deadline. */
export async function updateTask(id: number, changes: TaskChanges): Promise<Task> {
  const assignments: string[] = [];
  const values: BindValue[] = [];
  if (changes.title !== undefined) {
    assignments.push('title = ?');
    values.push(checkTitle(changes.title));
  }
  if (changes.description !== undefined) {
    assignments.push('description = ?');
    values.push(changes.description.trim());
  }
  if (changes.priority !== undefined) {
    assignments.push('priority = ?');
    values.push(changes.priority);
  }
  if (changes.dueAt !== undefined) {
    assignments.push('due_at = ?', 'due_has_time = ?');
    values.push(changes.dueAt, changes.dueAt !== null && changes.dueHasTime ? 1 : 0);
  }
  if (assignments.length === 0) return requireTask(id);

  const db = await getDatabase();
  const { changes: changed } = await db.runAsync(
    `UPDATE tasks SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`,
    ...values,
    Date.now(),
    id,
  );
  if (changed === 0) throw new Error('That task no longer exists.');
  // Reminders show the title of the task they're for.
  notifyTableChanged('tasks', 'reminders');
  return requireTask(id);
}

/** Marks a task done or not done. Its reminders stay as they are. */
export async function setTaskDone(id: number, done: boolean): Promise<Task> {
  const now = Date.now();
  const db = await getDatabase();
  const { changes } = await db.runAsync(
    'UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    done ? 'done' : 'pending',
    done ? now : null,
    now,
    id,
  );
  if (changes === 0) throw new Error('That task no longer exists.');
  notifyTableChanged('tasks');
  return requireTask(id);
}

/** Deletes a task. Reminders set for it are kept, no longer linked to anything. */
export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();
  let deleted = false;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    // The schema says ON DELETE SET NULL, but SQLite only applies it with
    // foreign keys switched on, so unlink explicitly.
    await transaction.runAsync('UPDATE reminders SET task_id = NULL WHERE task_id = ?', id);
    const { changes } = await transaction.runAsync('DELETE FROM tasks WHERE id = ?', id);
    deleted = changes > 0;
  });
  if (!deleted) throw new Error('That task no longer exists.');
  notifyTableChanged('tasks', 'reminders');
}

async function requireTask(id: number): Promise<Task> {
  const task = await getTask(id);
  if (!task) throw new Error('That task no longer exists.');
  return task;
}

function checkTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('A task needs a title.');
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status === 'done' ? 'done' : 'pending',
    priority: PRIORITIES.includes(row.priority) ? (row.priority as TaskPriority) : 'normal',
    dueAt: row.due_at,
    dueHasTime: row.due_at !== null && row.due_has_time === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
