import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    elements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const boardId = await ctx.db.insert("boards", {
      title: args.title ?? "Untitled Board",
      elements: args.elements ?? "[]",
      createdAt: now,
      lastModified: now,
    });
    return boardId;
  },
});

export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("boards")
      .order("desc")
      .take(50);
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    elements: v.string(),
    appState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    await ctx.db.patch(args.id, {
      elements: args.elements,
      ...(args.appState !== undefined && { appState: args.appState }),
      lastModified: Date.now(),
    });
  },
});

export const updateTitle = mutation({
  args: {
    id: v.id("boards"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    await ctx.db.patch(args.id, {
      title: args.title,
      lastModified: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    await ctx.db.delete(args.id);
  },
});

export const deleteOldBoards = internalMutation({
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldBoards = await ctx.db
      .query("boards")
      .withIndex("by_created", (q) => q.lt("createdAt", sevenDaysAgo))
      .collect();
    for (const board of oldBoards) {
      await ctx.db.delete(board._id);
    }
    return { deleted: oldBoards.length };
  },
});
