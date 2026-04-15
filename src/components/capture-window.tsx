import { useEffect, useEffectEvent, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowUp, Check, GripVertical, Loader2 } from "lucide-react";
import { hideCaptureWindow } from "../lib/desktop";
import { useOatApp } from "../hooks/use-oat-app";
import { GoogleSignInForm } from "./google-sign-in-form";

function isTauriEnvironment() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function CaptureWindow() {
  const {
    authReady,
    captureNote,
    clearError,
    error,
    isAuthenticated,
    syncing,
  } = useOatApp();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const focusEditor = useEffectEvent(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(draft.length, draft.length);
    }, 24);
  });

  useEffect(() => {
    focusEditor();

    if (!isTauriEnvironment()) {
      return;
    }

    const currentWindow = getCurrentWindow();
    let disposed = false;
    let removeFocusListener: (() => void) | undefined;
    let removeEventListener: (() => void) | undefined;

    void currentWindow
      .onFocusChanged(({ payload }) => {
        if (!payload && !disposed) {
          void hideCaptureWindow();
        }
      })
      .then((cleanup) => {
        removeFocusListener = cleanup;
      });

    void listen("oat://focus-capture", () => {
      if (!disposed) {
        focusEditor();
      }
    }).then((cleanup) => {
      removeEventListener = cleanup;
    });

    return () => {
      disposed = true;
      removeFocusListener?.();
      removeEventListener?.();
    };
  }, [focusEditor]);

  async function submitDraft() {
    if (!draft.trim()) return;

    clearError();
    setSaving(true);
    try {
      await captureNote({
        body: draft.trim(),
        useAiRouting: true,
        notebookId: null,
      });
      setDraft("");
      setShowSuccess(true);
      setTimeout(async () => {
        setShowSuccess(false);
        if (isTauriEnvironment()) {
          await hideCaptureWindow();
          return;
        }

        window.close();
      }, 400);
    } catch {
      // error is surfaced via useOatApp
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 72)}px`;
    }
  }, [draft]);

  function renderContent() {
    if (!authReady) {
      return (
        <div className="flex items-center justify-center py-4 text-sm font-medium text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="p-3">
          <GoogleSignInForm compact />
        </div>
      );
    }

    return (
      <>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 px-4 pb-1 pt-2.5 text-[11px] font-medium text-error">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2.5 py-2.5 pl-4 pr-2.5">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitDraft();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                if (isTauriEnvironment()) {
                  void hideCaptureWindow();
                } else {
                  window.close();
                }
              }
            }}
            placeholder="Jot something down…"
            rows={1}
            className="w-full min-w-0 flex-1 resize-none bg-transparent font-body text-[14px] leading-relaxed text-on-surface outline-none placeholder:text-outline"
          />
          <button
            type="button"
            onClick={() => void submitDraft()}
            disabled={saving || syncing || !draft.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-all hover:bg-[#9a4f22] hover:shadow-md disabled:bg-outline-variant disabled:text-outline disabled:shadow-none"
            aria-label="Save note"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="capture-shell flex h-screen w-screen items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full items-stretch overflow-hidden rounded-2xl bg-surface"
      >
        {isTauriEnvironment() ? (
          <div
            data-tauri-drag-region
            className="flex w-7 shrink-0 cursor-grab items-center justify-center rounded-l-2xl bg-surface-container-high/60 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5 text-outline/50 pointer-events-none" />
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/12">
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  </div>
                  <span className="text-[13px] font-semibold text-on-surface">
                    Saved
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
}
