import { useState } from "react";
import clsx from "clsx";
import {
  Archive,
  LayoutGrid,
  Loader2,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  ListOrdered,
} from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const viewerName = snapshot.viewer?.name?.trim() || "Sean";
  const firstName = viewerName.split(/\s+/)[0] || "Sean";

  function openCreateNotebook() {
    if (!isAuthenticated) return;
    setEditingNotebookId(null);
    setNotebookDraft(DEFAULT_NOTEBOOK_DRAFT);
    setNotebookDialogOpen(true);
  }

  function openNotebookEditor(notebookId: string) {
    if (!isAuthenticated) return;
    const notebook = snapshot.notebooks.find((entry) => entry.id === notebookId);
    if (!notebook) return;
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
    if (!isAuthenticated) return;
    setNoteDialog({
      open: true,
      noteId: null,
      body: "",
      notebookId,
      useAiRouting: true,
    });
  }

  async function openEditNote(note: Note) {
    if (!isAuthenticated) return;
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
      // noop
    } finally {
      setLoadingNoteDetail(false);
    }
  }

  function openAccountPanel() {
    if (!isAuthenticated) return;
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
    if (!trimmed) return;
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
    if (!note || !targetColumnId || getColumnIdFromNote(note) === targetColumnId) return;
    if (targetColumnId === "archive") {
      await setNoteArchived(noteId, true);
      return;
    }
    if (note.archived) {
      await setNoteArchived(noteId, false);
    }
    await moveNote(noteId, targetColumnId === "inbox" ? null : targetColumnId);
  }

  const navItems = [
    { id: "board" as BoardView, label: "Board", icon: LayoutGrid },
    { id: "timeline" as BoardView, label: "Timeline", icon: ListOrdered },
    { id: "archive" as BoardView, label: "Archive", icon: Archive },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf7f5] font-body text-[#2d2a27]">
      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          "relative flex flex-col border-r border-[#e8e2dc] bg-white transition-all duration-200",
          sidebarCollapsed ? "w-[52px]" : "w-[220px]",
        )}
      >
        {/* Collapse toggle pill — top-right edge */}
        <button
          type="button"
          className={clsx(
            "absolute -right-3 top-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-[#e8e2dc] bg-white text-[#8c857f] shadow-sm transition-all hover:border-[#b35c2a] hover:text-[#b35c2a]",
            sidebarCollapsed && "left-1/2 -ml-3 -right-auto top-2",
          )}
          onClick={() => setSidebarCollapsed((v) => !v)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {sidebarCollapsed
              ? <path d="M9 18l6-6-6-6" />
              : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>

        {/* Click outside edge to collapse (when expanded) */}
        {!sidebarCollapsed && (
          <div
            className="absolute -right-2 top-0 z-20 h-full w-4 cursor-col-resize"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        {/* Click right edge to expand (when collapsed) */}
        {sidebarCollapsed && (
          <div
            className="absolute inset-y-0 -right-1 z-20 w-3 cursor-col-resize rounded-r-md transition-colors hover:bg-[#f7f4f0]"
            onClick={() => setSidebarCollapsed(false)}
          />
        )}

        {/* Logo */}
        <div className="flex h-14 items-center border-b border-[#f0ece8] px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#b35c2a] text-[11px] font-bold text-white">
              J
            </div>
            {!sidebarCollapsed && (
              <span className="text-[15px] font-bold tracking-tight text-[#2d2a27]">
                Jot
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={clsx(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-[#b35c2a]/10 text-[#b35c2a]"
                    : "text-[#6b6560] hover:bg-[#f7f4f0] hover:text-[#2d2a27]",
                )}
                onClick={() => setActiveView(item.id)}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div className="my-3 border-t border-[#f0ece8]" />

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[#6b6560] transition-colors hover:bg-[#f7f4f0] hover:text-[#2d2a27]"
            onClick={openCreateNotebook}
          >
            <NotebookPen className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {!sidebarCollapsed && <span>New notebook</span>}
          </button>
        </nav>

        {/* User */}
        <div className="border-t border-[#f0ece8] px-2 py-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#f7f4f0]"
            onClick={openAccountPanel}
          >
            <div className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#ede8e3]">
              {snapshot.viewer?.image ? (
                <img src={snapshot.viewer.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#6b6560]">
                  {(snapshot.viewer?.name ?? "J").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-[#2d2a27]">
                  {snapshot.viewer?.name ?? "Guest"}
                </div>
                <div className="truncate text-[11px] text-[#8c857f]">
                  {pendingCount > 0 ? `${pendingCount} pending` : "All caught up"}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#e8e2dc] bg-white px-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b5aea8]" />
              <input
                className="w-56 rounded-lg border border-[#e8e2dc] bg-[#faf7f5] py-1.5 pl-9 pr-3 text-[13px] text-[#2d2a27] outline-none transition-all placeholder:text-[#b5aea8] focus:w-72 focus:border-[#d4cec8] focus:bg-white focus:shadow-sm"
                placeholder="Search notes…"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-[#b35c2a] px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-[#9a4f22] active:scale-[0.97]"
              onClick={() => openCreateNote(null)}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New note
            </button>
          </div>
        </header>

        {/* Board content */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden p-5">
          {/* Board header — only show on board view */}
          {activeView === "board" && (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#2d2a27]">
                  Good to see you, {firstName}
                </h2>
                <p className="mt-0.5 text-[13px] text-[#8c857f]">
                  Drag notes between columns to organize.
                </p>
              </div>
            </div>
          )}

          {activeView === "timeline" && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-[#2d2a27]">
                Timeline
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8c857f]">
                All your notes, organized by day.
              </p>
            </div>
          )}

          {activeView === "archive" && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-[#2d2a27]">
                Archive
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8c857f]">
                Archived notes you can restore anytime.
              </p>
            </div>
          )}

          {!authReady || loading ? (
            <div className="flex h-[calc(100vh-10rem)] items-center justify-center text-[#8c857f]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading…
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
              onDeleteNote={(note) =>
                setDeleteTarget({
                  type: "note",
                  id: note.id,
                  label: note.suggestedTitle || note.title,
                })
              }
              onDeleteNotebook={(notebook) =>
                setDeleteTarget({
                  type: "notebook",
                  id: notebook.id,
                  label: notebook.name,
                })
              }
            />
          )}
        </main>
      </div>

      {/* ── Dialogs ── */}
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
                  setDeleteTarget({ type: "note", id: note.id, label: note.suggestedTitle || note.title });
                }
              }
            : undefined
        }
        onReclassify={
          noteDialog.noteId
            ? () => {
                const noteId = noteDialog.noteId;
                if (!noteId) return;
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
                  setDeleteTarget({ type: "notebook", id: notebook.id, label: notebook.name });
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
                ? `Deleting "${deleteTarget.label}" moves its notes back to Inbox.`
                : `Deleting "${deleteTarget?.label ?? "this note"}" removes it permanently.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
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

      {error && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-[#ffdad6] bg-white p-4 shadow-lg">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b35c2a]" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-[#2d2a27]">Attention needed</div>
            <div className="mt-0.5 text-[13px] leading-5 text-[#6b6560]">{error}</div>
          </div>
          <Button variant="ghost" className="h-auto shrink-0 px-1 py-0 text-xs" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
