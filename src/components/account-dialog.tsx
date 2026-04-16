import { LogOut, NotebookPen } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { AppUser } from "../lib/types";
import { APP_VERSION } from "../lib/constants";

export function AccountDialog({
  open,
  onOpenChange,
  viewer,
  notebookCount,
  noteCount,
  onCreateNotebook,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewer: AppUser | null;
  notebookCount: number;
  noteCount: number;
  onCreateNotebook: () => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <div className="border-b border-[#f0ece8] bg-white px-6 py-5">
          <DialogHeader className="space-y-0.5 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#2d2a27]">
              Settings
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#8c857f]">
              Your account and workspace
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 bg-white px-6 py-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#ede8e3]">
              {viewer?.image ? (
                <img
                  alt=""
                  src={viewer.image}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-[#6b6560]">
                  {(viewer?.name ?? "J").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-[#2d2a27]">
                {viewer?.name ?? "Jot User"}
              </div>
              <div className="truncate text-[13px] text-[#8c857f]">
                {viewer?.email ?? "—"}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-[#f0ece8] bg-[#faf7f5] px-4 py-3 text-center">
              <div className="text-xl font-semibold tabular-nums text-[#2d2a27]">
                {notebookCount}
              </div>
              <div className="text-[11px] text-[#8c857f]">Notebooks</div>
            </div>
            <div className="flex-1 rounded-lg border border-[#f0ece8] bg-[#faf7f5] px-4 py-3 text-center">
              <div className="text-xl font-semibold tabular-nums text-[#2d2a27]">
                {noteCount}
              </div>
              <div className="text-[11px] text-[#8c857f]">Notes</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 border-t border-[#f0ece8] pt-4">
            <Button
              className="w-full justify-center text-[13px]"
              onClick={() => {
                onOpenChange(false);
                onCreateNotebook();
              }}
            >
              <NotebookPen className="h-4 w-4" />
              New notebook
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-center text-[13px] text-[#8c857f] hover:text-[#ba1a1a]"
              onClick={() => void onSignOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#f0ece8] bg-[#faf7f5] px-6 py-3">
          <p className="text-center text-[11px] text-[#b5aea8]">
            Jot · v{APP_VERSION}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
