import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';
import { sanitizeId } from './validation';

// --- Generic CRUD helpers ---
async function create<T extends RecordModel>(
    collection: string,
    data: Partial<T>
): Promise<T> {
    return pb.collection(collection).create<T>(data) as Promise<T>;
}

async function update<T extends RecordModel>(
    collection: string,
    id: string,
    data: Partial<T>
): Promise<T> {
    return pb.collection(collection).update<T>(id, data) as Promise<T>;
}

async function remove(collection: string, id: string): Promise<void> {
    await pb.collection(collection).delete(id);
}

async function getOne<T extends RecordModel>(
    collection: string,
    id: string
): Promise<T> {
    return pb.collection(collection).getOne<T>(id) as Promise<T>;
}

async function getList<T extends RecordModel>(
    collection: string,
    options?: {
        filter?: string;
        sort?: string;
        expand?: string;
        skip?: number;
        limit?: number;
    }
): Promise<{ items: T[]; totalItems: number }> {
    const fetchOptions: Record<string, unknown> = {
        filter: options?.filter,
        sort: options?.sort,
    };
    if (options?.expand) {
        fetchOptions.expand = options.expand;
    }
    const { items, totalItems } = await pb.collection(collection).getList<T>(
        options?.skip || 1,
        options?.limit || 500,
        fetchOptions
    );
    return { items, totalItems };
}

// --- Table-specific API functions ---

// contacts
export async function fetchContacts(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('contacts', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createContact(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('contacts', data);
}

export async function updateContact(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('contacts', id, data);
}

export async function deleteContact(id: string): Promise<void> {
    return remove('contacts', id);
}

// deals
export async function fetchDeals(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('deals', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createDeal(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('deals', data);
}

export async function updateDeal(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('deals', id, data);
}

export async function deleteDeal(id: string): Promise<void> {
    return remove('deals', id);
}

// projects
export async function fetchProjects(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('projects', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createProject(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('projects', data);
}

export async function updateProject(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('projects', id, data);
}

export async function deleteProject(id: string): Promise<void> {
    return remove('projects', id);
}

// tasks
export async function fetchTasks(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('tasks', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createTask(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('tasks', data);
}

export async function updateTask(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('tasks', id, data);
}

export async function deleteTask(id: string): Promise<void> {
    return remove('tasks', id);
}

// invoices
export async function fetchInvoices(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('invoices', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createInvoice(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('invoices', data);
}

export async function updateInvoice(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('invoices', id, data);
}

export async function deleteInvoice(id: string): Promise<void> {
    return remove('invoices', id);
}

// time_entries
export async function fetchTimeEntries(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('time_entries', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createTimeEntry(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('time_entries', data);
}

export async function updateTimeEntry(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('time_entries', id, data);
}

export async function deleteTimeEntry(id: string): Promise<void> {
    return remove('time_entries', id);
}

// expenses
export async function fetchExpenses(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('expenses', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createExpense(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('expenses', data);
}

export async function updateExpense(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('expenses', id, data);
}

export async function deleteExpense(id: string): Promise<void> {
    return remove('expenses', id);
}

// recent_activity
export async function fetchRecentActivity(userId: string, limit = 20): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('recent_activity', {
        filter: `user="${safeId}"`,
        sort: '-timestamp',
        limit,
    });
    return result.items;
}

export async function createRecentActivity(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('recent_activity', data);
}

// notes
export async function fetchNotes(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('notes', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createNote(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('notes', data);
}

export async function updateNote(id: string, data: Partial<RecordModel>): Promise<RecordModel> {
    return update('notes', id, data);
}

export async function deleteNote(id: string): Promise<void> {
    return remove('notes', id);
}

// import_batches
export async function fetchImportBatches(userId: string): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const result = await getList('import_batches', {
        filter: `user="${safeId}"`,
        sort: '-id',
    });
    return result.items;
}

export async function createImportBatch(data: Partial<RecordModel>): Promise<RecordModel> {
    return create('import_batches', data);
}

export async function deleteImportBatch(id: string): Promise<void> {
    return remove('import_batches', id);
}

// Bulk contact insert for imports
export async function createContactsBulk(
    contacts: Partial<RecordModel>[]
): Promise<RecordModel[]> {
    return pb.collection('contacts').create(contacts) as Promise<RecordModel[]>;
}
