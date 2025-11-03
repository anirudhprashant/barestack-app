import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listTimeEntries = query({
  args: {
    projectId: v.optional(v.id("projects")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const baseQuery = args.projectId
      ? ctx.db
          .query("timeEntries")
          .withIndex("by_project", (q) =>
            q.eq("projectId", args.projectId)
          )
      : ctx.db.query("timeEntries");

    let entries = await baseQuery.collect();

    if (args.startDate || args.endDate) {
      entries = entries.filter((entry) => {
        if (args.startDate && entry.date < args.startDate) return false;
        if (args.endDate && entry.date > args.endDate) return false;
        return true;
      });
    }

    return entries;
  },
});

export const createTimeEntry = mutation({
  args: {
    projectId: v.id("projects"),
    taskId: v.optional(v.id("tasks")),
    date: v.string(),
    hours: v.number(),
    description: v.string(),
    isBillable: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timeEntries", args);
  },
});

export const updateTimeEntry = mutation({
  args: {
    id: v.id("timeEntries"),
    hours: v.optional(v.number()),
    description: v.optional(v.string()),
    isBillable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteTimeEntry = mutation({
  args: { id: v.id("timeEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
