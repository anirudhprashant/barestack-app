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
    status: z.enum(['To Do', 'In Progress', 'Done']),
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
    status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']),
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
    category: z.enum(['Travel', 'Meals', 'Equipment', 'Software', 'Other']),
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

// ---------------------------------------------------------------------------
// Defense-in-depth create-payload sanitizer.
//
// Zod schemas above are intentionally NOT used to validate creates: they have
// diverged from the live `types.ts` / PocketBase shapes, so validate() would
// reject valid traffic. Instead this layer enforces only the security-relevant
// bounds that match the REAL server field constraints (verified against the
// pb_migrations files) and is FAIL-SOFT: oversized strings are truncated,
// out-of-enum selects are dropped, numbers are clamped — it never throws on
// valid app data, so business logic is unchanged; PocketBase remains the final
// arbiter. Applied at the single chokepoint src/lib/api.ts create().
// ---------------------------------------------------------------------------

// Field caps keyed to the live PocketBase collections (text max + enums + known fields).
// Matches values verified in pb_migrations/1779676001983_*.js .. 1779676001992_*.js.
type FieldRule =
    | { kind: 'text'; max: number }
    | { kind: 'select'; values: readonly string[] }
    | { kind: 'num'; min: number; max: number }
    | { kind: 'json_array'; maxItems: number; item: { description: number; quantity: number; rate: number } };

const COLLECTION_RULES: Record<string, Record<string, FieldRule>> = {
    contacts: {
        name: { kind: 'text', max: 500 },
        phone: { kind: 'text', max: 100 },
        company: { kind: 'text', max: 500 },
        tags: { kind: 'text', max: 1000 },
        import_batch_id: { kind: 'text', max: 100 },
    },
    deals: {
        contact_id: { kind: 'text', max: 100 },
        stage: { kind: 'select', values: ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const },
        value: { kind: 'num', min: 0, max: 1e15 },
        last_interaction: { kind: 'text', max: 100 },
    },
    projects: {
        name: { kind: 'text', max: 500 },
        client_id: { kind: 'text', max: 100 },
        status: { kind: 'select', values: ['Active', 'Completed', 'Archived'] as const },
        budget: { kind: 'num', min: 0, max: 1e15 },
        estimated_hours: { kind: 'num', min: 0, max: 1e9 },
    },
    tasks: {
        title: { kind: 'text', max: 1000 },
        project_id: { kind: 'text', max: 100 },
        assigned_to: { kind: 'text', max: 200 },
        due_date: { kind: 'text', max: 100 },
        status: { kind: 'select', values: ['To Do', 'In Progress', 'Done'] as const },
    },
    invoices: {
        invoice_number: { kind: 'text', max: 100 },
        client_id: { kind: 'text', max: 100 },
        issue_date: { kind: 'text', max: 100 },
        due_date: { kind: 'text', max: 100 },
        payment_method: { kind: 'text', max: 200 },
        paid_date: { kind: 'text', max: 100 },
        status: { kind: 'select', values: ['Draft', 'Sent', 'Paid', 'Overdue'] as const },
        tax_rate: { kind: 'num', min: 0, max: 100 },
        line_items: { kind: 'json_array', maxItems: 500, item: { description: 500, quantity: 1e9, rate: 1e15 } },
    },
    time_entries: {
        project_id: { kind: 'text', max: 100 },
        task_id: { kind: 'text', max: 100 },
        description: { kind: 'text', max: 5000 },
        date: { kind: 'text', max: 100 },
        hours: { kind: 'num', min: 0, max: 1e9 },
    },
    expenses: {
        project_id: { kind: 'text', max: 100 },
        date: { kind: 'text', max: 100 },
        receipt_url: { kind: 'text', max: 2000 },
        description: { kind: 'text', max: 2000 },
        amount: { kind: 'num', min: 0, max: 1e15 },
        category: { kind: 'select', values: ['Travel', 'Meals', 'Equipment', 'Software', 'Other'] as const },
    },
    notes: {
        contact_id: { kind: 'text', max: 100 },
        content: { kind: 'text', max: 50000 },
    },
    recent_activity: {
        timestamp: { kind: 'text', max: 100 },
        description: { kind: 'text', max: 2000 },
        type: {
            kind: 'select',
            values: ['CONTACT_ADDED', 'PROJECT_CREATED', 'INVOICE_CREATED', 'INVOICE_SENT', 'TASK_COMPLETED', 'DEAL_ADDED', 'EXPENSE_ADDED'] as const,
        },
    },
    import_batches: {
        file_name: { kind: 'text', max: 500 },
        contact_count: { kind: 'num', min: 0, max: 1e9 },
    },
};

export const ALLOWED_CREATE_COLLECTIONS = Object.keys(COLLECTION_RULES);

function clampText(value: unknown, max: number): unknown {
    if (typeof value !== 'string') return value;
    return value.length > max ? value.slice(0, max) : value;
}

function clampNum(value: unknown, min: number, max: number): unknown {
    if (typeof value !== 'number' || !Number.isFinite(value)) return value;
    return Math.min(Math.max(value, min), max);
}

// Sanitize a single create payload for a known collection. Fail-soft: never throws.
// Returns a shallow-cloned object so the caller's input is not mutated.
export function sanitizeCreatePayload(collection: string, data: Record<string, unknown>): Record<string, unknown> {
    const rules = COLLECTION_RULES[collection];
    if (!rules) {
        // Unknown collection — do not mutate. Callers must use ALLOWED_CREATE_COLLECTIONS
        // to gate which collections reach create() at all.
        return data;
    }
    const out: Record<string, unknown> = { ...data };
    // The client must never assert a record id on create (ImportModal duplicate "create new"
    // path carries an existing id; PocketBase usually ignores it, but strip it for safety).
    delete out.id;
    for (const [field, rule] of Object.entries(rules)) {
        if (!(field in out)) continue;
        const v = out[field];
        switch (rule.kind) {
            case 'text':
                out[field] = clampText(v, rule.max);
                break;
            case 'select':
                // Drop an out-of-enum value rather than throw — server is final arbiter.
                if (typeof v === 'string' && !rule.values.includes(v)) delete out[field];
                break;
            case 'num':
                out[field] = clampNum(v, rule.min, rule.max);
                break;
            case 'json_array': {
                if (Array.isArray(v)) {
                    const capped = v.slice(0, rule.maxItems).map((item: Record<string, unknown>) => {
                        if (!item || typeof item !== 'object') return item;
                        const clean: Record<string, unknown> = { ...item };
                        clean.description = clampText(item.description, rule.item.description);
                        clean.quantity = clampNum(item.quantity, 0, rule.item.quantity);
                        clean.rate = clampNum(item.rate, 0, rule.item.rate);
                        return clean;
                    });
                    out[field] = capped;
                }
                break;
            }
        }
    }
    return out;
}
