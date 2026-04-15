import { useMemo, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Archive, MoreHorizontal, Pin, Plus } from "lucide-react";
import { INBOX_NOTEBOOK_ID, STATUS_LABELS } from "../lib/constants";
import type { BoardView, Notebook, Note } from "../lib/types";

type ColumnDefinition = {
  id: string;
  title: string;
  count: string;
  dotColor: string;
  notes: Note[];
  dimmed?: boolean;
  canAdd?: boolean;
  onAdd?: () => void;
  onMenu?: () => void;
};

function formatRelativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function createCollisionDetection(columnIds: string[]): CollisionDetection {
  return (args) => {
    const within = pointerWithin(args);

    // Check for card-level collisions first (for insertion ordering)
    const overCard = within.find(
      (entry) => !columnIds.includes(String(entry.id)),
    );
    if (overCard) {
      return [overCard];
    }

    const overColumn = within.find((entry) =>
      columnIds.includes(String(entry.id)),
    );
    if (overColumn) {
      return [overColumn];
    }

    return closestCorners(args).filter((entry) =>
      columnIds.includes(String(entry.id)),
    );
  };
}

function getColumnIdFromNote(note: Note) {
  return note.archived ? "archive" : note.notebookId ?? INBOX_NOTEBOOK_ID;
}

function StatusBadge({ note }: { note: Note }) {
  const statusLabel = STATUS_LABELS[note.aiStatus];

  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
          note.aiStatus === "sorted" && "bg-[#b35c2a]/10 text-[#b35c2a]",
          note.aiStatus === "pending" && "bg-[#f3efeb] text-[#8c857f]",
          note.aiStatus === "review" && "bg-[#efe6da] text-[#7a5c40]",
          note.aiStatus === "failed" && "bg-[#ffdad6] text-[#93000a]",
        )}
      >
        {statusLabel}
      </span>
      {note.aiConfidence !== null ? (
        <span className="text-[10px] font-medium text-[#b5aea8]">
          {Math.round(note.aiConfidence * 100)}%
        </span>
      ) : null}
    </div>
  );
}

function DragStrip({ muted = false, isActive = false }: { muted?: boolean; isActive?: boolean }) {
  return (
    <div
      className={clsx(
        "mt-3 -mx-4 -mb-4 flex h-0 items-center justify-center gap-[3px] overflow-hidden rounded-b-xl border-t border-dashed border-transparent transition-all duration-200 ease-out pointer-events-none",
        "opacity-0",
        "group-hover/card:h-7 group-hover/card:opacity-100",
        isActive && "h-7 opacity-100",
        muted
          ? "bg-[#f0ece7] group-hover/card:border-[#d4cec8]/60 group-hover/card:bg-[#f0ece7]"
          : "bg-[#f7f3ef] group-hover/card:border-[#e0d9d2] group-hover/card:bg-[#f7f3ef]",
        isActive &&
        (muted
          ? "border-[#d4cec8]/60 bg-[#f0ece7]"
          : "border-[#e0d9d2] bg-[#f7f3ef]"),
      )}
    >
      <span className={clsx("block h-1 w-1 rounded-full", muted ? "bg-[#c4bdb6]" : "bg-[#c9c1b9]")} />
      <span className={clsx("block h-1 w-1 rounded-full", muted ? "bg-[#c4bdb6]" : "bg-[#c9c1b9]")} />
      <span className={clsx("block h-1 w-1 rounded-full", muted ? "bg-[#c4bdb6]" : "bg-[#c9c1b9]")} />
    </div>
  );
}

function Column({
  column,
  children,
  isDragActive,
}: {
  column: ColumnDefinition;
  children: ReactNode;
  isDragActive: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex h-full min-h-0 w-72 flex-col rounded-2xl p-2 transition-all duration-200 -m-2",
        column.dimmed && !isOver && "opacity-50 hover:opacity-100",
        isDragActive && !isOver && "opacity-80",
        isOver &&
        "bg-[#b35c2a]/[0.04] ring-2 ring-[#b35c2a]/20 ring-offset-2 ring-offset-transparent",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={clsx("h-2 w-2 rounded-full", column.dotColor, isOver && "!bg-[#b35c2a]")} />
          <h3 className="font-headline text-[11px] font-semibold uppercase tracking-widest text-[#2d2a27]">
            {column.title}
          </h3>
          <span className="rounded-full bg-[#ede8e3] px-1.5 py-0.5 text-[10px] font-semibold text-[#8c857f]">
            {column.count}
          </span>
        </div>
        <button
          type="button"
          className="cursor-pointer text-[#b5aea8] hover:text-[#2d2a27]"
          onClick={column.onMenu}
          disabled={!column.onMenu}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1">
        {children}
        {column.canAdd ? (
          <button
            type="button"
            onClick={column.onAdd}
            className="cursor-pointer rounded-xl border border-dashed border-[#d4cec8] p-3.5 text-[#b5aea8] transition-all hover:border-[#b35c2a] hover:text-[#b35c2a]"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Add Item</span>
            </div>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BoardNoteCardBody({
  note,
  dragStripActive,
  headerActions,
  onArchiveToggle,
  onPinnedToggle,
}: {
  note: Note;
  dragStripActive: boolean;
  headerActions: "interactive" | "overlay";
  onArchiveToggle?: (note: Note) => void;
  onPinnedToggle?: (note: Note) => void;
}) {
  const pinArchive = (
    <div className="flex items-center gap-1">
      {headerActions === "interactive" ? (
        <>
          <button
            type="button"
            className={clsx(
              "rounded-full p-1.5 transition hover:bg-[#f3efeb]",
              note.pinned ? "text-[#b35c2a]" : "text-[#b5aea8]",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onPinnedToggle?.(note);
            }}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 text-[#b5aea8] transition hover:bg-[#f3efeb] hover:text-[#2d2a27]"
            onClick={(event) => {
              event.stopPropagation();
              onArchiveToggle?.(note);
            }}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span
            className={clsx(
              "inline-flex rounded-full p-1.5",
              note.pinned ? "text-[#b35c2a]" : "text-[#b5aea8]",
            )}
            aria-hidden
          >
            <Pin className="h-3.5 w-3.5" />
          </span>
          <span className="inline-flex rounded-full p-1.5 text-[#b5aea8]" aria-hidden>
            <Archive className="h-3.5 w-3.5" />
          </span>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <StatusBadge note={note} />
          <div className="text-[10px] font-medium text-[#b5aea8]">{formatRelativeTime(note.updatedAt)}</div>
        </div>
        {pinArchive}
      </div>

      <p className="mb-1.5 text-[13px] font-semibold leading-snug text-[#2d2a27]">
        {note.suggestedTitle || note.title}
      </p>
      <p className="line-clamp-4 text-xs leading-6 text-[#8c857f]">{note.body}</p>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#b5aea8]">
        <div>{note.source.replace(/-/g, " ")}</div>
        <div className="uppercase tracking-[0.14em]">
          {note.archived ? "Archived" : "Open"}
        </div>
      </div>
      <DragStrip muted={note.archived} isActive={dragStripActive} />
    </>
  );
}

function SortableNoteCard({
  note,
  onOpen,
  onArchiveToggle,
  onPinnedToggle,
}: {
  note: Note;
  onOpen: (note: Note) => void;
  onArchiveToggle: (note: Note) => void;
  onPinnedToggle: (note: Note) => void;
}) {
  const dragJustEndedRef = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
  });

  const wasDraggingRef = useRef(false);
  if (isDragging) wasDraggingRef.current = true;
  if (!isDragging && wasDraggingRef.current) {
    wasDraggingRef.current = false;
    dragJustEndedRef.current = true;
    requestAnimationFrame(() => { dragJustEndedRef.current = false; });
  }

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "group/card relative z-0 shrink-0 cursor-pointer overflow-hidden rounded-xl border p-4 transition-shadow duration-200 hover:z-10 touch-none",
        note.archived
          ? "border-dashed border-[#d4cec8]/60 bg-[#f7f4f0]"
          : "border-[#e8e2dc]/60 bg-white hover:shadow-md",
        isDragging && "!opacity-0 !shadow-none !border-transparent !bg-transparent pointer-events-none",
      )}
      onClick={() => {
        if (dragJustEndedRef.current) return;
        onOpen(note);
      }}
    >
      <BoardNoteCardBody
        note={note}
        dragStripActive={isDragging}
        headerActions="interactive"
        onArchiveToggle={onArchiveToggle}
        onPinnedToggle={onPinnedToggle}
      />
    </div>
  );
}

function OverlayCard({ note }: { note: Note }) {
  return (
    <div
      className={clsx(
        "pointer-events-none overflow-hidden rounded-xl border p-4",
        note.archived
          ? "border-dashed border-[#d4cec8]/60 bg-[#f7f4f0]"
          : "border-[#e8e2dc]/60 bg-white shadow-2xl shadow-[#b35c2a]/10 ring-1 ring-[#b35c2a]/20",
      )}
      style={{ cursor: "grabbing" }}
    >
      <BoardNoteCardBody note={note} dragStripActive headerActions="overlay" />
    </div>
  );
}

function TimelineView({
  notes,
  onOpen,
}: {
  notes: Note[];
  onOpen: (note: Note) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-[#d4cec8] bg-white p-10 text-center text-sm text-[#8c857f]">
        No notes matched this view yet.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex h-[calc(100vh-10rem)] flex-col gap-3 overflow-y-auto overscroll-y-contain pr-2">
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          className="rounded-[1.4rem] border border-[#e8e2dc] bg-white p-5 text-left shadow-sm transition hover:border-[#d4cec8]"
          onClick={() => onOpen(note)}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c857f]">
                {formatRelativeTime(note.updatedAt)}
              </div>
              <div className="text-lg font-semibold text-[#2d2a27]">
                {note.suggestedTitle || note.title}
              </div>
              <div className="mt-2 line-clamp-3 text-sm leading-7 text-[#6b6560]">{note.body}</div>
            </div>
            <StatusBadge note={note} />
          </div>
        </button>
      ))}
    </div>
  );
}

function buildColumns(
  notebooks: Notebook[],
  activeNotes: Note[],
  archivedNotes: Note[],
  openCreateNote: (notebookId: string | null) => void,
  openNotebookEditor: (notebook: Notebook) => void,
): ColumnDefinition[] {
  const notesByNotebookId = new Map<string | null, Note[]>();
  notesByNotebookId.set(null, []);

  for (const note of activeNotes) {
    const key = note.notebookId;
    const bucket = notesByNotebookId.get(key) ?? [];
    bucket.push(note);
    notesByNotebookId.set(key, bucket);
  }

  const inboxNotes = notesByNotebookId.get(null) ?? [];

  return [
    {
      id: INBOX_NOTEBOOK_ID,
      title: "Inbox",
      count: inboxNotes.length.toString().padStart(2, "0"),
      dotColor: "bg-[#b35c2a]",
      notes: inboxNotes,
      canAdd: true,
      onAdd: () => openCreateNote(null),
    },
    ...notebooks.map((notebook) => ({
      id: notebook.id,
      title: notebook.name,
      count: (notesByNotebookId.get(notebook.id) ?? []).length
        .toString()
        .padStart(2, "0"),
      dotColor: "bg-[#9a7b5c]",
      notes: notesByNotebookId.get(notebook.id) ?? [],
      canAdd: true,
      onAdd: () => openCreateNote(notebook.id),
      onMenu: () => openNotebookEditor(notebook),
    })),
    {
      id: "archive",
      title: "Archive",
      count: archivedNotes.length.toString().padStart(2, "0"),
      dotColor: "bg-[#b5aea8]",
      notes: archivedNotes,
      dimmed: true,
    },
  ];
}

export function NotesBoard({
  activeView,
  notebooks,
  activeNotes,
  archivedNotes,
  onOpenNote,
  onCreateNote,
  onEditNotebook,
  onMoveNote,
  onTogglePinned,
  onToggleArchived,
}: {
  activeView: BoardView;
  notebooks: Notebook[];
  activeNotes: Note[];
  archivedNotes: Note[];
  onOpenNote: (note: Note) => void;
  onCreateNote: (notebookId: string | null) => void;
  onEditNotebook: (notebook: Notebook) => void;
  onMoveNote: (noteId: string, columnId: string | null) => Promise<void>;
  onTogglePinned: (note: Note) => void;
  onToggleArchived: (note: Note) => void;
}) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Note[]>(() => [...activeNotes, ...archivedNotes]);

  // Build a fingerprint of external data so we only reset localNotes when
  // the backend data genuinely changes (not on every drag-end).
  const externalFingerprint = useMemo(
    () =>
      [...activeNotes, ...archivedNotes]
        .map((n) => `${n.id}:${n.notebookId ?? ""}:${n.archived}`)
        .sort()
        .join(","),
    [activeNotes, archivedNotes],
  );
  const prevFingerprintRef = useRef(externalFingerprint);

  useEffect(() => {
    // During an active drag, never reset (optimistic state is in control).
    if (activeDragId !== null) return;
    // Only reset when the backend data actually changed.
    if (externalFingerprint !== prevFingerprintRef.current) {
      prevFingerprintRef.current = externalFingerprint;
      setLocalNotes([...activeNotes, ...archivedNotes]);
    }
  }, [externalFingerprint, activeDragId, activeNotes, archivedNotes]);

  // Also sync on first mount
  useEffect(() => {
    prevFingerprintRef.current = externalFingerprint;
    setLocalNotes([...activeNotes, ...archivedNotes]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(() => {
    const active = localNotes.filter((n) => !n.archived);
    const archived = localNotes.filter((n) => n.archived);
    return buildColumns(notebooks, active, archived, onCreateNote, onEditNotebook);
  }, [localNotes, notebooks, onCreateNote, onEditNotebook]);

  const notesById = useMemo(
    () => new Map(localNotes.map((note) => [note.id, note])),
    [localNotes],
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const collisionDetection = createCollisionDetection(columnIds);
  const activeNote = activeDragId ? notesById.get(activeDragId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overId = over?.id;

      if (!overId || active.id === overId) return;

      setLocalNotes((prev) => {
        const activeIndex = prev.findIndex((n) => n.id === active.id);
        const overIndex = prev.findIndex((n) => n.id === overId);

        if (activeIndex === -1) return prev;

        const activeNote = prev[activeIndex];
        let newColumnId: string | null = activeNote.notebookId;
        let isArchived = activeNote.archived;

        if (columnIds.includes(String(overId))) {
          if (overId === "archive") {
            isArchived = true;
          } else {
            isArchived = false;
            newColumnId = overId === INBOX_NOTEBOOK_ID ? null : String(overId);
          }
        } else if (overIndex !== -1) {
          const overNote = prev[overIndex];
          isArchived = overNote.archived;
          newColumnId = overNote.notebookId;
        }

        // Determine if the card is actually changing columns
        const currentCol = activeNote.archived ? "archive" : activeNote.notebookId ?? INBOX_NOTEBOOK_ID;
        const targetCol = isArchived ? "archive" : newColumnId ?? INBOX_NOTEBOOK_ID;
        const isChangingColumn = currentCol !== targetCol;

        const updatedNote = { ...activeNote, notebookId: newColumnId, archived: isArchived };
        const nextNotes = [...prev];
        nextNotes[activeIndex] = updatedNote;

        // Over a specific card → reorder to that card's position
        if (overIndex !== -1 && activeIndex !== overIndex) {
          return arrayMove(nextNotes, activeIndex, overIndex);
        }

        // Over a column's empty space AND actually changing columns →
        // place at the bottom of that column's cards.
        // The isChangingColumn guard prevents infinite oscillation when
        // the card is already in the target column.
        if (isChangingColumn && columnIds.includes(String(overId))) {
          const targetColId = String(overId);
          // Find the last note in the target column (excluding the active card)
          let lastIndexInCol = -1;
          for (let i = nextNotes.length - 1; i >= 0; i--) {
            if (i === activeIndex) continue;
            const n = nextNotes[i];
            const col = n.archived ? "archive" : n.notebookId ?? INBOX_NOTEBOOK_ID;
            if (col === targetColId) { lastIndexInCol = i; break; }
          }
          if (lastIndexInCol !== -1) {
            return arrayMove(nextNotes, activeIndex, lastIndexInCol);
          }
        }

        return nextNotes;
      });
    },
    [columnIds],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      // Snapshot the optimistic fingerprint so the backend confirmation
      // doesn't reset our local card ordering.
      prevFingerprintRef.current = localNotes
        .map((n) => `${n.id}:${n.notebookId ?? ""}:${n.archived}`)
        .sort()
        .join(",");

      setActiveDragId(null);
      if (!event.over) return;

      const activeNoteFound = localNotes.find((n) => n.id === event.active.id);
      if (activeNoteFound) {
        const targetColumn = getColumnIdFromNote(activeNoteFound);
        void onMoveNote(String(event.active.id), targetColumn);
      }
    },
    [localNotes, onMoveNote],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    // Revert optimistic changes on cancel
    setLocalNotes([...activeNotes, ...archivedNotes]);
  }, [activeNotes, archivedNotes]);

  if (activeView === "timeline") {
    return <TimelineView notes={activeNotes} onOpen={onOpenNote} />;
  }

  if (activeView === "archive") {
    const archiveColumn = columns[columns.length - 1];
    return (
      <div className="flex h-[calc(100vh-10rem)] min-h-0 gap-5 overflow-x-auto overscroll-x-contain pb-4">
        <Column column={archiveColumn} isDragActive={false}>
          {archiveColumn.notes.map((note) => (
            <SortableNoteCard
              key={note.id}
              note={note}
              onOpen={onOpenNote}
              onArchiveToggle={onToggleArchived}
              onPinnedToggle={onTogglePinned}
            />
          ))}
        </Column>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-[calc(100vh-10rem)] min-h-0 min-w-max gap-5 overflow-x-auto overscroll-x-contain pb-4">
        {columns.map((column) => {
          const noteIds = column.notes.map((note) => note.id);
          return (
            <SortableContext
              key={column.id}
              items={noteIds}
              strategy={verticalListSortingStrategy}
            >
              <Column column={column} isDragActive={activeDragId !== null}>
                {column.notes.map((note) => (
                  <SortableNoteCard
                    key={note.id}
                    note={note}
                    onOpen={onOpenNote}
                    onArchiveToggle={onToggleArchived}
                    onPinnedToggle={onTogglePinned}
                  />
                ))}
              </Column>
            </SortableContext>
          );
        })}
      </div>

      {/* Portal the DragOverlay to document.body so position:fixed
          is relative to the viewport, not to any scrollable parent
          container (which would offset the overlay). */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeNote ? <OverlayCard note={activeNote} /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

export { getColumnIdFromNote };
