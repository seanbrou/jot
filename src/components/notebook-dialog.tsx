import { useMemo } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NOTEBOOK_COLORS } from "../lib/constants";
import type { Notebook, NotebookDraft } from "../lib/types";

function NotebookColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {NOTEBOOK_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={clsx(
            "h-9 w-9 rounded-full border-2 transition",
            value === color ? "border-[#2d2a27] scale-105" : "border-transparent",
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

function BoardColumnPreview({ draft }: { draft: NotebookDraft }) {
  const title = draft.name.trim() || "Notebook name";
  const desc = draft.description.trim();
  return (
    <div className="rounded-xl border border-[#e8e2dc] bg-[#faf7f5] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8c857f]">
        Board preview
      </div>
      <div className="rounded-lg border border-[#e8e2dc]/80 bg-white px-2 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: draft.color }}
          />
          <h3 className="font-headline text-[11px] font-semibold uppercase tracking-widest text-[#2d2a27]">
            {title}
          </h3>
          <span className="rounded-full bg-[#ede8e3] px-1.5 py-0.5 text-[10px] font-semibold text-[#8c857f]">
            00
          </span>
        </div>
        {desc ? (
          <p className="mt-1.5 line-clamp-2 border-t border-[#f0ece8] pt-1.5 text-[10px] leading-relaxed text-[#6b6560]">
            {desc}
          </p>
        ) : null}
      </div>
    </div>
  );
}

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
    if (!name) {
      return false;
    }

    return existingNotebooks.some(
      (n) =>
        n.name.trim().toLowerCase() === name &&
        (!editingNotebookId || n.id !== editingNotebookId),
    );
  }, [draft.name, existingNotebooks, editingNotebookId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] gap-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-lg">{editing ? "Edit notebook" : "Create notebook"}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Name and color your column. Add a description so you (and AI) remember what belongs here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <BoardColumnPreview draft={draft} />

          <div className="space-y-2">
            <Label htmlFor="notebook-name" className="text-[11px] uppercase tracking-widest text-[#8c857f]">
              Name
            </Label>
            <Input
              id="notebook-name"
              value={draft.name}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  name: event.currentTarget.value,
                })
              }
              placeholder="Series 65, Client work, Personal…"
              className="h-10"
            />
            <p className="text-xs leading-5 text-[#8c857f]">
              Use a distinct name so sorting stays accurate when you have many notebooks.
            </p>
            {duplicateName ? (
              <p className="text-xs font-medium text-[#7a5c40]">
                You already have a notebook with this name. You can still save if you want duplicates.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notebook-description" className="text-[11px] uppercase tracking-widest text-[#8c857f]">
              Description
            </Label>
            <Textarea
              id="notebook-description"
              value={draft.description}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  description: event.currentTarget.value,
                })
              }
              placeholder="What goes in this notebook? e.g. Exam prep, meeting notes, ideas for Project X…"
              className="min-h-[88px] resize-y text-[13px] leading-relaxed"
            />
            <p className="text-xs leading-5 text-[#8c857f]">
              Optional. Shown in the classifier prompt to improve filing accuracy.
            </p>
          </div>

          <div className="h-px bg-[#e8e2dc]" />

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-widest text-[#8c857f]">Accent color</Label>
            <NotebookColorPicker
              value={draft.color}
              onChange={(color) =>
                onDraftChange({
                  ...draft,
                  color,
                })
              }
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex-col gap-2 border-t border-[#f0ece8] pt-4 sm:flex-row sm:justify-between sm:gap-0">
          <div className="flex flex-wrap gap-2">
            {editing && onDelete ? (
              <Button variant="ghost" className="text-[#6b6560]" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save notebook" : "Create notebook"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
