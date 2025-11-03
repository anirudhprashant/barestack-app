export interface Contact {
  id?: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: string[];
  created_at?: string;
}

export enum DealStage {
  Lead = 'Lead',
  Qualified = 'Qualified',
  Proposal = 'Proposal',
  Won = 'Won',
  Lost = 'Lost',
}

export interface Deal {
  id?: string;
  user_id?: string;
  contact_id: string;
  value: number;
  stage: DealStage;
  last_interaction: string; // ISO date string
  created_at?: string;
}

export enum ProjectStatus {
    Active = 'Active',
    Archived = 'Archived',
    Completed = 'Completed'
}

export interface Project {
  id?: string;
  user_id?: string;
  name: string;
  client_id: string;
  status: ProjectStatus;
  budget: number;
  estimated_hours: number;
  created_at?: string;
}

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Done = 'Done'
}

export interface Task {
  id?: string;
  user_id?: string;
  project_id: string;
  title: string;
  assigned_to: string; // userId
  due_date: string; // ISO date string
  estimated_hours: number;
  status: TaskStatus;
  created_at?: string;
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

export interface Invoice {
  id?: string;
  user_id?: string;
  invoice_number: string;
  client_id: string;
  issue_date: string; // ISO date string
  due_date: string; // ISO date string
  line_items: LineItem[];
  tax_rate: number; // percentage
  status: InvoiceStatus;
  paid_date?: string;
  payment_method?: string;
  created_at?: string;
}

export interface TimeEntry {
  id?: string;
  user_id?: string;
  project_id: string;
  task_id: string;
  date: string; // ISO date string
  hours: number;
  description: string;
  is_billable: boolean;
  created_at?: string;
}

export enum ExpenseCategory {
    Travel = 'Travel',
    Meals = 'Meals',
    Equipment = 'Equipment',
    Software = 'Software',
    Other = 'Other'
}

export interface Expense {
  id?: string;
  user_id?: string;
  date: string; // ISO date string
  category: ExpenseCategory;
  amount: number;
  description: string;
  project_id?: string;
  receipt_url?: string;
  created_at?: string;
}

export interface RecentActivity {
  id?: string;
  user_id?: string;
  timestamp: string; // ISO date string
  type: 'CONTACT_ADDED' | 'PROJECT_CREATED' | 'INVOICE_SENT' | 'TASK_COMPLETED' | 'DEAL_ADDED' | 'EXPENSE_ADDED';
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