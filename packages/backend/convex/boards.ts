import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    elements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const secret = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
    const boardId = await ctx.db.insert("boards", {
      title: args.title ?? "Untitled Board",
      elements: args.elements ?? "[]",
      secret,
      createdAt: now,
      lastModified: now,
    });
    return { boardId, secret };
  },
});

export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) return null;
    const { secret: _secret, ...rest } = board;
    return rest;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const boards = await ctx.db
      .query("boards")
      .order("desc")
      .take(50);
    return boards.map(({ secret: _secret, ...rest }) => rest);
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    elements: v.string(),
    secret: v.optional(v.string()),
    appState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    // Secret validation: required for MCP writes if board has one
    if (args.secret && board.secret && board.secret !== args.secret) {
      throw new Error("Invalid secret");
    }
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
    // Use createdAt index to find candidates, then check lastModified
    const candidates = await ctx.db
      .query("boards")
      .withIndex("by_created", (q) => q.lt("createdAt", sevenDaysAgo))
      .collect();
    const oldBoards = candidates.filter((b) => b.lastModified < sevenDaysAgo);
    for (const board of oldBoards) {
      await ctx.db.delete(board._id);
    }
    return { deleted: oldBoards.length };
  },
});
