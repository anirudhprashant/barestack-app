import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").collect();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .collect();
    
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", "Sent"))
      .collect();
    
    const unpaidTotal = invoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0
    );

    const startOfWeek = getStartOfWeek();
    const endOfWeek = getEndOfWeek();
    
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startOfWeek),
          q.lte(q.field("date"), endOfWeek)
        )
      )
      .collect();
    
    const hoursThisWeek = timeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0
    );

    const activeTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "In Progress"))
      .collect();

    return {
      total_contacts: contacts.length,
      active_projects: projects.length,
      unpaid_invoices_total: unpaidTotal,
      hours_this_week: hoursThisWeek,
      active_tasks: activeTasks.length,
    };
  },
});

export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("activityLog")
      .withIndex("by_created_at")
      .order("desc")
      .take(10);
  },
});

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
}

function getEndOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + 6;
  const endOfWeek = new Date(now.setDate(diff));
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek.toISOString();
}
