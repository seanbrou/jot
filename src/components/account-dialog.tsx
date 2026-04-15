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
        <div className="border-b border-[#e8e2dc] bg-[#faf7f5] px-6 py-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight text-[#2d2a27]">
              Settings
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#6b6560]">
              Workspace and account for this device.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-3">
            <h3 className="font-headline text-[11px] font-semibold uppercase tracking-widest text-[#8c857f]">
              Profile
            </h3>
            <div className="flex gap-4 rounded-xl border border-[#e8e2dc] bg-white p-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#ede8e3] ring-1 ring-[#e8e2dc]">
                {viewer?.image ? (
                  <img
                    alt={`${viewer?.name ?? "User"} profile photo`}
                    src={viewer.image}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#2d2a27]">
                    {(viewer?.name ?? "O").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[#2d2a27]">
                  {viewer?.name ?? "Oat User"}
                </div>
                <div className="mt-0.5 truncate text-sm text-[#6b6560]">{viewer?.email ?? "—"}</div>
                <p className="mt-2 text-xs leading-5 text-[#8c857f]">
                  Signed in. Notes and notebooks stay on this account.
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#e8e2dc]" />

          <section className="space-y-3">
            <h3 className="font-headline text-[11px] font-semibold uppercase tracking-widest text-[#8c857f]">
              Workspace
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#e8e2dc] bg-[#faf7f5] px-4 py-3">
                <div className="text-2xl font-semibold tabular-nums text-[#2d2a27]">{notebookCount}</div>
                <div className="mt-1 text-xs font-medium text-[#8c857f]">Notebooks</div>
              </div>
              <div className="rounded-xl border border-[#e8e2dc] bg-[#faf7f5] px-4 py-3">
                <div className="text-2xl font-semibold tabular-nums text-[#2d2a27]">{noteCount}</div>
                <div className="mt-1 text-xs font-medium text-[#8c857f]">Notes</div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-headline text-[11px] font-semibold uppercase tracking-widest text-[#8c857f]">
              Actions
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-center sm:w-auto"
                onClick={() => {
                  onOpenChange(false);
                  onCreateNotebook();
                }}
              >
                <NotebookPen className="h-4 w-4" />
                New notebook
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" className="sm:min-w-[7rem]" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  className="text-[#6b6560] hover:text-[#2d2a27] sm:px-4"
                  onClick={() => void onSignOut()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-[#f0ece8] bg-[#faf7f5]/80 px-6 py-3">
          <p className="text-center text-[11px] text-[#b5aea8]">
            Oat desktop · v{APP_VERSION}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
