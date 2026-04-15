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
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { INBOX_NOTEBOOK_ID } from "../lib/constants";
import type { Notebook } from "../lib/types";

export type NoteDialogState = {
  open: boolean;
  noteId: string | null;
  body: string;
  notebookId: string | null;
  useAiRouting: boolean;
};

export function NoteDialog({
  state,
  notebooks,
  syncing,
  onOpenChange,
  onStateChange,
  onSubmit,
  onDelete,
  onReclassify,
}: {
  state: NoteDialogState;
  notebooks: Notebook[];
  syncing: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: (state: NoteDialogState) => void;
  onSubmit: () => Promise<void>;
  onDelete?: () => void;
  onReclassify?: () => void;
}) {
  const isCreate = !state.noteId;

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-[#c9c1b9] p-0 shadow-[0_24px_48px_-12px_rgba(45,42,39,0.18)] sm:max-w-lg">
        <div className="border-b border-[#e8e2dc] bg-[#f6f2ed] px-6 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight text-[#1f1d1b]">
              {state.noteId ? "Edit note" : "New note"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#4a4540]">
              {isCreate
                ? "Write it down first. AI filing is on by default—you can pick a notebook manually if you prefer."
                : "Update your note and adjust filing or AI routing as needed."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 bg-white px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="note-body" className="text-[11px] font-semibold uppercase tracking-widest text-[#5c5650]">
              Content
            </Label>
            <Textarea
              id="note-body"
              value={state.body}
              onChange={(event) =>
                onStateChange({
                  ...state,
                  body: event.currentTarget.value,
                })
              }
              placeholder="Series 65 reminder, research thought, project note…"
              className="min-h-[10rem] border-[#d4cec8] bg-[#fdfcfa] text-[15px] leading-relaxed text-[#1f1d1b] shadow-inner placeholder:text-[#8c857f] focus-visible:ring-[#b35c2a]/40"
            />
          </div>

          <div className="rounded-xl border border-[#d4cec8] bg-[#f6f2ed] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pt-0.5">
                <Label htmlFor="note-ai-routing" className="text-sm font-semibold text-[#1f1d1b]">
                  Let AI choose notebook
                </Label>
                <p className="mt-1 text-xs leading-5 text-[#4a4540]">
                  {state.useAiRouting
                    ? "After save, it goes through AI sorting into the best column."
                    : "Choose Inbox or a specific notebook below."}
                </p>
              </div>
              <Switch
                id="note-ai-routing"
                checked={state.useAiRouting}
                onCheckedChange={(checked) => onStateChange({ ...state, useAiRouting: checked })}
                className="mt-0.5"
              />
            </div>

            {state.useAiRouting ? null : (
              <div className="mt-3 space-y-1.5 border-t border-[#e0d9d2] pt-3">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#5c5650]">
                  Notebook
                </Label>
                <Select
                  value={state.notebookId ?? INBOX_NOTEBOOK_ID}
                  onValueChange={(value) =>
                    onStateChange({
                      ...state,
                      notebookId: value === INBOX_NOTEBOOK_ID ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="border-[#c9c1b9] bg-white">
                    <SelectValue placeholder="Choose a notebook" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INBOX_NOTEBOOK_ID}>Inbox</SelectItem>
                    {notebooks.map((notebook) => (
                      <SelectItem key={notebook.id} value={notebook.id}>
                        {notebook.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-[#e8e2dc] bg-[#faf7f5] px-6 py-4 sm:justify-end">
          {state.noteId && onDelete ? (
            <Button variant="ghost" className="mr-auto text-[#6b6560]" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
          {state.noteId && onReclassify ? (
            <Button variant="outline" onClick={onReclassify}>
              Reclassify
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSubmit()} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {state.noteId ? "Save note" : "Create note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
