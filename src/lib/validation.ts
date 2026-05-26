import { z } from 'zod';

// Sanitize and validate IDs to prevent filter injection
export const safeId = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format');

export function sanitizeId(id: unknown): string {
    const result = safeId.safeParse(id);
    if (!result.success) {
        throw new Error('Invalid ID format');
    }
    return result.data;
}

// Contact validation
export const ContactSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Invalid email').max(255),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    tags: z.array(z.string().max(100)).max(50).optional(),
});

export type ValidatedContact = z.infer<typeof ContactSchema>;

// Deal validation
export const DealSchema = z.object({
    contact_id: z.string().min(1),
    value: z.number().min(1),
    stage: z.enum(['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']),
    last_interaction: z.string().optional(),
});

export type ValidatedDeal = z.infer<typeof DealSchema>;

// Project validation
export const ProjectSchema = z.object({
    name: z.string().min(1).max(255),
    client_id: z.string().min(1),
    status: z.enum(['Active', 'Completed', 'Archived']),
    budget: z.number().min(0).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().max(1000).optional(),
});

export type ValidatedProject = z.infer<typeof ProjectSchema>;

// Task validation
export const TaskSchema = z.object({
    title: z.string().min(1).max(255),
    project_id: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    priority: z.enum(['low', 'medium', 'high']),
    due_date: z.string().optional(),
    description: z.string().max(1000).optional(),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;

// Invoice validation
export const LineItemSchema = z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().min(0),
    rate: z.number().min(0),
});

export const InvoiceSchema = z.object({
    invoice_number: z.string().min(1).max(50),
    client_id: z.string().min(1),
    issue_date: z.string(),
    due_date: z.string(),
    line_items: z.array(LineItemSchema).min(1, 'At least one line item required'),
    tax_rate: z.number().min(0).max(100),
    status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']),
});

export type ValidatedInvoice = z.infer<typeof InvoiceSchema>;

// Time entry validation
export const TimeEntrySchema = z.object({
    description: z.string().max(500).optional(),
    project_id: z.string().optional(),
    duration: z.number().min(0),
    date: z.string(),
});

export type ValidatedTimeEntry = z.infer<typeof TimeEntrySchema>;

// Expense validation
export const ExpenseSchema = z.object({
    description: z.string().min(1).max(500),
    amount: z.number().min(0),
    category: z.enum(['travel', 'meals', 'supplies', 'software', 'other']),
    project_id: z.string().optional(),
    date: z.string(),
    receipt: z.string().optional(),
});

export type ValidatedExpense = z.infer<typeof ExpenseSchema>;

// Note validation
export const NoteSchema = z.object({
    title: z.string().min(1).max(255),
    content: z.string().max(10000),
    contact_id: z.string().optional(),
    project_id: z.string().optional(),
});

export type ValidatedNote = z.infer<typeof NoteSchema>;

// Import batch validation
export const ImportBatchSchema = z.object({
    name: z.string().min(1).max(255),
    total_records: z.number().int().min(0),
    imported_records: z.number().int().min(0),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
});

export type ValidatedImportBatch = z.infer<typeof ImportBatchSchema>;

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errors}`);
    }
    return result.data;
}

// Sanitize string input (strip leading/trailing whitespace, collapse multiple spaces)
export function sanitizeString(str: unknown, maxLength = 255): string {
    if (typeof str !== 'string') throw new Error('Expected string');
    return str.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

// Sanitize array input (filter out invalid items)
export function sanitizeArray(arr: unknown): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
        .filter(item => typeof item === 'string')
        .map(item => (item as string).trim())
        .filter(Boolean);
}
