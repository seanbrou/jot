import { invoke } from "@tauri-apps/api/core";

function isTauriEnvironment() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function revealCaptureWindow() {
  if (!isTauriEnvironment()) {
    return;
  }

  await invoke("reveal_capture_window");
}

export async function hideCaptureWindow() {
  if (!isTauriEnvironment()) {
    return;
  }

  await invoke("hide_capture_window");
}
