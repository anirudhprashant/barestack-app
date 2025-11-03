import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listContacts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").collect();
  },
});

export const createContact = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const contactId = await ctx.db.insert("contacts", args);
    await ctx.db.insert("activityLog", {
      action: "CONTACT_ADDED",
      entityType: "contact",
      entityId: contactId,
      createdAt: new Date().toISOString(),
    });
    return contactId;
  },
});

export const updateContact = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteContact = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const listDeals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("deals").collect();
  },
});

export const createDeal = mutation({
  args: {
    contactId: v.id("contacts"),
    value: v.number(),
    stage: v.union(
      v.literal("Lead"),
      v.literal("Qualified"),
      v.literal("Proposal"),
      v.literal("Won"),
      v.literal("Lost")
    ),
  },
  handler: async (ctx, args) => {
    const dealId = await ctx.db.insert("deals", {
      ...args,
      lastInteraction: new Date().toISOString(),
    });

    await ctx.db.insert("activityLog", {
      action: "DEAL_ADDED",
      entityType: "deal",
      entityId: dealId,
      createdAt: new Date().toISOString(),
    });

    return dealId;
  },
});

export const updateDeal = mutation({
  args: {
    id: v.id("deals"),
    contactId: v.optional(v.id("contacts")),
    value: v.optional(v.number()),
    stage: v.optional(
      v.union(
        v.literal("Lead"),
        v.literal("Qualified"),
        v.literal("Proposal"),
        v.literal("Won"),
        v.literal("Lost")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      lastInteraction: new Date().toISOString(),
    });
  },
});

export const deleteDeal = mutation({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
