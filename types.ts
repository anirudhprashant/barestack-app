import type { Doc, Id } from "./convex/_generated/dataModel";

export type Contact = Doc<"contacts">;

export enum DealStage {
  Lead = "Lead",
  Qualified = "Qualified",
  Proposal = "Proposal",
  Won = "Won",
  Lost = "Lost",
}

export type Deal = Doc<"deals">;

export enum ProjectStatus {
  Active = "Active",
  Archived = "Archived",
  Completed = "Completed",
}

export type Project = Doc<"projects">;

export enum TaskStatus {
  ToDo = "To Do",
  InProgress = "In Progress",
  Done = "Done",
}

export type Task = Doc<"tasks">;

export enum InvoiceStatus {
  Draft = "Draft",
  Sent = "Sent",
  Paid = "Paid",
  Overdue = "Overdue",
}

export type LineItem = Doc<"lineItems">;

export type Invoice = Doc<"invoices">;

export type TimeEntry = Doc<"timeEntries">;

export enum ExpenseCategory {
  Travel = "Travel",
  Meals = "Meals",
  Equipment = "Equipment",
  Software = "Software",
  Other = "Other",
}

export type Expense = Doc<"expenses">;

export type RecentActivityType =
  | "CONTACT_ADDED"
  | "PROJECT_CREATED"
  | "INVOICE_SENT"
  | "TASK_COMPLETED"
  | "DEAL_ADDED"
  | "EXPENSE_ADDED";

export interface RecentActivity {
  id: string;
  timestamp: string;
  type: RecentActivityType;
  description: string;
}

export interface AppState {
  contacts: Contact[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  timeEntries: TimeEntry[];
  expenses: Expense[];
  recentActivity: RecentActivity[];
}

export type ContactId = Id<"contacts">;
export type ProjectId = Id<"projects">;
export type TaskId = Id<"tasks">;
export type InvoiceId = Id<"invoices">;
export type ExpenseId = Id<"expenses">;
