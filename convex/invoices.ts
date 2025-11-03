import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invoices").collect();
  },
});

export const listLineItems = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

export const getInvoice = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) return null;

    const lineItems = await ctx.db
      .query("lineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .collect();

    return { ...invoice, lineItems };
  },
});

export const createInvoice = mutation({
  args: {
    invoiceNumber: v.string(),
    clientId: v.id("contacts"),
    issueDate: v.string(),
    dueDate: v.string(),
    taxRate: v.number(),
    status: v.union(
      v.literal("Draft"),
      v.literal("Sent"),
      v.literal("Paid"),
      v.literal("Overdue")
    ),
    lineItems: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        rate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { lineItems, ...invoiceData } = args;

    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const totalAmount = subtotal + subtotal * invoiceData.taxRate;

    const invoiceId = await ctx.db.insert("invoices", {
      ...invoiceData,
      totalAmount,
    });

    for (const item of lineItems) {
      await ctx.db.insert("lineItems", {
        invoiceId,
        ...item,
      });
    }

    await ctx.db.insert("activityLog", {
      action: "INVOICE_SENT",
      entityType: "invoice",
      entityId: invoiceId,
      createdAt: new Date().toISOString(),
    });

    return invoiceId;
  },
});

export const updateInvoice = mutation({
  args: {
    id: v.id("invoices"),
    status: v.optional(
      v.union(
        v.literal("Draft"),
        v.literal("Sent"),
        v.literal("Paid"),
        v.literal("Overdue")
      )
    ),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const lineItems = await ctx.db
      .query("lineItems")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .collect();

    for (const item of lineItems) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
  },
});
