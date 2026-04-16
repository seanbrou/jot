import { useMemo } from "react";
import clsx from "clsx";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { NOTEBOOK_COLORS } from "../lib/constants";
import type { Notebook, NotebookDraft } from "../lib/types";

export function NotebookDialog({
  open,
  onOpenChange,
  editing,
  editingNotebookId,
  draft,
  onDraftChange,
  onSubmit,
  onDelete,
  syncing,
  existingNotebooks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  editingNotebookId: string | null;
  draft: NotebookDraft;
  onDraftChange: (draft: NotebookDraft) => void;
  onSubmit: () => Promise<void>;
  onDelete?: () => void;
  syncing: boolean;
  existingNotebooks: Notebook[];
}) {
  const duplicateName = useMemo(() => {
    const name = draft.name.trim().toLowerCase();
    if (!name) return false;
    return existingNotebooks.some(
      (n) =>
        n.name.trim().toLowerCase() === name &&
        (!editingNotebookId || n.id !== editingNotebookId),
    );
  }, [draft.name, existingNotebooks, editingNotebookId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[380px] gap-0 overflow-hidden border-[#ece4dc] p-0 shadow-2xl sm:max-w-none">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full transition-colors"
              style={{ backgroundColor: draft.color }}
            />
            <DialogTitle className="text-[15px] font-semibold tracking-tight text-[#2d2a27]">
              {editing ? "Edit notebook" : "New notebook"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-3 px-5 pb-2">
          {/* Name */}
          <Input
            value={draft.name}
            onChange={(e) =>
              onDraftChange({ ...draft, name: e.currentTarget.value })
            }
            placeholder="Notebook name…"
            autoFocus
            className={clsx(
              "h-9 border-[#ece4dc] bg-[#faf7f5] text-[13px] font-medium focus:bg-white",
              duplicateName && "border-[#ba1a1a] focus-visible:ring-[#ba1a1a]/30",
            )}
          />
          {duplicateName && (
            <p className="-mt-2 text-[11px] text-[#ba1a1a]">
              Name already exists.
            </p>
          )}

          {/* Description */}
          <Textarea
            value={draft.description}
            onChange={(e) =>
              onDraftChange({ ...draft, description: e.currentTarget.value })
            }
            placeholder="What belongs here? Helps AI sort…"
            className="min-h-[56px] resize-none border-[#ece4dc] bg-[#faf7f5] text-[12px] placeholder:text-[#b5aea8] focus:bg-white"
          />

          {/* Color */}
          <div className="flex items-center gap-1.5">
            {NOTEBOOK_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                  draft.color === color
                    ? "scale-110 ring-2 ring-[#2d2a27] ring-offset-2 ring-offset-white"
                    : "opacity-50 hover:opacity-100",
                )}
                style={{ backgroundColor: color }}
                onClick={() => onDraftChange({ ...draft, color })}
              >
                {draft.color === color && (
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t border-[#f0ece8] bg-[#faf7f5] px-5 py-2.5">
          {editing && onDelete ? (
            <Button
              variant="ghost"
              className="h-8 px-2 text-[#b5aea8] hover:text-[#ba1a1a] hover:bg-[#fff3ee]"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-8 px-3 text-[12px] text-[#8c857f]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8 px-4 text-[12px] font-medium"
              onClick={() => void onSubmit()}
              disabled={syncing || !draft.name.trim()}
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
