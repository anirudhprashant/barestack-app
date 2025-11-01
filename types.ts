
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: string[];
}

export enum DealStage {
  Lead = 'Lead',
  Qualified = 'Qualified',
  Proposal = 'Proposal',
  Won = 'Won',
  Lost = 'Lost',
}

export interface Deal {
  id: string;
  contactId: string;
  value: number;
  stage: DealStage;
  lastInteraction: string; // ISO date string
}

export enum ProjectStatus {
    Active = 'Active',
    Archived = 'Archived',
    Completed = 'Completed'
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  status: ProjectStatus;
  budget: number;
  estimatedHours: number;
}

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Done = 'Done'
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  assignedTo: string; // userId
  dueDate: string; // ISO date string
  estimatedHours: number;
  status: TaskStatus;
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
  id: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  lineItems: LineItem[];
  taxRate: number; // percentage
  status: InvoiceStatus;
  paidDate?: string;
  paymentMethod?: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  date: string; // ISO date string
  hours: number;
  description: string;
  isBillable: boolean;
}

export enum ExpenseCategory {
    Travel = 'Travel',
    Meals = 'Meals',
    Equipment = 'Equipment',
    Software = 'Software',
    Other = 'Other'
}

export interface Expense {
  id: string;
  date: string; // ISO date string
  category: ExpenseCategory;
  amount: number;
  description: string;
  projectId?: string;
  receiptUrl?: string;
}

export interface RecentActivity {
  id: string;
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
