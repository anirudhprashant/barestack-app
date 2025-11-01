
import { AppState, DealStage, ProjectStatus, TaskStatus, InvoiceStatus, ExpenseCategory, Contact, Deal, Project, Task, Invoice, TimeEntry, Expense, RecentActivity } from '../types';
import { subDays } from 'date-fns';

// --- MOCK DATA GENERATION ---
export const createInitialData = (): AppState => {
    const contacts: Contact[] = [
        { id: 'c1', name: 'Acme Inc.', email: 'contact@acme.com', phone: '123-456-7890', company: 'Acme Inc.', notes: 'Primary client.', tags: ['Client', 'High-Value'] },
        { id: 'c2', name: 'Stark Industries', email: 'pepper@stark.com', phone: '987-654-3210', company: 'Stark Industries', notes: 'Tech consulting.', tags: ['Client', 'Consulting'] },
        { id: 'c3', name: 'Wayne Enterprises', email: 'lucius@wayne.com', phone: '555-555-5555', company: 'Wayne Enterprises', notes: 'Needs new branding.', tags: ['Lead'] },
    ];

    const deals: Deal[] = [
        { id: 'd1', contactId: 'c1', value: 50000, stage: DealStage.Won, lastInteraction: subDays(new Date(), 5).toISOString() },
        { id: 'd2', contactId: 'c2', value: 75000, stage: DealStage.Proposal, lastInteraction: subDays(new Date(), 2).toISOString() },
        { id: 'd3', contactId: 'c3', value: 25000, stage: DealStage.Qualified, lastInteraction: subDays(new Date(), 10).toISOString() },
    ];

    const projects: Project[] = [
        { id: 'p1', name: 'Website Redesign', clientId: 'c1', status: ProjectStatus.Active, budget: 20000, estimatedHours: 200 },
        { id: 'p2', name: 'Mobile App Dev', clientId: 'c2', status: ProjectStatus.Active, budget: 50000, estimatedHours: 450 },
        { id: 'p3', name: 'Branding Guide', clientId: 'c1', status: ProjectStatus.Completed, budget: 5000, estimatedHours: 50 },
    ];

    const tasks: Task[] = [
        { id: 't1', projectId: 'p1', title: 'Design mockups', assignedTo: 'u1', dueDate: new Date().toISOString(), estimatedHours: 20, status: TaskStatus.Done },
        { id: 't2', projectId: 'p1', title: 'Develop homepage', assignedTo: 'u1', dueDate: new Date().toISOString(), estimatedHours: 40, status: TaskStatus.InProgress },
        { id: 't3', projectId: 'p1', title: 'Setup CMS', assignedTo: 'u1', dueDate: new Date().toISOString(), estimatedHours: 30, status: TaskStatus.ToDo },
        { id: 't4', projectId: 'p2', title: 'API Integration', assignedTo: 'u1', dueDate: new Date().toISOString(), estimatedHours: 80, status: TaskStatus.InProgress },
    ];

    const invoices: Invoice[] = [
        { id: 'i1', invoiceNumber: '2024-001', clientId: 'c1', issueDate: subDays(new Date(), 30).toISOString(), dueDate: subDays(new Date(), 0).toISOString(), lineItems: [{ id: 'li1', description: 'Design Mockups', quantity: 20, rate: 100 }], taxRate: 10, status: InvoiceStatus.Sent },
        { id: 'i2', invoiceNumber: '2024-002', clientId: 'c2', issueDate: subDays(new Date(), 15).toISOString(), dueDate: subDays(new Date(), -15).toISOString(), lineItems: [{ id: 'li2', description: 'Initial Consulting', quantity: 10, rate: 150 }], taxRate: 0, status: InvoiceStatus.Paid, paidDate: subDays(new Date(), 5).toISOString() },
        { id: 'i3', invoiceNumber: '2024-003', clientId: 'c1', issueDate: subDays(new Date(), 45).toISOString(), dueDate: subDays(new Date(), 15).toISOString(), lineItems: [{ id: 'li3', description: 'Branding Guide', quantity: 1, rate: 5000 }], taxRate: 10, status: InvoiceStatus.Overdue },
    ];

    const timeEntries: TimeEntry[] = [
        ...Array.from({ length: 5 }, (_, i) => ({ id: `te${i}`, projectId: 'p1', taskId: 't2', date: subDays(new Date(), i).toISOString(), hours: 4, description: 'Homepage dev', isBillable: true })),
        ...Array.from({ length: 3 }, (_, i) => ({ id: `te${i+5}`, projectId: 'p2', taskId: 't4', date: subDays(new Date(), i).toISOString(), hours: 5, description: 'API work', isBillable: true })),
    ];

    const expenses: Expense[] = [
        { id: 'e1', date: subDays(new Date(), 10).toISOString(), category: ExpenseCategory.Software, amount: 99.00, description: 'Figma Subscription' },
        { id: 'e2', date: subDays(new Date(), 5).toISOString(), category: ExpenseCategory.Meals, amount: 45.50, description: 'Client Lunch', projectId: 'p1' },
    ];

    const recentActivity: RecentActivity[] = [
      { id: 'ra1', timestamp: subDays(new Date(), 1).toISOString(), type: 'CONTACT_ADDED', description: 'Added new contact: Wayne Enterprises'},
      { id: 'ra2', timestamp: subDays(new Date(), 2).toISOString(), type: 'TASK_COMPLETED', description: 'Task "Design mockups" completed for project Website Redesign'},
      { id: 'ra3', timestamp: subDays(new Date(), 3).toISOString(), type: 'INVOICE_SENT', description: 'Invoice #2024-001 sent to Acme Inc.'},
      { id: 'ra4', timestamp: subDays(new Date(), 4).toISOString(), type: 'PROJECT_CREATED', description: 'New project created: Mobile App Dev'},
    ];


    return { contacts, deals, projects, tasks, invoices, timeEntries, expenses, recentActivity };
};
