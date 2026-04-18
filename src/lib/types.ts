export type AIStatus = "pending" | "sorted" | "review" | "failed";

export interface Notebook {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  notebookId: string | null;
  title: string;
  body: string;
  source: string;
  aiStatus: AIStatus;
  aiConfidence: number | null;
  pinned: boolean;
  archived: boolean;
  reminderAt: string | null;
  suggestedTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BoardView = "board" | "timeline" | "archive";

export interface AppUser {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  image: string | null;
}

export interface ClassificationLog {
  id: string;
  noteId: string;
  chosenNotebookId: string | null;
  confidence: number;
  model: string;
  reasoning: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  viewer: AppUser | null;
  notebooks: Notebook[];
  activeNotes: Note[];
  archivedNotes: Note[];
  pendingCount: number;
}

export interface NotebookDraft {
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface CaptureNoteInput {
  body: string;
  useAiRouting: boolean;
  notebookId: string | null;
}

export interface ExportTarget {
  id: "chatgpt" | "grok" | "claude" | "gemini";
  label: string;
  url: string;
}
