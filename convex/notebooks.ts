import { ConvexError, v } from "convex/values";
import {
  actionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  makeFunctionReference,
  mutationGeneric,
  queryGeneric,
  paginationOptsValidator,
} from "convex/server";
import { buildSearchText, requireAuthUser } from "./lib";

const getNotebookForMutationRef =
  makeFunctionReference<"query">("notebooks:getNotebookForMutation");
const listNotebookNotesPageRef =
  makeFunctionReference<"query">("notebooks:listNotebookNotesPage");
const detachNotebookNotesBatchRef =
  makeFunctionReference<"mutation">("notebooks:detachNotebookNotesBatch");
const refreshNotebookSearchTextRef =
  makeFunctionReference<"action">("notebooks:refreshNotebookSearchText");
const refreshNotebookSearchTextBatchRef =
  makeFunctionReference<"mutation">("notebooks:refreshNotebookSearchTextBatch");
const deleteNotebookIfOwnedRef =
  makeFunctionReference<"mutation">("notebooks:deleteNotebookIfOwned");

export const create = mutationGeneric({
  args: {
    name: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const now = Date.now();
    const name = args.name.trim();

    if (!name) {
      throw new ConvexError("Notebook names cannot be empty.");
    }

    const description = (args.description ?? "").trim();

    const id = await ctx.db.insert("notebooks", {
      authUserId: authUser._id,
      name,
      color: args.color,
      icon: args.icon,
      ...(description.length > 0 ? { description } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const update = mutationGeneric({
  args: {
    notebookId: v.id("notebooks"),
    name: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const notebook = await ctx.db.get(args.notebookId);

    if (!notebook || notebook.authUserId !== authUser._id) {
      throw new ConvexError("Notebook not found.");
    }

    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Notebook names cannot be empty.");
    }

    const description = (args.description ?? "").trim();

    await ctx.db.patch(args.notebookId, {
      name,
      color: args.color,
      icon: args.icon,
      ...(description.length > 0 ? { description } : { description: undefined }),
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, refreshNotebookSearchTextRef, {
      authUserId: authUser._id,
      notebookId: args.notebookId,
      notebookName: name,
    });

    return await ctx.db.get(args.notebookId);
  },
});

export const remove = actionGeneric({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx);
    const notebook = await ctx.runQuery(getNotebookForMutationRef, {
      notebookId: args.notebookId,
    });

    if (!notebook || notebook.authUserId !== authUser._id) {
      throw new ConvexError("Notebook not found.");
    }

    let cursor: string | null = null;
    do {
      const page = await ctx.runQuery(listNotebookNotesPageRef, {
        authUserId: authUser._id,
        notebookId: args.notebookId,
        paginationOpts: {
          numItems: 100,
          cursor,
        },
      });

      if (page.page.length > 0) {
        await ctx.runMutation(detachNotebookNotesBatchRef, {
          noteIds: page.page.map((note: { id: string }) => note.id),
        });
      }

      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);

    await ctx.runMutation(deleteNotebookIfOwnedRef, {
      notebookId: args.notebookId,
      authUserId: authUser._id,
    });

    return { success: true };
  },
});

export const getNotebookForMutation = queryGeneric({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notebookId);
  },
});

export const listNotebookNotesPage = internalQueryGeneric({
  args: {
    authUserId: v.string(),
    notebookId: v.id("notebooks"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("notes")
      .withIndex("by_authUserId_notebookId_updatedAt", (query: any) =>
        query.eq("authUserId", args.authUserId).eq("notebookId", args.notebookId),
      )
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((note) => ({
        id: note._id,
        title: note.title,
        body: note.body,
        suggestedTitle: note.suggestedTitle,
      })),
    };
  },
});

export const detachNotebookNotesBatch = internalMutationGeneric({
  args: {
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const notes = await Promise.all(args.noteIds.map((noteId) => ctx.db.get(noteId)));
    const updatedAt = Date.now();
    await Promise.all(
      notes
        .filter((note): note is Exclude<typeof note, null> => note !== null)
        .map((note) =>
          ctx.db.patch(note._id, {
            notebookId: null,
            aiStatus: "review",
            aiConfidence: null,
            searchText: buildSearchText(note.title, note.body, note.suggestedTitle, null),
            updatedAt,
          }),
        ),
    );
  },
});

export const refreshNotebookSearchTextBatch = internalMutationGeneric({
  args: {
    noteIds: v.array(v.id("notes")),
    notebookName: v.string(),
  },
  handler: async (ctx, args) => {
    const notes = await Promise.all(args.noteIds.map((noteId) => ctx.db.get(noteId)));
    await Promise.all(
      notes
        .filter((note): note is Exclude<typeof note, null> => note !== null)
        .map((note) =>
          ctx.db.patch(note._id, {
            searchText: buildSearchText(
              note.title,
              note.body,
              note.suggestedTitle,
              args.notebookName,
            ),
          }),
        ),
    );
  },
});

export const deleteNotebookIfOwned = internalMutationGeneric({
  args: {
    notebookId: v.id("notebooks"),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook || notebook.authUserId !== args.authUserId) {
      return { success: true };
    }

    const remainingNotes = await ctx.db
      .query("notes")
      .withIndex("by_authUserId_notebookId_updatedAt", (query: any) =>
        query.eq("authUserId", args.authUserId).eq("notebookId", args.notebookId),
      )
      .take(25);

    await Promise.all(
      remainingNotes.map((note) =>
        ctx.db.patch(note._id, {
          notebookId: null,
          aiStatus: "review",
          aiConfidence: null,
          searchText: buildSearchText(note.title, note.body, note.suggestedTitle, null),
          updatedAt: Date.now(),
        }),
      ),
    );

    await ctx.db.delete(args.notebookId);
    return { success: true };
  },
});

export const refreshNotebookSearchText = actionGeneric({
  args: {
    authUserId: v.string(),
    notebookId: v.id("notebooks"),
    notebookName: v.string(),
  },
  handler: async (ctx, args) => {
    let cursor: string | null = null;
    do {
      const page = await ctx.runQuery(listNotebookNotesPageRef, {
        authUserId: args.authUserId,
        notebookId: args.notebookId,
        paginationOpts: {
          numItems: 100,
          cursor,
        },
      });

      if (page.page.length > 0) {
        await ctx.runMutation(refreshNotebookSearchTextBatchRef, {
          noteIds: page.page.map((note: { id: string }) => note.id),
          notebookName: args.notebookName,
        });
      }

      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);

    return { success: true };
  },
});
