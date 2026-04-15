import type { ExportTarget, NotebookDraft } from "./types";

export const INBOX_NOTEBOOK_ID = "inbox";
export const QUICK_CAPTURE_SHORTCUT = "Alt+N";
export const CAPTURE_WINDOW_LABEL = "capture";
export const CAPTURE_WINDOW_WIDTH = 480;
export const CAPTURE_WINDOW_HEIGHT = 220;

/** Shown in Settings; keep in sync with package.json / tauri version when releasing. */
export const APP_VERSION = "0.1.0";

export const NOTEBOOK_COLORS = [
  "#F4A261",
  "#7C9A92",
  "#D77A61",
  "#6D83F2",
  "#C9A227",
  "#8F5AE8",
];

export const NOTEBOOK_ICONS = ["AI", "WK", "PR", "ST", "HQ", "FX", "OP", "NB"];

export const DEFAULT_NOTEBOOK_DRAFT: NotebookDraft = {
  name: "",
  color: NOTEBOOK_COLORS[0],
  icon: NOTEBOOK_ICONS[0],
  description: "",
};

export const EXPORT_TARGETS: ExportTarget[] = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "grok", label: "Grok", url: "https://grok.com/" },
  { id: "claude", label: "Claude", url: "https://claude.ai/" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app" },
];

export const STATUS_LABELS = {
  pending: "Sorting",
  sorted: "Filed",
  review: "Inbox",
  failed: "Needs retry",
} as const;
