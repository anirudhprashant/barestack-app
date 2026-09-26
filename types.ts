// Fields PocketBase manages itself. `created` / `updated` are autodate fields
// (empty on rows that predate migration 1780800000).
interface ServerFields {
  id?: string;
  user?: string;
  created?: string;
  updated?: string;
}

export type Creatable<T> = Omit<T, 'id' | 'user' | 'created' | 'updated'>;

export interface Contact extends ServerFields {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  import_batch_id?: string;
}

export enum DealStage {
  Lead = 'Lead',
  Qualified = 'Qualified',
  Proposal = 'Proposal',
  Won = 'Won',
  Lost = 'Lost',
}

export interface Deal extends ServerFields {
  contact_id: string;
  title?: string;
  value: number;
  stage: DealStage;
  last_interaction: string; // ISO date string
  expected_close?: string; // date-only
}

export enum ProjectStatus {
  Active = 'Active',
  Archived = 'Archived',
  Completed = 'Completed'
}

export interface Project extends ServerFields {
  name: string;
  client_id: string;
  status: ProjectStatus;
  budget: number;
  estimated_hours: number;
  hourly_rate?: number;
  description?: string;
  due_date?: string; // date-only
}

export enum TaskStatus {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done'
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export interface Task extends ServerFields {
  project_id: string;
  title: string;
  description?: string;
  assigned_to: string; // userId
  due_date: string; // date-only
  estimated_hours: number;
  status: TaskStatus;
  priority?: TaskPriority | '';
}

export enum InvoiceStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Paid = 'Paid',
  Overdue = 'Overdue'
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice extends ServerFields {
  invoice_number: string;
  client_id: string;
  issue_date: string; // date-only
  due_date: string; // date-only
  line_items: LineItem[];
  tax_rate: number; // percentage
  status: InvoiceStatus;
  paid_date?: string;
  payment_method?: string;
  notes?: string;
  recurrence?: Recurrence | '';
  next_issue_date?: string; // date-only; when the next copy is created
}

export type Recurrence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Read-only copy of an invoice that a client can open from a link.
export interface InvoiceShareSnapshot {
  invoice: Pick<Invoice, 'invoice_number' | 'issue_date' | 'due_date' | 'line_items' | 'tax_rate' | 'status' | 'paid_date' | 'notes'>;
  client: Pick<Contact, 'name' | 'company' | 'email' | 'phone'>;
  business: BusinessProfile;
  user: UserProfile;
}

export interface InvoiceShare extends ServerFields {
  id: string;
  invoice_id: string;
  token: string;
  snapshot: InvoiceShareSnapshot;
}

export interface TimeEntry extends ServerFields {
  project_id: string;
  task_id: string;
  date: string; // date-only
  hours: number;
  description: string;
  is_billable: boolean;
  invoice_id?: string; // set once billed
}

export enum ExpenseCategory {
  Travel = 'Travel',
  Meals = 'Meals',
  Equipment = 'Equipment',
  Software = 'Software',
  Other = 'Other'
}

export interface Expense extends ServerFields {
  date: string; // date-only
  category: ExpenseCategory;
  amount: number;
  description: string;
  project_id?: string;
  receipt_url?: string;
}

// Keep in sync with pb_migrations/1780800000_v1_1_schema.js,
// pb_hooks/integrity.pb.js and src/lib/validation.ts (checked by a unit test).
export const ACTIVITY_TYPES = [
  'CONTACT_ADDED',
  'PROJECT_CREATED',
  'INVOICE_CREATED',
  'INVOICE_UPDATED',
  'INVOICE_SENT',
  'INVOICE_PAID',
  'INVOICE_DELETED',
  'TASK_COMPLETED',
  'DEAL_ADDED',
  'DEAL_WON',
  'EXPENSE_ADDED',
  'TIME_LOGGED',
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

export interface RecentActivity extends ServerFields {
  timestamp: string; // ISO date string
  type: ActivityType;
  description: string;
}

export interface Note extends ServerFields {
  id: string;
  contact_id: string;
  content: string;
}

export interface ImportBatch extends ServerFields {
  id: string;
  contact_count: number;
  file_name: string;
}

export interface BusinessProfile extends ServerFields {
  business_name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  tax_id: string;
  currency: string; // ISO 4217, e.g. USD
  default_tax_rate: number;
  payment_terms_days: number;
  payment_instructions: string;
  invoice_prefix: string;
  invoice_footer: string;
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
  notes: Note[];
  importBatches: ImportBatch[];
  invoiceShares: InvoiceShare[];
  businessProfile: BusinessProfile;
  userProfile: UserProfile;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
}
