import { useState } from "react";
import clsx from "clsx";
import { Loader2, Search } from "lucide-react";
import { AuthGate } from "./auth-gate";
import { AccountDialog } from "./account-dialog";
import { NotebookDialog } from "./notebook-dialog";
import { NoteDialog, type NoteDialogState } from "./note-dialog";
import { NotesBoard, getColumnIdFromNote } from "./notes-board";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { useNotebookDraftState, useOatApp } from "../hooks/use-oat-app";
import { DEFAULT_NOTEBOOK_DRAFT } from "../lib/constants";
import type { BoardView, Note } from "../lib/types";

type DeleteTarget =
  | { type: "note"; id: string; label: string }
  | { type: "notebook"; id: string; label: string }
  | null;

const EMPTY_NOTE_DIALOG: NoteDialogState = {
  open: false,
  noteId: null,
  body: "",
  notebookId: null,
  useAiRouting: true,
};

export function MainWindow() {
  const {
    activeView,
    authReady,
    clearError,
    createNote,
    createNotebook,
    deleteNote,
    deleteNotebook,
    error,
    getNoteDetail,
    isAuthenticated,
    loading,
    moveNote,
    pendingCount,
    reclassifyNote,
    saveNote,
    saveNotebook,
    searchQuery,
    setActiveView,
    setNoteArchived,
    setSearchQuery,
    signOut,
    snapshot,
    syncing,
    togglePinned,
  } = useOatApp();

  const { draft: notebookDraft, setDraft: setNotebookDraft } = useNotebookDraftState();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(EMPTY_NOTE_DIALOG);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [loadingNoteDetail, setLoadingNoteDetail] = useState(false);

  function openCreateNotebook() {
    if (!isAuthenticated) {
      return;
    }

    setEditingNotebookId(null);
    setNotebookDraft(DEFAULT_NOTEBOOK_DRAFT);
    setNotebookDialogOpen(true);
  }

  function openNotebookEditor(notebookId: string) {
    if (!isAuthenticated) {
      return;
    }

    const notebook = snapshot.notebooks.find((entry) => entry.id === notebookId);
    if (!notebook) {
      return;
    }

    setEditingNotebookId(notebook.id);
    setNotebookDraft({
      name: notebook.name,
      color: notebook.color,
      icon: notebook.icon,
      description: notebook.description ?? "",
    });
    setNotebookDialogOpen(true);
  }

  function openCreateNote(notebookId: string | null) {
    if (!isAuthenticated) {
      return;
    }

    setNoteDialog({
      open: true,
      noteId: null,
      body: "",
      notebookId,
      useAiRouting: true,
    });
  }

  async function openEditNote(note: Note) {
    if (!isAuthenticated) {
      return;
    }

    setLoadingNoteDetail(true);
    try {
      const detail = await getNoteDetail(note.id);
      setNoteDialog({
        open: true,
        noteId: note.id,
        body: detail.body,
        notebookId: detail.notebookId,
        useAiRouting: detail.notebookId === null && !detail.archived,
      });
    } catch {
      return;
    } finally {
      setLoadingNoteDetail(false);
    }
  }

  function openAccountPanel() {
    if (!isAuthenticated) {
      return;
    }

    setAccountOpen(true);
  }

  async function submitNotebookDialog() {
    if (editingNotebookId) {
      await saveNotebook(editingNotebookId, notebookDraft);
    } else {
      await createNotebook(notebookDraft);
    }

    setNotebookDialogOpen(false);
    setEditingNotebookId(null);
    setNotebookDraft(DEFAULT_NOTEBOOK_DRAFT);
  }

  async function submitNoteDialog() {
    const trimmed = noteDialog.body.trim();
    if (!trimmed) {
      return;
    }

    if (noteDialog.noteId) {
      await saveNote({
        noteId: noteDialog.noteId,
        body: trimmed,
        notebookId: noteDialog.useAiRouting ? null : noteDialog.notebookId,
        reclassify: noteDialog.useAiRouting,
      });
    } else {
      await createNote({
        body: trimmed,
        notebookId: noteDialog.useAiRouting ? null : noteDialog.notebookId,
      });
    }

    setNoteDialog(EMPTY_NOTE_DIALOG);
  }

  async function handleMoveNote(noteId: string, targetColumnId: string | null) {
    const note = [...snapshot.activeNotes, ...snapshot.archivedNotes].find(
      (entry) => entry.id === noteId,
    );
    if (!note || !targetColumnId || getColumnIdFromNote(note) === targetColumnId) {
      return;
    }

    if (targetColumnId === "archive") {
      await setNoteArchived(noteId, true);
      return;
    }

    if (note.archived) {
      await setNoteArchived(noteId, false);
    }

    await moveNote(noteId, targetColumnId === "inbox" ? null : targetColumnId);
  }

  const boardButtons: { id: BoardView; label: string }[] = [
    { id: "board", label: "Board" },
    { id: "timeline", label: "Timeline" },
    { id: "archive", label: "Archive" },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-container-low font-body text-on-surface">
      <aside className="fixed left-0 top-0 z-10 flex h-screen w-12 flex-col items-center border-r border-[#e8e2dc] bg-[#f3efeb] py-3">
        <div className="mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#b35c2a] text-xs font-bold text-white">
            AI
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <button
            type="button"
            className="group relative flex items-center justify-center rounded-lg p-2 text-[#8c857f] transition-all hover:bg-[#e8e2dc]/60"
            onClick={() => setActiveView("timeline")}
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
          </button>
          <button
            type="button"
            className="group relative flex items-center justify-center rounded-lg bg-[#e8e2dc] p-2 text-[#2d2a27]"
            onClick={() => setActiveView("board")}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_stories
            </span>
          </button>
          <button
            type="button"
            className="group relative flex items-center justify-center rounded-lg p-2 text-[#8c857f] transition-all hover:bg-[#e8e2dc]/60"
            onClick={openCreateNotebook}
          >
            <span className="material-symbols-outlined text-[20px]">sell</span>
          </button>
        </nav>
        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-[#8c857f] transition-all hover:bg-[#e8e2dc]/60"
            onClick={openAccountPanel}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <button
            type="button"
            className="mt-1 h-7 w-7 overflow-hidden rounded-full bg-surface-container-highest"
            onClick={openAccountPanel}
          >
            {snapshot.viewer?.image ? (
              <img alt="User Profile" src={snapshot.viewer.image} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#2d2a27]">
                {(snapshot.viewer?.name ?? "O").slice(0, 1).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </aside>

      <div className="relative ml-12 flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 w-full items-center justify-between border-b border-[#e8e2dc] bg-[#faf7f5] px-5 transition-colors">
          <div className="flex items-center gap-5">
            <h1 className="font-headline text-[15px] font-semibold tracking-tight text-[#2d2a27]">
              Architectural Intelligence
            </h1>
            <div className="hidden items-center gap-1.5 rounded-full bg-[#f3efeb]/80 px-3 py-1 transition-all focus-within:bg-white focus-within:shadow-sm focus-within:ring-1 focus-within:ring-[#d4cec8] md:flex">
              <Search className="h-3.5 w-3.5 text-[#b5aea8]" />
              <input
                className="w-48 border-none bg-transparent p-0 text-[13px] text-[#2d2a27] outline-none placeholder:text-[#b5aea8]"
                placeholder="Search..."
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 rounded-full bg-[#b35c2a] px-3 py-1 text-[12px] font-medium text-white transition-all duration-150 hover:bg-[#9a4f22] active:scale-[0.97]"
              onClick={() => openCreateNote(null)}
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              New
            </button>
            <div className="flex items-center gap-0">
              <button
                type="button"
                className="relative rounded-full p-1 text-[#8c857f] transition-colors hover:bg-[#ede8e3]/80"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {pendingCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#b35c2a] px-0.5 text-[8px] font-bold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-[#8c857f] transition-colors hover:bg-[#ede8e3]/80"
                onClick={openAccountPanel}
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        <main className="z-0 flex-1 min-h-0 overflow-x-auto overflow-y-hidden overscroll-x-contain p-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="font-headline text-xl font-bold tracking-tight text-[#2d2a27]">
                Functional Boards
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8c857f]">
                Strategic intelligence and task categorization
              </p>
            </div>
            <div className="flex rounded-full bg-[#f3efeb]/80 p-0.5">
              {boardButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  className={clsx(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150",
                    activeView === button.id
                      ? "bg-white text-[#2d2a27] shadow-sm"
                      : "text-[#8c857f] hover:text-[#2d2a27]",
                  )}
                  onClick={() => setActiveView(button.id)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          {!authReady || loading ? (
            <div className="flex h-[calc(100vh-10rem)] items-center justify-center text-[#8c857f]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading your workspace...
            </div>
          ) : !isAuthenticated ? (
            <AuthGate />
          ) : (
            <NotesBoard
              activeView={activeView}
              notebooks={snapshot.notebooks}
              activeNotes={snapshot.activeNotes}
              archivedNotes={snapshot.archivedNotes}
              onOpenNote={(note) => void openEditNote(note)}
              onCreateNote={openCreateNote}
              onEditNotebook={(notebook) => openNotebookEditor(notebook.id)}
              onMoveNote={handleMoveNote}
              onTogglePinned={(note) => void togglePinned(note.id, !note.pinned)}
              onToggleArchived={(note) => void setNoteArchived(note.id, !note.archived)}
            />
          )}
        </main>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#b35c2a] text-white shadow-lg shadow-[#b35c2a]/20 transition-all duration-200 hover:scale-105 hover:bg-[#a04f22] active:scale-95"
        onClick={() => openCreateNote(null)}
      >
        <span className="material-symbols-outlined text-xl">add</span>
      </button>

      <div className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-[#e8e2dc] bg-white px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] md:hidden">
        <button type="button" className="flex flex-col items-center gap-1 text-[#b35c2a]">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            home
          </span>
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-[#b5aea8]">
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[10px] font-semibold">Explore</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-[#b5aea8]">
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-[10px] font-semibold">Alerts</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-1 text-[#b5aea8]"
          onClick={openAccountPanel}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </div>

      <NoteDialog
        state={noteDialog}
        notebooks={snapshot.notebooks}
        syncing={syncing || loadingNoteDetail}
        onOpenChange={(open) => setNoteDialog((current) => ({ ...current, open }))}
        onStateChange={setNoteDialog}
        onSubmit={submitNoteDialog}
        onDelete={
          noteDialog.noteId
            ? () => {
                const note = [...snapshot.activeNotes, ...snapshot.archivedNotes].find(
                  (entry) => entry.id === noteDialog.noteId,
                );
                if (note) {
                  setDeleteTarget({
                    type: "note",
                    id: note.id,
                    label: note.suggestedTitle || note.title,
                  });
                }
              }
            : undefined
        }
        onReclassify={
          noteDialog.noteId
            ? () => {
                const noteId = noteDialog.noteId;
                if (!noteId) {
                  return;
                }

                void reclassifyNote(noteId);
                setNoteDialog(EMPTY_NOTE_DIALOG);
              }
            : undefined
        }
      />

      <NotebookDialog
        open={notebookDialogOpen}
        onOpenChange={setNotebookDialogOpen}
        editing={Boolean(editingNotebookId)}
        editingNotebookId={editingNotebookId}
        draft={notebookDraft}
        onDraftChange={setNotebookDraft}
        onSubmit={submitNotebookDialog}
        syncing={syncing}
        existingNotebooks={snapshot.notebooks}
        onDelete={
          editingNotebookId
            ? () => {
                const notebook = snapshot.notebooks.find((entry) => entry.id === editingNotebookId);
                if (notebook) {
                  setDeleteTarget({
                    type: "notebook",
                    id: notebook.id,
                    label: notebook.name,
                  });
                }
              }
            : undefined
        }
      />

      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        viewer={snapshot.viewer}
        notebookCount={snapshot.notebooks.length}
        noteCount={snapshot.activeNotes.length + snapshot.archivedNotes.length}
        onCreateNotebook={openCreateNotebook}
        onSignOut={signOut}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "notebook" ? "notebook" : "note"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "notebook"
                ? `Deleting ${deleteTarget.label} moves its notes back to Inbox.`
                : `Deleting ${deleteTarget?.label ?? "this note"} removes it permanently.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                if (deleteTarget.type === "notebook") {
                  void deleteNotebook(deleteTarget.id);
                  setNotebookDialogOpen(false);
                } else {
                  void deleteNote(deleteTarget.id);
                  setNoteDialog(EMPTY_NOTE_DIALOG);
                }

                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error ? (
        <div className="fixed bottom-24 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-[#ffdad6] bg-white px-4 py-3 shadow-[0_20px_40px_rgba(45,42,39,0.08)]">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#2d2a27]">Something needs attention</div>
            <div className="mt-1 text-sm leading-6 text-[#6b6560]">{error}</div>
          </div>
          <Button variant="ghost" className="h-auto px-0 py-0 text-xs" onClick={clearError}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}
