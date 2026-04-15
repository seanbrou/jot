import { invoke } from "@tauri-apps/api/core";
export async function revealCaptureWindow() {
  await invoke("reveal_capture_window");
}

export async function hideCaptureWindow() {
  await invoke("hide_capture_window");
}
