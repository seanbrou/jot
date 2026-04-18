import { Loader2, Sparkles, Bell } from "lucide-react";
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
  reminderAt: string | null;
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
      <DialogContent className="gap-0 overflow-hidden border-[#e8e2dc] p-0 shadow-xl sm:max-w-lg">
        {/* Header */}
        <div className="border-b border-[#f0ece8] bg-white px-6 pt-5 pb-4">
          <DialogHeader className="space-y-0.5 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#2d2a27]">
              {isCreate ? "New note" : "Edit note"}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#8c857f]">
              {isCreate
                ? "Write it down — AI will file it for you."
                : "Update your note below."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="space-y-4 bg-white px-6 py-5">
          <Textarea
            value={state.body}
            onChange={(e) =>
              onStateChange({ ...state, body: e.currentTarget.value })
            }
            placeholder="Jot something down…"
            autoFocus
            className="min-h-[10rem] resize-none border-[#e8e2dc] bg-[#faf7f5] text-[14px] leading-relaxed text-[#2d2a27] placeholder:text-[#b5aea8] focus-visible:ring-[#b35c2a]/30"
          />

          {/* AI filing row */}
          <div className="flex items-center justify-between rounded-lg border border-[#f0ece8] bg-[#faf7f5] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#b35c2a]" />
              <div>
                <div className="text-[13px] font-medium text-[#2d2a27]">AI auto-filing</div>
                <div className="text-[11px] text-[#8c857f]">
                  {state.useAiRouting
                    ? "Sorted into the best notebook automatically"
                    : "You pick the notebook"}
                </div>
              </div>
            </div>
            <Switch
              checked={state.useAiRouting}
              onCheckedChange={(checked) =>
                onStateChange({ ...state, useAiRouting: checked })
              }
            />
          </div>

          {/* Manual notebook select */}
          {!state.useAiRouting && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-[#8c857f]">
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
                <SelectTrigger className="border-[#e8e2dc] bg-white">
                  <SelectValue placeholder="Choose a notebook" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INBOX_NOTEBOOK_ID}>Inbox</SelectItem>
                  {notebooks.map((nb) => (
                    <SelectItem key={nb.id} value={nb.id}>
                      {nb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reminder section — create mode only */}
          {isCreate && (
            <div className="flex items-center justify-between rounded-lg border border-[#f0ece8] bg-[#faf7f5] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-[#b35c2a]" />
                <div>
                  <div className="text-[13px] font-medium text-[#2d2a27]">Set reminder</div>
                  <div className="text-[11px] text-[#8c857f]">
                    {state.reminderAt
                      ? new Date(state.reminderAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Get reminded about this note"}
                  </div>
                </div>
              </div>
              <input
                type="datetime-local"
                className="rounded-md border border-[#e0d9d2] bg-white px-2 py-1 text-[12px] text-[#2d2a27] outline-none focus:border-[#b35c2a]"
                value={state.reminderAt
                  ? (() => {
                      const d = new Date(state.reminderAt);
                      const offset = d.getTimezoneOffset();
                      const local = new Date(d.getTime() - offset * 60000);
                      return local.toISOString().slice(0, 16);
                    })()
                  : ""}
                onChange={(e) =>
                  onStateChange({
                    ...state,
                    reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 border-t border-[#f0ece8] bg-[#faf7f5] px-6 py-3 sm:justify-end">
          {state.noteId && onDelete && (
            <Button variant="ghost" className="mr-auto text-[#8c857f] hover:text-[#ba1a1a]" onClick={onDelete}>
              Delete
            </Button>
          )}
          {state.noteId && onReclassify && (
            <Button variant="outline" className="text-[13px]" onClick={onReclassify}>
              Re-sort
            </Button>
          )}
          <Button variant="outline" className="text-[13px]" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="text-[13px]"
            onClick={() => void onSubmit()}
            disabled={syncing || !state.body.trim()}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {state.noteId ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
