import { Pencil, Clock3, Paperclip, Star, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { formatRelativeTime } from "../lib/format";
import type { Note, Notebook } from "../lib/types";

export interface NoteViewState {
  open: boolean;
  note: Note | null;
}

export function NoteViewDialog({
  state,
  notebooks,
  onOpenChange,
  onEdit,
  onDelete,
  onTogglePinned,
}: {
  state: NoteViewState;
  notebooks: Notebook[];
  onOpenChange: (open: boolean) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
}) {
  const note = state.note;
  if (!note) return null;

  const notebook = notebooks.find((nb) => nb.id === note.notebookId);
  const accent = notebook?.color ?? "#9ca3af";

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-[#e8e2dc] p-0 shadow-xl sm:max-w-lg">
        {/* Header */}
        <div className="border-b border-[#f0ece8] bg-white px-6 pt-5 pb-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 mb-1.5">
              {notebook ? (
                <span
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ backgroundColor: `${accent}1a`, color: accent }}
                >
                  {notebook.name}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] bg-[#f0ece8] text-[#8c857f]">
                  Inbox
                </span>
              )}
              {note.pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#b35c2a]">
                  <Star className="h-3 w-3 fill-[#b35c2a]" />
                  Pinned
                </span>
              )}
            </div>
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#2d2a27]">
              {note.suggestedTitle ?? "Note"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#8c857f]">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatRelativeTime(note.updatedAt)}
              </span>
              <span className="mx-2 text-[#d4cec8]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                {note.source}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body — read-only */}
        <div className="bg-white px-6 py-5 max-h-[50vh] overflow-y-auto">
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#2d2a27]">
            {note.body}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-[#f0ece8] bg-[#faf7f5] px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto text-[#8c857f] hover:text-[#ba1a1a]"
            onClick={() => onDelete(note)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#8c857f]"
            onClick={() => onTogglePinned(note)}
          >
            <Star className={`mr-1.5 h-3.5 w-3.5 ${note.pinned ? "fill-[#b35c2a] text-[#b35c2a]" : ""}`} />
            {note.pinned ? "Unpin" : "Pin"}
          </Button>
          <Button className="text-[13px]" onClick={() => onEdit(note)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}