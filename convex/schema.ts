import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // CRM
  contacts: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_company", ["company"]),

  deals: defineTable({
    contactId: v.id("contacts"),
    value: v.number(),
    stage: v.union(
      v.literal("Lead"),
      v.literal("Qualified"),
      v.literal("Proposal"),
      v.literal("Won"),
      v.literal("Lost")
    ),
    lastInteraction: v.string(),
  })
    .index("by_contact", ["contactId"])
    .index("by_stage", ["stage"]),

  // Projects
  projects: defineTable({
    name: v.string(),
    clientId: v.id("contacts"),
    status: v.union(
      v.literal("Active"),
      v.literal("Archived"),
      v.literal("Completed")
    ),
    budget: v.number(),
    estimatedHours: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    assignedTo: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    estimatedHours: v.number(),
    status: v.union(
      v.literal("To Do"),
      v.literal("In Progress"),
      v.literal("Done")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // Invoicing
  invoices: defineTable({
    invoiceNumber: v.string(),
    clientId: v.id("contacts"),
    issueDate: v.string(),
    dueDate: v.string(),
    taxRate: v.number(),
    totalAmount: v.number(),
    status: v.union(
      v.literal("Draft"),
      v.literal("Sent"),
      v.literal("Paid"),
      v.literal("Overdue")
    ),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_invoice_number", ["invoiceNumber"]),

  lineItems: defineTable({
    invoiceId: v.id("invoices"),
    description: v.string(),
    quantity: v.number(),
    rate: v.number(),
  }).index("by_invoice", ["invoiceId"]),

  // Time Tracking
  timeEntries: defineTable({
    projectId: v.id("projects"),
    taskId: v.optional(v.id("tasks")),
    date: v.string(),
    hours: v.number(),
    description: v.string(),
    isBillable: v.boolean(),
  })
    .index("by_project", ["projectId"])
    .index("by_task", ["taskId"])
    .index("by_date", ["date"]),

  // Expenses
  expenses: defineTable({
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
  })
    .index("by_project", ["projectId"])
    .index("by_category", ["category"])
    .index("by_date", ["date"]),

  // Activity Log
  activityLog: defineTable({
    userId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    createdAt: v.string(),
  }).index("by_created_at", ["createdAt"]),
});
