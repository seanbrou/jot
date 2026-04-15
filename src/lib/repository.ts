import { getDatabase } from "./database";
import type {
  ClassificationLog,
  DashboardSnapshot,
  Notebook,
  NotebookDraft,
  Note,
} from "./types";

interface NotebookRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface NoteRow {
  id: string;
  notebook_id: string | null;
  title: string | null;
  body: string;
  source: string;
  ai_status: Note["aiStatus"];
  ai_confidence: number | null;
  pinned: number;
  archived: number | null;
  suggested_title: string | null;
  created_at: string;
  updated_at: string;
}

interface ClassificationLogRow {
  id: string;
  note_id: string;
  chosen_notebook_id: string | null;
  confidence: number;
  model: string;
  reasoning: string;
  created_at: string;
}

function mapNotebook(row: NotebookRow): Notebook {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    description: row.description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    title: row.title ?? row.suggested_title ?? row.body.trim().split(/\r?\n/)[0] ?? "Untitled note",
    body: row.body,
    source: row.source,
    aiStatus: row.ai_status,
    aiConfidence: row.ai_confidence,
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    suggestedTitle: row.suggested_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLog(row: ClassificationLogRow): ClassificationLog {
  return {
    id: row.id,
    noteId: row.note_id,
    chosenNotebookId: row.chosen_notebook_id,
    confidence: row.confidence,
    model: row.model,
    reasoning: row.reasoning,
    createdAt: row.created_at,
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const db = await getDatabase();
  const [notebooks, notes] = await Promise.all([
    db.select<NotebookRow[]>("SELECT * FROM notebooks ORDER BY updated_at DESC"),
    db.select<NoteRow[]>(
      "SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, created_at DESC",
    ),
  ]);

  return {
    viewer: null,
    notebooks: notebooks.map(mapNotebook),
    activeNotes: notes.map(mapNote).filter((note) => !note.archived),
    archivedNotes: notes.map(mapNote).filter((note) => note.archived),
    pendingCount: notes.filter((note) => note.ai_status === "pending").length,
  };
}

export async function getNoteById(noteId: string): Promise<Note | null> {
  const db = await getDatabase();
  const rows = await db.select<NoteRow[]>("SELECT * FROM notes WHERE id = $1", [noteId]);
  return rows[0] ? mapNote(rows[0]) : null;
}

export async function listPendingNotes(): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.select<NoteRow[]>(
    "SELECT * FROM notes WHERE ai_status = $1 ORDER BY created_at ASC",
    ["pending"],
  );
  return rows.map(mapNote);
}

export async function createNotebook(draft: NotebookDraft): Promise<Notebook> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO notebooks (id, name, color, icon, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [id, draft.name.trim(), draft.color, draft.icon, draft.description.trim(), now, now],
  );
  return {
    id,
    name: draft.name.trim(),
    color: draft.color,
    icon: draft.icon,
    description: draft.description.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateNotebook(
  notebookId: string,
  draft: NotebookDraft,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE notebooks SET name = $1, color = $2, icon = $3, description = $4, updated_at = $5 WHERE id = $6",
    [draft.name.trim(), draft.color, draft.icon, draft.description.trim(), now, notebookId],
  );
}

export async function deleteNotebook(notebookId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("UPDATE notes SET notebook_id = NULL WHERE notebook_id = $1", [
    notebookId,
  ]);
  await db.execute("DELETE FROM notebooks WHERE id = $1", [notebookId]);
}

export async function createQuickNote(body: string): Promise<Note> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO notes (id, notebook_id, body, source, ai_status, ai_confidence, pinned, suggested_title, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [id, null, body.trim(), "quick-capture", "pending", null, 0, null, now, now],
  );

  return {
    id,
    notebookId: null,
    title: body.trim().split(/\r?\n/)[0] ?? "Untitled note",
    body: body.trim(),
    source: "quick-capture",
    aiStatus: "pending",
    aiConfidence: null,
    pinned: false,
    archived: false,
    suggestedTitle: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateNoteBody(noteId: string, body: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute("UPDATE notes SET body = $1, updated_at = $2 WHERE id = $3", [
    body.trim(),
    now,
    noteId,
  ]);
}

export async function deleteNote(noteId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM classification_logs WHERE note_id = $1", [noteId]);
  await db.execute("DELETE FROM notes WHERE id = $1", [noteId]);
}

export async function togglePinned(noteId: string, pinned: boolean): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute("UPDATE notes SET pinned = $1, updated_at = $2 WHERE id = $3", [
    pinned ? 1 : 0,
    now,
    noteId,
  ]);
}

export async function moveNote(noteId: string, notebookId: string | null): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE notes SET notebook_id = $1, ai_status = $2, ai_confidence = $3, updated_at = $4 WHERE id = $5",
    [notebookId, notebookId ? "sorted" : "review", null, now, noteId],
  );
}

export async function markNotePending(noteId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE notes SET ai_status = $1, ai_confidence = NULL, updated_at = $2 WHERE id = $3",
    ["pending", now, noteId],
  );
}

export async function applyClassificationResult(input: {
  noteId: string;
  notebookId: string | null;
  confidence: number;
  suggestedTitle?: string;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE notes SET notebook_id = $1, ai_status = $2, ai_confidence = $3, suggested_title = $4, updated_at = $5 WHERE id = $6",
    [
      input.notebookId,
      input.notebookId ? "sorted" : "review",
      input.confidence,
      input.suggestedTitle ?? null,
      now,
      input.noteId,
    ],
  );
}

export async function markClassificationFailed(noteId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE notes SET ai_status = $1, notebook_id = NULL, updated_at = $2 WHERE id = $3",
    ["failed", now, noteId],
  );
}

export async function createClassificationLog(
  input: Omit<ClassificationLog, "id" | "createdAt">,
): Promise<ClassificationLog> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.execute(
    "INSERT INTO classification_logs (id, note_id, chosen_notebook_id, confidence, model, reasoning, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      id,
      input.noteId,
      input.chosenNotebookId,
      input.confidence,
      input.model,
      input.reasoning,
      createdAt,
    ],
  );

  const rows = await db.select<ClassificationLogRow[]>(
    "SELECT * FROM classification_logs WHERE id = $1",
    [id],
  );

  return mapLog(rows[0]);
}
