import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    email: v.string(),
    name: v.string(),
    image: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["authUserId"],
    }),

  notebooks: defineTable({
    authUserId: v.string(),
    name: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId_updatedAt", ["authUserId", "updatedAt"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["authUserId"],
    }),

  notes: defineTable({
    authUserId: v.string(),
    notebookId: v.union(v.id("notebooks"), v.null()),
    title: v.string(),
    body: v.string(),
    searchText: v.string(),
    source: v.string(),
    aiStatus: v.union(
      v.literal("pending"),
      v.literal("sorted"),
      v.literal("review"),
      v.literal("failed"),
    ),
    aiConfidence: v.union(v.number(), v.null()),
    pinned: v.boolean(),
    archived: v.boolean(),
    suggestedTitle: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId_updatedAt", ["authUserId", "updatedAt"])
    .index("by_authUserId_archived_updatedAt", ["authUserId", "archived", "updatedAt"])
    .index("by_authUserId_notebookId_updatedAt", ["authUserId", "notebookId", "updatedAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["authUserId", "archived"],
    }),

  classificationLogs: defineTable({
    authUserId: v.string(),
    noteId: v.id("notes"),
    chosenNotebookId: v.union(v.id("notebooks"), v.null()),
    confidence: v.number(),
    model: v.string(),
    reasoning: v.string(),
    createdAt: v.number(),
  })
    .index("by_authUserId_createdAt", ["authUserId", "createdAt"])
    .index("by_noteId_createdAt", ["noteId", "createdAt"]),
});
