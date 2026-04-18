import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import {
  actionGeneric,
  internalMutationGeneric,
  makeFunctionReference,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import {
  requireAuthUser,
  summarizeTitle,
  normalizeGeneratedTitle,
  buildSearchText,
  sortNotes,
  buildBodyPreview,
} from "./lib";

const classifierModel = process.env.OAT_CLASSIFIER_MODEL ?? "google/gemini-2.5-flash-lite";
const titleModel =
  process.env.OAT_NOTE_TITLE_MODEL ?? "google/gemini-3.1-flash-lite-preview";

const classificationSchema = z.object({
  notebookId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  title: z.string().min(1),
});

const titleSchema = z.object({
  title: z.string().min(1),
});

const classifyNoteInternalRef = makeFunctionReference<"action">("notes:classifyNoteInternal");
const applyClassificationResultRef =
  makeFunctionReference<"mutation">("notes:applyClassificationResult");
const markClassificationFailedRef =
  makeFunctionReference<"mutation">("notes:markClassificationFailed");
const getNoteForClassificationRef =
  makeFunctionReference<"query">("notes:getNoteForClassification");
const createPendingNoteRef = makeFunctionReference<"mutation">("notes:createPendingNote");
const updateNoteForReclassificationRef = makeFunctionReference<"mutation">(
  "notes:updateNoteForReclassification",
);
const prepareNoteReclassificationRef = makeFunctionReference<"mutation">(
  "notes:prepareNoteReclassification",
);
const getNoteForTitleRef = makeFunctionReference<"query">("notes:getNoteForTitle");
const applyGeneratedTitleRef = makeFunctionReference<"mutation">("notes:applyGeneratedTitle");
const generateTitleInternalRef = makeFunctionReference<"action">("notes:generateTitleInternal");

const viewValidator = v.union(v.literal("board"), v.literal("timeline"), v.literal("archive"));

function normalizeNotebook(notebook: {
  _id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    id: notebook._id,
    name: notebook.name,
    color: notebook.color,
    icon: notebook.icon,
    description: notebook.description ?? "",
    createdAt: new Date(notebook.createdAt).toISOString(),
    updatedAt: new Date(notebook.updatedAt).toISOString(),
  };
}

function normalizeNote(note: {
  _id: string;
  notebookId: string | null;
  title: string;
  body: string;
  source: string;
  aiStatus: "pending" | "sorted" | "review" | "failed";
  aiConfidence: number | null;
  pinned: boolean;
  archived: boolean;
  suggestedTitle: string | null;
  reminderAt: number | null;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    id: note._id,
    notebookId: note.notebookId,
    title: note.title,
    body: buildBodyPreview(note.body),
    source: note.source,
    aiStatus: note.aiStatus,
    aiConfidence: note.aiConfidence,
    pinned: note.pinned,
    archived: note.archived,
    suggestedTitle: note.suggestedTitle,
    reminderAt: note.reminderAt ? new Date(note.reminderAt).toISOString() : null,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
  };
}

function tokenizeForNotebookRanking(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findNotebookPhraseMatch(
  notebooks: { id: string; name: string; description?: string }[],
  body: string,
  title: string,
) {
  const haystack = `${title}\n${body}`;
  return [...notebooks]
    .sort((left, right) => right.name.length - left.name.length)
    .find((notebook) => {
      const name = notebook.name.trim();
      if (name.length < 4) {
        return false;
      }

      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(name)}([^a-z0-9]|$)`, "i");
      return pattern.test(haystack);
    });
}

function selectNotebookCandidates(
  notebooks: { id: string; name: string; description?: string }[],
  body: string,
  title: string,
) {
  if (notebooks.length <= 12) {
    return notebooks;
  }

  const noteTokens = new Set(tokenizeForNotebookRanking(`${title}\n${body}`));
  const scored = notebooks.map((notebook, index) => {
    const nameTokens = tokenizeForNotebookRanking(notebook.name);
    const overlap = nameTokens.filter((token) => noteTokens.has(token)).length;
    const startsWithMatch = nameTokens.some((token) => title.toLowerCase().startsWith(token));

    return {
      notebook,
      score: overlap * 4 + (startsWithMatch ? 2 : 0) - index * 0.01,
    };
  });

  const ranked = [...scored]
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.notebook);
  const recentFallback = notebooks.slice(0, 4);
  const unique = new Map<string, { id: string; name: string; description?: string }>();

  for (const notebook of [...ranked, ...recentFallback]) {
    unique.set(notebook.id, notebook);
  }

  return Array.from(unique.values()).slice(0, 12);
}

async function runClassificationForNote(ctx: any, noteId: any) {
  const document = await ctx.runQuery(getNoteForClassificationRef, {
    noteId,
  });

  if (!document || document.archived) {
    return null;
  }

  if (document.notebooks.length === 0) {
    return await ctx.runMutation(applyClassificationResultRef, {
      noteId,
      expectedUpdatedAt: document.updatedAt,
      notebookId: null,
      notebookName: null,
      confidence: 0,
      model: "system/inbox",
      reasoning: "No notebooks exist yet, so the note stayed in Inbox.",
      title: document.title,
    });
  }

  const exactMatch = findNotebookPhraseMatch(document.notebooks, document.body, document.title);
  if (exactMatch) {
    return await ctx.runMutation(applyClassificationResultRef, {
      noteId,
      expectedUpdatedAt: document.updatedAt,
      notebookId: exactMatch.id,
      notebookName: exactMatch.name,
      confidence: 0.98,
      model: "system/exact-match",
      reasoning: `The note explicitly mentioned ${exactMatch.name}.`,
      title: document.title,
    });
  }

  const candidateNotebooks = selectNotebookCandidates(
    document.notebooks,
    document.body,
    document.title,
  );

  try {
    const result = await generateObject({
      model: gateway(classifierModel),
      temperature: 0,
      providerOptions: {
        gateway: {
          user: document.authUserId,
          tags: ["app:oat", "feature:note-classification"],
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      },
      system: `Classify the note into one of the provided notebooks.

Rules:
- Only return notebook ids from the candidate list.
- Return notebookId as null if none clearly fit.
- Keep reasoning to one short sentence.
- Return a short natural title that summarizes the note in 3 to 8 words.`,
      prompt: `Note:
${document.body}

Candidate notebooks:
${candidateNotebooks
  .map((entry: { id: string; name: string; description?: string }) => {
    const desc = entry.description?.trim();
    return desc
      ? `- ${entry.id}: ${entry.name} — ${desc}`
      : `- ${entry.id}: ${entry.name}`;
  })
  .join("\n")}`,
      schema: classificationSchema,
    });

    const normalized = classificationSchema.parse(result.object);
    const chosenNotebook =
      normalized.notebookId &&
      candidateNotebooks.find((entry: any) => entry.id === normalized.notebookId);

    return await ctx.runMutation(applyClassificationResultRef, {
      noteId,
      expectedUpdatedAt: document.updatedAt,
      notebookId: chosenNotebook?.id ?? null,
      notebookName: chosenNotebook?.name ?? null,
      confidence: normalized.confidence,
      model: classifierModel,
      reasoning: normalized.reasoning,
      title: normalized.title,
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "The classifier could not sort the note.";

    return await ctx.runMutation(markClassificationFailedRef, {
      noteId,
      expectedUpdatedAt: document.updatedAt,
      reason,
    });
  }
}

async function runTitleGenerationForNote(ctx: any, noteId: any) {
  const document = await ctx.runQuery(getNoteForTitleRef, { noteId });

  if (!document || document.archived) {
    return null;
  }

  try {
    const result = await generateObject({
      model: gateway(titleModel),
      temperature: 0,
      providerOptions: {
        gateway: {
          user: document.authUserId,
          tags: ["app:oat", "feature:note-title-generation"],
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      },
      system: `Write a concise title for a personal note.

Rules:
- 3 to 8 words.
- No quotes, emojis, or ending punctuation.
- Make it specific and useful, not generic.`,
      prompt: `Note body:
${document.body}`,
      schema: titleSchema,
    });

    const normalized = titleSchema.parse(result.object);

    return await ctx.runMutation(applyGeneratedTitleRef, {
      noteId,
      expectedUpdatedAt: document.updatedAt,
      title: normalizeGeneratedTitle(normalized.title, document.body),
    });
  } catch {
    return null;
  }
}

async function listNotesForSearch(
  ctx: any,
  authUserId: string,
  archived: boolean,
  searchText: string,
) {
  if (!searchText) {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_authUserId_archived_updatedAt", (query: any) =>
        query.eq("authUserId", authUserId).eq("archived", archived),
      )
      .order("desc")
      .collect();

    return sortNotes(notes);
  }

  const noteHits = await ctx.db
    .query("notes")
    .withSearchIndex("search_text", (query: any) =>
      query
        .search("searchText", searchText)
        .eq("authUserId", authUserId)
        .eq("archived", archived),
    )
    .take(60);
  return sortNotes(noteHits);
}

async function requireOwnedNotebook(
  ctx: any,
  authUserId: string,
  notebookId: string | null,
) {
  if (!notebookId) {
    return null;
  }

  const notebook = await ctx.db.get(notebookId as never);
  if (!notebook || notebook.authUserId !== authUserId) {
    throw new ConvexError("Notebook not found.");
  }

  return notebook;
}

export const getBoardSnapshot = queryGeneric({
  args: {
    searchText: v.optional(v.string()),
    activeView: viewValidator,
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const searchText = args.searchText?.trim() ?? "";
    const includeArchived = args.activeView !== "timeline";

    const [notebooks, activeNotes, archivedNotes] = await Promise.all([
      ctx.db
        .query("notebooks")
        .withIndex("by_authUserId_updatedAt", (query: any) =>
          query.eq("authUserId", authUser._id),
        )
        .order("desc")
        .collect(),
      listNotesForSearch(ctx, authUser._id, false, searchText),
      includeArchived ? listNotesForSearch(ctx, authUser._id, true, searchText) : [],
    ]);

    return {
      viewer: {
        id: authUser._id,
        authUserId: authUser._id,
        email: authUser.email,
        name: authUser.name?.trim() || authUser.email.split("@")[0] || "Oat User",
        image: authUser.image ?? null,
      },
      notebooks: (notebooks as any[]).map(normalizeNotebook),
      activeNotes: (activeNotes as any[]).map(normalizeNote),
      archivedNotes: (archivedNotes as any[]).map(normalizeNote),
      pendingCount: (activeNotes as any[]).filter((note: any) => note.aiStatus === "pending").length,
    };
  },
});

export const create = mutationGeneric({
  args: {
    body: v.string(),
    source: v.string(),
    notebookId: v.optional(v.union(v.id("notebooks"), v.null())),
    pinned: v.optional(v.boolean()),
    reminderAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const body = args.body.trim();

    if (!body) {
      throw new ConvexError("Notes need at least a little text.");
    }

    const manualNotebookId = args.notebookId ?? null;
    const manualNotebook = await requireOwnedNotebook(ctx, authUser._id, manualNotebookId);

    const now = Date.now();
    const title = summarizeTitle(body);
    const id = await ctx.db.insert("notes", {
      authUserId: authUser._id,
      notebookId: manualNotebookId,
      title,
      body,
      searchText: buildSearchText(title, body, null, manualNotebook?.name ?? null),
      source: args.source,
      aiStatus: manualNotebookId ? "sorted" : "pending",
      aiConfidence: manualNotebookId ? 1 : null,
      pinned: args.pinned ?? false,
      archived: false,
      suggestedTitle: null,
      reminderAt: args.reminderAt ?? null,
      createdAt: now,
      updatedAt: now,
    });

    if (!manualNotebookId) {
      await ctx.scheduler.runAfter(0, classifyNoteInternalRef, { noteId: id });
    } else {
      await ctx.scheduler.runAfter(0, generateTitleInternalRef, { noteId: id });
    }

    return await ctx.db.get(id);
  },
});

export const createPendingNote = internalMutationGeneric({
  args: {
    authUserId: v.string(),
    body: v.string(),
    source: v.string(),
    pinned: v.optional(v.boolean()),
    reminderAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Notes need at least a little text.");
    }

    const now = Date.now();
    const title = summarizeTitle(body);
    const id = await ctx.db.insert("notes", {
      authUserId: args.authUserId,
      notebookId: null,
      title,
      body,
      searchText: buildSearchText(title, body, null, null),
      source: args.source,
      aiStatus: "pending",
      aiConfidence: null,
      pinned: args.pinned ?? false,
      archived: false,
      suggestedTitle: null,
      reminderAt: args.reminderAt ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const createAndClassify = actionGeneric({
  args: {
    body: v.string(),
    source: v.string(),
    pinned: v.optional(v.boolean()),
    reminderAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx as never);
    const note = await ctx.runMutation(createPendingNoteRef, {
      authUserId: authUser._id,
      body: args.body,
      source: args.source,
      pinned: args.pinned ?? false,
      reminderAt: args.reminderAt ?? null,
    });

    if (!note) {
      return null;
    }

    return await runClassificationForNote(ctx, note._id);
  },
});

export const update = mutationGeneric({
  args: {
    noteId: v.id("notes"),
    body: v.string(),
    notebookId: v.union(v.id("notebooks"), v.null()),
    reclassify: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Notes need at least a little text.");
    }

    const targetNotebook = await requireOwnedNotebook(ctx, authUser._id, args.notebookId);

    const title = summarizeTitle(body);
    const updatedAt = Date.now();
    const nextNotebookId = args.reclassify ? null : args.notebookId;
    const nextSuggestedTitle = args.reclassify ? null : note.suggestedTitle;

    await ctx.db.patch(args.noteId, {
      body,
      title,
      notebookId: nextNotebookId,
      suggestedTitle: nextSuggestedTitle,
      searchText: buildSearchText(
        title,
        body,
        nextSuggestedTitle,
        args.reclassify ? null : targetNotebook?.name ?? null,
      ),
      aiStatus: args.reclassify ? "pending" : nextNotebookId ? "sorted" : "review",
      aiConfidence: args.reclassify ? null : nextNotebookId ? note.aiConfidence ?? 1 : null,
      updatedAt,
    });

    if (args.reclassify) {
      await ctx.scheduler.runAfter(0, classifyNoteInternalRef, { noteId: args.noteId });
    } else {
      await ctx.scheduler.runAfter(0, generateTitleInternalRef, { noteId: args.noteId });
    }

    return await ctx.db.get(args.noteId);
  },
});

export const togglePinned = mutationGeneric({
  args: {
    noteId: v.id("notes"),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    await ctx.db.patch(args.noteId, {
      pinned: args.pinned,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const move = mutationGeneric({
  args: {
    noteId: v.id("notes"),
    notebookId: v.union(v.id("notebooks"), v.null()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    const targetNotebook = await requireOwnedNotebook(ctx, authUser._id, args.notebookId);

    await ctx.db.patch(args.noteId, {
      notebookId: args.notebookId,
      aiStatus: args.notebookId ? "sorted" : "review",
      aiConfidence: args.notebookId ? note.aiConfidence ?? 1 : null,
      searchText: buildSearchText(
        note.title,
        note.body,
        note.suggestedTitle,
        targetNotebook?.name ?? null,
      ),
      archived: false,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const setArchived = mutationGeneric({
  args: {
    noteId: v.id("notes"),
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    await ctx.db.patch(args.noteId, {
      archived: args.archived,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const remove = mutationGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    const logs = await ctx.db
      .query("classificationLogs")
      .withIndex("by_noteId_createdAt", (query) => query.eq("noteId", args.noteId))
      .collect();

    await Promise.all(logs.map((log) => ctx.db.delete(log._id)));
    await ctx.db.delete(args.noteId);

    return { success: true };
  },
});

export const reclassify = mutationGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);

    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    await ctx.db.patch(args.noteId, {
      notebookId: null,
      aiStatus: "pending",
      aiConfidence: null,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, classifyNoteInternalRef, { noteId: args.noteId });

    return await ctx.db.get(args.noteId);
  },
});

export const updateNoteForReclassification = internalMutationGeneric({
  args: {
    authUserId: v.string(),
    noteId: v.id("notes"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.authUserId !== args.authUserId) {
      throw new ConvexError("Note not found.");
    }

    const body = args.body.trim();
    if (!body) {
      throw new ConvexError("Notes need at least a little text.");
    }

    const title = summarizeTitle(body);
    const updatedAt = Date.now();

    await ctx.db.patch(args.noteId, {
      body,
      title,
      notebookId: null,
      suggestedTitle: null,
      searchText: buildSearchText(title, body, null, null),
      aiStatus: "pending",
      aiConfidence: null,
      updatedAt,
    });

    return await ctx.db.get(args.noteId);
  },
});

export const updateAndReclassify = actionGeneric({
  args: {
    noteId: v.id("notes"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx as never);
    const note = await ctx.runMutation(updateNoteForReclassificationRef, {
      authUserId: authUser._id,
      noteId: args.noteId,
      body: args.body,
    });

    if (!note) {
      return null;
    }

    return await runClassificationForNote(ctx, note._id);
  },
});

export const prepareNoteReclassification = internalMutationGeneric({
  args: {
    authUserId: v.string(),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.authUserId !== args.authUserId) {
      throw new ConvexError("Note not found.");
    }

    await ctx.db.patch(args.noteId, {
      notebookId: null,
      aiStatus: "pending",
      aiConfidence: null,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const reclassifyNow = actionGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx as never);
    const note = await ctx.runMutation(prepareNoteReclassificationRef, {
      authUserId: authUser._id,
      noteId: args.noteId,
    });

    if (!note) {
      return null;
    }

    return await runClassificationForNote(ctx, note._id);
  },
});

export const applyClassificationResult = internalMutationGeneric({
  args: {
    noteId: v.id("notes"),
    expectedUpdatedAt: v.number(),
    notebookId: v.union(v.id("notebooks"), v.null()),
    notebookName: v.optional(v.union(v.string(), v.null())),
    confidence: v.number(),
    reasoning: v.string(),
    model: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    if (note.updatedAt !== args.expectedUpdatedAt || note.aiStatus !== "pending" || note.archived) {
      return note;
    }

    const title = normalizeGeneratedTitle(args.title, note.body);

    await ctx.db.patch(args.noteId, {
      title,
      notebookId: args.notebookId,
      aiStatus: args.notebookId ? "sorted" : "review",
      aiConfidence: args.confidence,
      suggestedTitle: title,
      searchText: buildSearchText(title, note.body, title, args.notebookName ?? null),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("classificationLogs", {
      authUserId: note.authUserId,
      noteId: note._id,
      chosenNotebookId: args.notebookId,
      confidence: args.confidence,
      model: args.model,
      reasoning: args.reasoning,
      createdAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const markClassificationFailed = internalMutationGeneric({
  args: {
    noteId: v.id("notes"),
    expectedUpdatedAt: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    if (note.updatedAt !== args.expectedUpdatedAt || note.aiStatus !== "pending" || note.archived) {
      return note;
    }

    await ctx.db.patch(args.noteId, {
      notebookId: null,
      aiStatus: "failed",
      aiConfidence: null,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("classificationLogs", {
      authUserId: note.authUserId,
      noteId: note._id,
      chosenNotebookId: null,
      confidence: 0,
      model: "system/error",
      reasoning: args.reason,
      createdAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const classifyNoteInternal = actionGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    return await runClassificationForNote(ctx, args.noteId);
  },
});

export const generateTitleInternal = actionGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    return await runTitleGenerationForNote(ctx, args.noteId);
  },
});

export const getNoteForClassification = queryGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    const notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_authUserId_updatedAt", (query: any) =>
        query.eq("authUserId", note.authUserId),
      )
      .order("desc")
      .collect();

    return {
      id: note._id,
      authUserId: note.authUserId,
      body: note.body,
      title: note.title,
      archived: note.archived,
      updatedAt: note.updatedAt,
      notebooks: notebooks.map((entry) => ({
        id: entry._id,
        name: entry.name,
        description: entry.description,
      })),
    };
  },
});

export const getNoteForTitle = queryGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    const notebook = note.notebookId ? await ctx.db.get(note.notebookId) : null;

    return {
      id: note._id,
      authUserId: note.authUserId,
      body: note.body,
      archived: note.archived,
      notebookName: notebook?.name ?? null,
      updatedAt: note.updatedAt,
    };
  },
});

export const applyGeneratedTitle = internalMutationGeneric({
  args: {
    noteId: v.id("notes"),
    expectedUpdatedAt: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.archived || note.updatedAt !== args.expectedUpdatedAt) {
      return note;
    }

    await ctx.db.patch(args.noteId, {
      title: args.title,
      suggestedTitle: args.title,
      searchText: buildSearchText(
        args.title,
        note.body,
        args.title,
        note.notebookId ? (await ctx.db.get(note.notebookId))?.name ?? null : null,
      ),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.noteId);
  },
});

export const getDetail = queryGeneric({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.authUserId !== authUser._id) {
      throw new ConvexError("Note not found.");
    }

    return {
      id: note._id,
      body: note.body,
      notebookId: note.notebookId,
      archived: note.archived,
      aiStatus: note.aiStatus,
      suggestedTitle: note.suggestedTitle,
      title: note.title,
      reminderAt: note.reminderAt ? new Date(note.reminderAt).toISOString() : null,
    };
  },
});
