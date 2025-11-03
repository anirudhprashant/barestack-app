import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listExpenses = query({
  args: {
    projectId: v.optional(v.id("projects")),
    category: v.optional(
      v.union(
        v.literal("Travel"),
        v.literal("Meals"),
        v.literal("Equipment"),
        v.literal("Software"),
        v.literal("Other")
      )
    ),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("expenses");

    if (args.projectId) {
      q = q.withIndex("by_project", (q) =>
        q.eq("projectId", args.projectId)
      );
    }

    if (args.category) {
      q = q.withIndex("by_category", (q) => q.eq("category", args.category));
    }

    return await q.collect();
  },
});

export const createExpense = mutation({
  args: {
    date: v.string(),
    category: v.union(
      v.literal("Travel"),
      v.literal("Meals"),
      v.literal("Equipment"),
      v.literal("Software"),
      v.literal("Other")
    ),
    amount: v.number(),
    description: v.string(),
    projectId: v.optional(v.id("projects")),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expenseId = await ctx.db.insert("expenses", args);

    await ctx.db.insert("activityLog", {
      action: "EXPENSE_ADDED",
      entityType: "expense",
      entityId: expenseId,
      createdAt: new Date().toISOString(),
    });

    return expenseId;
  },
});

export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    date: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("Travel"),
        v.literal("Meals"),
        v.literal("Equipment"),
        v.literal("Software"),
        v.literal("Other")
      )
    ),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
