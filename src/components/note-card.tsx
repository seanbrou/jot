import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import {
  ArrowUpRight,
  Clock3,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { EXPORT_TARGETS } from "../lib/constants";
import { formatRelativeTime, summarizeNoteTitle } from "../lib/format";
import type { Note, Notebook } from "../lib/types";

interface NoteCardProps {
  note: Note;
  notebook: Notebook | null;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onTogglePinned: () => void;
  onReclassify: () => void;
  onExport: (targetId: string) => void;
}

function DecorativeMedia({ accent }: { accent: string }) {
  return (
    <div
      className="relative mb-4 h-40 overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(180deg, ${accent}22 0%, ${accent}55 100%)`,
      }}
    >
      <div
        className="absolute top-0 h-full rotate-[14deg] opacity-50"
        style={{
          left: "2rem",
          right: "2rem",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.44), rgba(255,255,255,0))",
        }}
      />
      <div
        className="absolute top-0 h-full rotate-[14deg]"
        style={{
          left: "4.5rem",
          right: "4.5rem",
          background:
            "linear-gradient(180deg, rgba(45,42,39,0.7), rgba(45,42,39,0.08))",
        }}
      />
      <div
        className="absolute top-0 h-full rotate-[14deg]"
        style={{
          left: "7rem",
          right: "7rem",
          background:
            "linear-gradient(180deg, rgba(45,42,39,0.8), rgba(45,42,39,0.12))",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,rgba(45,42,39,0),rgba(45,42,39,0.35))]" />
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#2d2a27] shadow-sm backdrop-blur">
        <ImageIcon className="h-3.5 w-3.5" />
        Visual study
      </div>
    </div>
  );
}

export function NoteCard({
  note,
  notebook,
  index,
  selected,
  onSelect,
  onEdit,
  onTogglePinned,
  onReclassify,
  onExport,
}: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = notebook?.color ?? "#9ca3af";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note:${note.id}`,
  });

  const variant = useMemo(() => {
    if (note.pinned || index % 5 === 1) {
      return "media";
    }

    if (note.aiStatus === "pending") {
      return "progress";
    }

    if (note.aiStatus === "failed" || note.aiStatus === "review") {
      return "muted";
    }

    return "standard";
  }, [index, note.aiStatus, note.pinned]);

  const confidenceWidth = `${Math.max(14, Math.round((note.aiConfidence ?? 0.52) * 100))}%`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={clsx(
        "group relative rounded-3xl bg-white p-5 text-[#2d2a27] shadow-[0_12px_32px_rgba(45,42,39,0.06)] transition-all duration-200 overflow-hidden",
        selected && "ring-2 ring-[#b35c2a]/15",
        isDragging && "opacity-60",
        variant === "muted" && "bg-[#f7f4f0] text-[#8c857f]",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: `${accent}1a`,
                color: accent,
              }}
            >
              {notebook ? notebook.name : "Inbox"}
            </span>
            {note.aiStatus === "pending" ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ba1a1a]">
                Sorting
              </span>
            ) : null}
          </div>
          <button type="button" onClick={onSelect} className="text-left">
            <div
              className={clsx(
                "text-[13px] font-bold leading-tight text-[#2d2a27]",
                variant === "muted" && "text-[#7b7d87]",
                variant === "progress" && "text-[15px]",
                variant === "media" && "text-[16px]",
              )}
            >
              {note.suggestedTitle ?? summarizeNoteTitle(note.body)}
            </div>
          </button>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="rounded-full p-1.5 text-[#b5aea8] transition hover:bg-[#f3efeb] hover:text-[#2d2a27]"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePinned();
            }}
            className={clsx(
              "rounded-full p-1.5 transition",
              note.pinned
                ? "bg-[#b35c2a] text-white"
                : "text-[#b5aea8] hover:bg-[#f3efeb] hover:text-[#2d2a27]",
            )}
          >
            <Star className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="rounded-full p-1.5 text-[#b5aea8] transition hover:bg-[#f3efeb] hover:text-[#2d2a27]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl bg-white p-2 shadow-[0_18px_48px_rgba(45,42,39,0.10)] ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onReclassify();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#6b6560] transition hover:bg-[#f7f4f0] hover:text-[#2d2a27]"
              >
                <WandSparkles className="h-4 w-4" />
                Re-sort note
              </button>

              <div className="group/export relative">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-[#6b6560] transition hover:bg-[#f7f4f0] hover:text-[#2d2a27]"
                >
                  <span className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Export to
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 rotate-45 text-[#d4cec8]" />
                </button>

                <div className="absolute left-full top-0 hidden w-40 translate-x-2 rounded-2xl bg-white p-2 shadow-[0_18px_48px_rgba(45,42,39,0.10)] ring-1 ring-black/5 group-hover/export:block">
                  {EXPORT_TARGETS.map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onExport(target.id);
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#6b6560] transition hover:bg-[#f7f4f0] hover:text-[#2d2a27]"
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {variant === "media" ? <DecorativeMedia accent={accent} /> : null}

      <button type="button" onClick={onSelect} className="block w-full text-left">
        <p
          className={clsx(
            "text-sm leading-6 text-[#6b6560]",
            variant === "muted" && "text-[#b5aea8]",
          )}
        >
          {note.body}
        </p>
      </button>

      {variant === "progress" ? (
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ede8e3]">
            <div
              className="h-full rounded-full bg-[#b35c2a] transition-[width]"
              style={{ width: confidenceWidth }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between text-[11px] text-[#b5aea8]">
        {variant === "media" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              12
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {note.aiConfidence !== null
                ? `${Math.round(note.aiConfidence * 100)}%`
                : "Review"}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeTime(note.updatedAt)}
            </div>
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              {note.source}
            </div>
          </div>
        )}

        {variant === "standard" || variant === "muted" ? (
          <div className="flex -space-x-1">
            <span className="h-6 w-6 rounded-full border-2 border-white bg-[#d4cec8]" />
            <span className="h-6 w-6 rounded-full border-2 border-white bg-[#f0e6d9]" />
          </div>
        ) : null}
      </div>

      <div 
        className={clsx(
          "mt-5 -mx-5 -mb-5 h-0 overflow-hidden transition-all duration-200 ease-out",
          "group-hover:h-7 cursor-grab active:cursor-grabbing",
          "flex items-center justify-center gap-[3px]",
          "border-t border-dashed border-transparent",
          variant === "muted"
            ? "group-hover:border-[#d4cec8]/60 bg-[#f0ece7]"
            : "group-hover:border-[#e0d9d2] bg-[#f7f3ef]",
          "rounded-b-3xl"
        )}
        {...listeners}
        {...attributes}
      >
        <span className="block w-1 h-1 rounded-full bg-[#c9c1b9] opacity-0 transition-opacity duration-200 delay-75 group-hover:opacity-100" />
        <span className="block w-1 h-1 rounded-full bg-[#c9c1b9] opacity-0 transition-opacity duration-200 delay-100 group-hover:opacity-100" />
        <span className="block w-1 h-1 rounded-full bg-[#c9c1b9] opacity-0 transition-opacity duration-200 delay-125 group-hover:opacity-100" />
      </div>
    </div>
  );
}
