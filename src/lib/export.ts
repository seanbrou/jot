import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import { EXPORT_TARGETS } from "./constants";

export async function exportNoteToTarget(targetId: string, noteBody: string) {
  const target = EXPORT_TARGETS.find((option) => option.id === targetId);
  if (!target) {
    throw new Error("Unknown export target.");
  }

  await writeText(noteBody);
  await openUrl(target.url);
}
