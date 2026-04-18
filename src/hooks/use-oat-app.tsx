import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useAction,
  useConvex,
  useMutation,
  useQuery,
  useConvexAuth,
} from "convex/react";
import { anyApi } from "convex/server";
import { authClient } from "../lib/auth-client";
import { exportNoteToTarget } from "../lib/export";
import { DEFAULT_NOTEBOOK_DRAFT, INBOX_NOTEBOOK_ID } from "../lib/constants";
import type {
  BoardView,
  CaptureNoteInput,
  DashboardSnapshot,
  Note,
  NotebookDraft,
} from "../lib/types";

interface OatAppContextValue {
  windowLabel: string;
  snapshot: DashboardSnapshot;
  selectedNotebookId: string;
  setSelectedNotebookId: (notebookId: string) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (noteId: string | null) => void;
  activeView: BoardView;
  setActiveView: (view: BoardView) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  loading: boolean;
  syncing: boolean;
  isAuthenticated: boolean;
  authReady: boolean;
  error: string | null;
  clearError: () => void;
  pendingCount: number;
  createNotebook: (draft: NotebookDraft) => Promise<void>;
  saveNotebook: (notebookId: string, draft: NotebookDraft) => Promise<void>;
  deleteNotebook: (notebookId: string) => Promise<void>;
  captureNote: (input: CaptureNoteInput) => Promise<void>;
  saveNote: (input: {
    noteId: string;
    body: string;
    notebookId: string | null;
    reclassify: boolean;
  }) => Promise<void>;
  createNote: (input: {
    body: string;
    notebookId: string | null;
    source?: string;
    pinned?: boolean;
    reminderAt?: number | null;
  }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  moveNote: (noteId: string, notebookId: string | null) => Promise<void>;
  togglePinned: (noteId: string, pinned: boolean) => Promise<void>;
  reclassifyNote: (noteId: string) => Promise<void>;
  setNoteArchived: (noteId: string, archived: boolean) => Promise<void>;
  exportNote: (noteBody: string, targetId: string) => Promise<void>;
  getNoteDetail: (noteId: string) => Promise<{
    id: string;
    body: string;
    notebookId: string | null;
    archived: boolean;
    aiStatus: "pending" | "sorted" | "review" | "failed";
    suggestedTitle: string | null;
    title: string;
    reminderAt: string | null;
  }>;
  signOut: () => Promise<void>;
}

const OatAppContext = createContext<OatAppContextValue | null>(null);

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  viewer: null,
  notebooks: [],
  activeNotes: [],
  archivedNotes: [],
  pendingCount: 0,
};

type OptimisticNotePatch = Partial<
  Pick<Note, "notebookId" | "archived" | "pinned" | "aiStatus" | "aiConfidence" | "updatedAt">
>;

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function applyOptimisticPatches(
  snapshot: DashboardSnapshot,
  optimisticNotePatches: Map<string, OptimisticNotePatch>,
) {
  if (optimisticNotePatches.size === 0) {
    return snapshot;
  }

  const nextActiveNotes: Note[] = [];
  const nextArchivedNotes: Note[] = [];

  const applyPatch = (note: Note) => {
    const patch = optimisticNotePatches.get(note.id);
    if (!patch) {
      return note;
    }

    return {
      ...note,
      ...patch,
    };
  };

  for (const note of snapshot.activeNotes) {
    const patchedNote = applyPatch(note);
    if (patchedNote.archived) {
      nextArchivedNotes.push(patchedNote);
      continue;
    }

    nextActiveNotes.push(patchedNote);
  }

  for (const note of snapshot.archivedNotes) {
    const patchedNote = applyPatch(note);
    if (patchedNote.archived) {
      nextArchivedNotes.push(patchedNote);
      continue;
    }

    nextActiveNotes.push(patchedNote);
  }

  return {
    ...snapshot,
    activeNotes: sortNotes(nextActiveNotes),
    archivedNotes: sortNotes(nextArchivedNotes),
    pendingCount: nextActiveNotes.filter((note) => note.aiStatus === "pending").length,
  };
}

function patchMatchesNote(note: Note, patch: OptimisticNotePatch) {
  return Object.entries(patch).every(([key, value]) => note[key as keyof Note] === value);
}

export function OatAppProvider({
  children,
  windowLabel,
}: {
  children: ReactNode;
  windowLabel: string;
}) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const convex = useConvex();
  const [selectedNotebookId, setSelectedNotebookId] = useState(INBOX_NOTEBOOK_ID);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<BoardView>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const [error, setError] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [optimisticNotePatches, setOptimisticNotePatches] = useState<Map<string, OptimisticNotePatch>>(
    () => new Map(),
  );

  const createNotebookMutation = useMutation(anyApi.notebooks.create);
  const updateNotebookMutation = useMutation(anyApi.notebooks.update);
  const deleteNotebookAction = useAction(anyApi.notebooks.remove);
  const createNoteMutation = useMutation(anyApi.notes.create);
  const createAndClassifyAction = useAction(anyApi.notes.createAndClassify);
  const updateNoteMutation = useMutation(anyApi.notes.update);
  const updateAndReclassifyAction = useAction(anyApi.notes.updateAndReclassify);
  const deleteNoteMutation = useMutation(anyApi.notes.remove);
  const moveNoteMutation = useMutation(anyApi.notes.move);
  const togglePinnedMutation = useMutation(anyApi.notes.togglePinned);
  const reclassifyNowAction = useAction(anyApi.notes.reclassifyNow);
  const setArchivedMutation = useMutation(anyApi.notes.setArchived);

  const rawSnapshot = useQuery(
    anyApi.notes.getBoardSnapshot,
    isAuthenticated
      ? {
          searchText: deferredSearchQuery || undefined,
          activeView,
        }
      : "skip",
  );

  const snapshot: DashboardSnapshot = useMemo(() => {
    const baseSnapshot = rawSnapshot ?? EMPTY_SNAPSHOT;
    return applyOptimisticPatches(baseSnapshot, optimisticNotePatches);
  }, [optimisticNotePatches, rawSnapshot]);

  useEffect(() => {
    if (!rawSnapshot || optimisticNotePatches.size === 0) {
      return;
    }

    const notesById = new Map(
      [...rawSnapshot.activeNotes, ...rawSnapshot.archivedNotes].map((note) => [note.id, note]),
    );

    setOptimisticNotePatches((current) => {
      let changed = false;
      const next = new Map(current);

      for (const [noteId, patch] of current) {
        const note = notesById.get(noteId);
        if (!note || patchMatchesNote(note, patch)) {
          next.delete(noteId);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [optimisticNotePatches, rawSnapshot]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedNotebookId(INBOX_NOTEBOOK_ID);
      setSelectedNoteId(null);
      setOptimisticNotePatches(new Map());
      return;
    }

    const allNoteIds = new Set(
      [...snapshot.activeNotes, ...snapshot.archivedNotes].map((note) => note.id),
    );
    const notebookStillExists =
      selectedNotebookId === INBOX_NOTEBOOK_ID ||
      snapshot.notebooks.some((notebook) => notebook.id === selectedNotebookId);

    if (!notebookStillExists) {
      setSelectedNotebookId(INBOX_NOTEBOOK_ID);
    }

    if (selectedNoteId && !allNoteIds.has(selectedNoteId)) {
      setSelectedNoteId(null);
    }
  }, [
    isAuthenticated,
    selectedNotebookId,
    selectedNoteId,
    snapshot.activeNotes,
    snapshot.archivedNotes,
    snapshot.notebooks,
  ]);

  async function runMutation(work: () => Promise<void>, keepSelection = false) {
    setPendingOperations((current) => current + 1);
    try {
      await work();
    } catch (mutationError) {
      setError(toErrorMessage(mutationError));
      throw mutationError;
    } finally {
      if (!keepSelection) {
        setSelectedNoteId(null);
      }
      setPendingOperations((current) => Math.max(0, current - 1));
    }
  }

  function setOptimisticNotePatch(noteId: string, patch: OptimisticNotePatch) {
    setOptimisticNotePatches((current) => {
      const next = new Map(current);
      next.set(noteId, {
        ...(next.get(noteId) ?? {}),
        ...patch,
      });
      return next;
    });
  }

  function clearOptimisticNotePatch(noteId: string) {
    setOptimisticNotePatches((current) => {
      if (!current.has(noteId)) {
        return current;
      }

      const next = new Map(current);
      next.delete(noteId);
      return next;
    });
  }

  const value: OatAppContextValue = {
    windowLabel,
    snapshot,
    selectedNotebookId,
    setSelectedNotebookId,
    selectedNoteId,
    setSelectedNoteId,
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    loading: authLoading || (isAuthenticated && rawSnapshot === undefined),
    syncing: pendingOperations > 0,
    isAuthenticated,
    authReady: !authLoading,
    error,
    clearError: () => setError(null),
    pendingCount: snapshot.pendingCount,
    createNotebook: async (draft) => {
      const name = draft.name.trim();
      if (!name) {
        setError("Give the notebook a name first.");
        return;
      }

      await runMutation(async () => {
        await createNotebookMutation({
          name,
          color: draft.color,
          icon: draft.icon,
          description: draft.description.trim() || undefined,
        });
      });
    },
    saveNotebook: async (notebookId, draft) => {
      const name = draft.name.trim();
      if (!name) {
        setError("Notebook names cannot be empty.");
        return;
      }

      await runMutation(
        async () => {
          await updateNotebookMutation({
            notebookId: notebookId as never,
            name,
            color: draft.color,
            icon: draft.icon,
            description: draft.description.trim() || undefined,
          });
        },
        true,
      );
    },
    deleteNotebook: async (notebookId) => {
      await runMutation(async () => {
        await deleteNotebookAction({ notebookId: notebookId as never });
        setSelectedNotebookId(INBOX_NOTEBOOK_ID);
      });
    },
    captureNote: async (input) => {
      const trimmed = input.body.trim();
      if (!trimmed) {
        return;
      }

      await runMutation(async () => {
        if (input.useAiRouting) {
          await createAndClassifyAction({
            body: trimmed,
            source: "quick-capture",
            pinned: false,
          });
          return;
        }

        if (input.notebookId === null) {
          await createAndClassifyAction({
            body: trimmed,
            source: "quick-capture",
            pinned: false,
          });
          return;
        }

        await createNoteMutation({
          body: trimmed,
          notebookId: input.notebookId as never,
          source: "quick-capture",
          pinned: false,
        });
      });
    },
    saveNote: async ({ noteId, body, notebookId, reclassify }) => {
      const trimmed = body.trim();
      if (!trimmed) {
        setError("Notes need at least a little text.");
        return;
      }

      await runMutation(
        async () => {
          if (reclassify) {
            await updateAndReclassifyAction({
              noteId: noteId as never,
              body: trimmed,
            });
            return;
          }

          await updateNoteMutation({
            noteId: noteId as never,
            body: trimmed,
            notebookId: notebookId as never,
            reclassify: false,
          });
        },
        true,
      );
    },
    createNote: async ({ body, notebookId, source = "main-window", pinned = false, reminderAt }) => {
      const trimmed = body.trim();
      if (!trimmed) {
        setError("Notes need at least a little text.");
        return;
      }

      await runMutation(async () => {
        if (notebookId === null) {
          await createAndClassifyAction({
            body: trimmed,
            source,
            pinned,
            reminderAt: reminderAt ?? null,
          });
          return;
        }

        await createNoteMutation({
          body: trimmed,
          notebookId: notebookId as never,
          source,
          pinned,
          reminderAt: reminderAt ?? null,
        });
      });
    },
    deleteNote: async (noteId) => {
      await runMutation(async () => {
        await deleteNoteMutation({ noteId: noteId as never });
      });
    },
    moveNote: async (noteId, notebookId) => {
      const note = [...snapshot.activeNotes, ...snapshot.archivedNotes].find(
        (entry) => entry.id === noteId,
      );
      const optimisticUpdatedAt = new Date().toISOString();

      if (note) {
        setOptimisticNotePatch(noteId, {
          notebookId,
          archived: false,
          aiStatus: notebookId ? "sorted" : "review",
          aiConfidence: notebookId ? note.aiConfidence ?? 1 : null,
          updatedAt: optimisticUpdatedAt,
        });
      }

      await runMutation(
        async () => {
          try {
            await moveNoteMutation({
              noteId: noteId as never,
              notebookId: notebookId as never,
            });
          } catch (error) {
            clearOptimisticNotePatch(noteId);
            throw error;
          }
        },
        true,
      );
    },
    togglePinned: async (noteId, pinned) => {
      setOptimisticNotePatch(noteId, {
        pinned,
        updatedAt: new Date().toISOString(),
      });

      await runMutation(
        async () => {
          try {
            await togglePinnedMutation({
              noteId: noteId as never,
              pinned,
            });
          } catch (error) {
            clearOptimisticNotePatch(noteId);
            throw error;
          }
        },
        true,
      );
    },
    reclassifyNote: async (noteId) => {
      await runMutation(
        async () => {
          await reclassifyNowAction({ noteId: noteId as never });
        },
        true,
      );
    },
    setNoteArchived: async (noteId, archived) => {
      setOptimisticNotePatch(noteId, {
        archived,
        updatedAt: new Date().toISOString(),
      });

      await runMutation(
        async () => {
          try {
            await setArchivedMutation({
              noteId: noteId as never,
              archived,
            });
          } catch (error) {
            clearOptimisticNotePatch(noteId);
            throw error;
          }
        },
        true,
      );
    },
    exportNote: async (noteBody, targetId) => {
      try {
        await exportNoteToTarget(targetId, noteBody);
      } catch (exportError) {
        setError(toErrorMessage(exportError));
      }
    },
    getNoteDetail: async (noteId) => {
      try {
        return await convex.query(anyApi.notes.getDetail, { noteId: noteId as never });
      } catch (detailError) {
        setError(toErrorMessage(detailError));
        throw detailError;
      }
    },
    signOut: async () => {
      try {
        await authClient.signOut();
        setSelectedNotebookId(INBOX_NOTEBOOK_ID);
        setSelectedNoteId(null);
      } catch (signOutError) {
        setError(toErrorMessage(signOutError));
      }
    },
  };

  return <OatAppContext.Provider value={value}>{children}</OatAppContext.Provider>;
}

export function useOatApp() {
  const context = useContext(OatAppContext);

  if (!context) {
    throw new Error("useOatApp must be used inside OatAppProvider.");
  }

  return context;
}

export function useNotebookDraftState() {
  const [draft, setDraft] = useState<NotebookDraft>(DEFAULT_NOTEBOOK_DRAFT);
  return { draft, setDraft };
}
