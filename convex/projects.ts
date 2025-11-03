import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").collect();
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    clientId: v.id("contacts"),
    status: v.union(
      v.literal("Active"),
      v.literal("Archived"),
      v.literal("Completed")
    ),
    budget: v.number(),
    estimatedHours: v.number(),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", args);

    await ctx.db.insert("activityLog", {
      action: "PROJECT_CREATED",
      entityType: "project",
      entityId: projectId,
      createdAt: new Date().toISOString(),
    });

    return projectId;
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    clientId: v.optional(v.id("contacts")),
    status: v.optional(
      v.union(
        v.literal("Active"),
        v.literal("Archived"),
        v.literal("Completed")
      )
    ),
    budget: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const listTasks = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    if (args.projectId) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();
    }
    return await ctx.db.query("tasks").collect();
  },
});

export const createTask = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", args);
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("To Do"),
        v.literal("In Progress"),
        v.literal("Done")
      )
    ),
    assignedTo: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    estimatedHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    if (updates.status === "Done") {
      await ctx.db.insert("activityLog", {
        action: "TASK_COMPLETED",
        entityType: "task",
        entityId: id,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
