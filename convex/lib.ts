import { ConvexError } from "convex/values";
import { authComponent } from "./auth";

export async function requireAuthUser(ctx: Parameters<typeof authComponent.getAuthUser>[0]) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw new ConvexError("You need to be signed in.");
  }
  return authUser;
}

export function summarizeTitle(body: string, fallback = "Untitled note") {
  const firstLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

export function normalizeGeneratedTitle(title: string, fallbackBody: string) {
  const normalized = title
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return summarizeTitle(fallbackBody);
  }

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export function buildSearchText(
  title: string,
  body: string,
  suggestedTitle?: string | null,
  notebookName?: string | null,
) {
  return [suggestedTitle ?? "", title, notebookName ?? "", body].filter(Boolean).join("\n").trim();
}

export function sortNotes<T extends { pinned: boolean; updatedAt: number }>(notes: T[]) {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return right.updatedAt - left.updatedAt;
  });
}

export function buildBodyPreview(body: string, maxLength = 240) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}
