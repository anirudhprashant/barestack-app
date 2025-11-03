import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const contactId = await ctx.db.insert("contacts", {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "555-0123",
      company: "Tech Corp",
      notes: "Sample contact",
      tags: ["prospect", "tech"],
    });

    const projectId = await ctx.db.insert("projects", {
      name: "Website Redesign",
      clientId: contactId,
      status: "Active",
      budget: 10000,
      estimatedHours: 80,
    });

    await ctx.db.insert("tasks", {
      projectId: projectId,
      title: "Design homepage mockup",
      status: "To Do",
      estimatedHours: 8,
    });

    return { success: true, message: "Database seeded!" };
  },
});
