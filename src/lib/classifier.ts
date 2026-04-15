import {
  classifyNoteRequestSchema,
  classifyNoteResponseSchema,
  type ClassifyNoteRequest,
} from "./contracts";
import { invoke } from "@tauri-apps/api/core";

function isTauriEnvironment() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function getClassifierEndpoint() {
  return import.meta.env.VITE_CLASSIFIER_ENDPOINT?.trim() ?? "";
}

export function isClassifierConfigured() {
  return getClassifierEndpoint().length > 0 || isTauriEnvironment();
}

async function classifyNoteWithLocal(request: ClassifyNoteRequest) {
  const response = await invoke("classify_note_local", { request });
  return classifyNoteResponseSchema.parse(response);
}

export async function classifyNoteWithRemote(request: ClassifyNoteRequest) {
  const validatedRequest = classifyNoteRequestSchema.parse(request);
  const endpoint = getClassifierEndpoint();

  if (!endpoint) {
    if (!isTauriEnvironment()) {
      throw new Error(
        "Auto-sorting is offline. Set VITE_CLASSIFIER_ENDPOINT to your deployed /api/classify-note route.",
      );
    }

    return classifyNoteWithLocal(validatedRequest);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedRequest),
  });

  if (!response.ok) {
    const message = await response.text();
    if (isTauriEnvironment()) {
      return classifyNoteWithLocal(validatedRequest);
    }

    throw new Error(message || "The classifier service could not sort this note.");
  }

  return classifyNoteResponseSchema.parse(await response.json());
}
