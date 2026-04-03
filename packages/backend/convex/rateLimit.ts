import { mutation } from "./_generated/server";
import { v } from "convex/values";

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 30; // 30 requests per minute

export const check = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing) {
      await ctx.db.insert("rateLimits", {
        key: args.key,
        count: 1,
        windowStart: now,
      });
      return { allowed: true, remaining: MAX_REQUESTS - 1 };
    }

    if (now - existing.windowStart > WINDOW_MS) {
      await ctx.db.patch(existing._id, {
        count: 1,
        windowStart: now,
      });
      return { allowed: true, remaining: MAX_REQUESTS - 1 };
    }

    if (existing.count >= MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });
    return { allowed: true, remaining: MAX_REQUESTS - existing.count - 1 };
  },
});
