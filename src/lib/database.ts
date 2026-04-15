import Database from "@tauri-apps/plugin-sql";

let databasePromise: Promise<Database> | null = null;

async function seedDatabase(db: Database) {
  const notebookCount = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM notebooks",
  );
  const noteCount = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM notes",
  );

  if ((notebookCount[0]?.count ?? 0) === 0 && (noteCount[0]?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO notes (id, notebook_id, body, source, ai_status, ai_confidence, pinned, suggested_title, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        crypto.randomUUID(),
        null,
        "Welcome to Oat. Create notebooks like Series 65, Personal, or Work, then press Alt+N from anywhere to drop ideas straight into your system.",
        "system",
        "review",
        null,
        1,
        "Welcome to Oat",
        now,
        now,
      ],
    );
  }
}

async function migrate(db: Database) {
  await db.execute("PRAGMA foreign_keys = ON;");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NULL REFERENCES notebooks(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      source TEXT NOT NULL,
      ai_status TEXT NOT NULL,
      ai_confidence REAL NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      suggested_title TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classification_logs (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      chosen_notebook_id TEXT NULL,
      confidence REAL NOT NULL,
      model TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id)",
  );
  try {
    await db.execute("ALTER TABLE notebooks ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already present */
  }
  await seedDatabase(db);
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:oat.db").then(async (db) => {
      await migrate(db);
      return db;
    });
  }

  return databasePromise;
}
