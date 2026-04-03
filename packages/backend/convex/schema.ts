import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  boards: defineTable({
    title: v.string(),
    elements: v.string(),
    appState: v.optional(v.string()),
    createdAt: v.number(),
    lastModified: v.number(),
  }).index("by_created", ["createdAt"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});
