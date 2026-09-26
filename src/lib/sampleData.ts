import { addDays, format, subDays, subMonths } from 'date-fns';
import { Backup, BACKUP_FORMAT, BACKUP_VERSION } from './backup';

// A small, believable agency: a few clients, a pipeline, active projects with
// logged time, and invoices spread over recent months so the dashboard and
// reports have something to show. Dates are relative to today. Every contact
// carries the SAMPLE_TAG so the whole set can be removed again.
export const SAMPLE_TAG = 'sample';

const day = (d: Date) => `${format(d, 'yyyy-MM-dd')} 00:00:00.000Z`;

export function buildSampleBackup(today: Date = new Date()): Backup {
    const ago = (n: number) => day(subDays(today, n));
    const ahead = (n: number) => day(addDays(today, n));
    const monthsAgo = (n: number, d = 5) => day(new Date(subMonths(today, n).getFullYear(), subMonths(today, n).getMonth(), d));
    const y = today.getFullYear();

    const contacts = [
        { id: 's_c1', name: 'Maya Chen', email: 'maya@northwind.example', phone: '+1 415 555 0142', company: 'Northwind Coffee', tags: [SAMPLE_TAG, 'retainer'] },
        { id: 's_c2', name: 'Jonas Weber', email: 'jonas@alpenlabs.example', phone: '+49 30 5550 1987', company: 'Alpen Labs', tags: [SAMPLE_TAG, 'saas'] },
        { id: 's_c3', name: 'Priya Raman', email: 'priya@lumenhealth.example', phone: '+44 20 5550 7781', company: 'Lumen Health', tags: [SAMPLE_TAG, 'enterprise'] },
        { id: 's_c4', name: 'Diego Alvarez', email: 'diego@casaverde.example', phone: '', company: 'Casa Verde', tags: [SAMPLE_TAG, 'lead'] },
    ];

    const deals = [
        { id: 's_d1', contact_id: 's_c1', title: 'Brand refresh retainer', value: 12000, stage: 'Won', last_interaction: ago(40), expected_close: ago(45) },
        { id: 's_d2', contact_id: 's_c2', title: 'Marketing site rebuild', value: 18500, stage: 'Won', last_interaction: ago(20), expected_close: ago(25) },
        { id: 's_d3', contact_id: 's_c3', title: 'Patient portal UX audit', value: 9000, stage: 'Proposal', last_interaction: ago(3), expected_close: ahead(12) },
        { id: 's_d4', contact_id: 's_c4', title: 'E-commerce launch', value: 15000, stage: 'Qualified', last_interaction: ago(6), expected_close: ahead(30) },
        { id: 's_d5', contact_id: 's_c3', title: 'Accessibility review', value: 4500, stage: 'Lost', last_interaction: ago(60), expected_close: ago(50) },
    ];

    const projects = [
        { id: 's_p1', name: 'Northwind brand refresh', client_id: 's_c1', status: 'Active', budget: 12000, estimated_hours: 90, hourly_rate: 120, description: 'Logo, packaging and in-store signage.', due_date: ahead(21) },
        { id: 's_p2', name: 'Alpen Labs website', client_id: 's_c2', status: 'Active', budget: 18500, estimated_hours: 140, hourly_rate: 130, description: 'Next.js marketing site with CMS.', due_date: ahead(35) },
        { id: 's_p3', name: 'Lumen discovery sprint', client_id: 's_c3', status: 'Completed', budget: 6000, estimated_hours: 40, hourly_rate: 150, description: 'Two-week research sprint.', due_date: ago(30) },
    ];

    const tasks = [
        { id: 's_t1', project_id: 's_p1', title: 'Moodboards and direction', status: 'Done', priority: 'Medium', due_date: ago(20), estimated_hours: 8, description: '' },
        { id: 's_t2', project_id: 's_p1', title: 'Logo concepts round 2', status: 'In Progress', priority: 'High', due_date: ahead(2), estimated_hours: 12, description: 'Client liked options B and D.' },
        { id: 's_t3', project_id: 's_p1', title: 'Packaging mockups', status: 'To Do', priority: 'Medium', due_date: ahead(10), estimated_hours: 16, description: '' },
        { id: 's_t4', project_id: 's_p2', title: 'Sitemap and wireframes', status: 'Done', priority: 'High', due_date: ago(12), estimated_hours: 20, description: '' },
        { id: 's_t5', project_id: 's_p2', title: 'Homepage build', status: 'In Progress', priority: 'High', due_date: ago(1), estimated_hours: 24, description: '' },
        { id: 's_t6', project_id: 's_p2', title: 'CMS content model', status: 'To Do', priority: 'Low', due_date: ahead(14), estimated_hours: 10, description: '' },
    ];

    // Time over the last five weeks; the older entries are billed on invoices.
    const time_entries: Record<string, unknown>[] = [];
    const log = (id: string, project: string, daysAgo: number, hours: number, description: string, invoice = '', task = '') => {
        time_entries.push({ id, project_id: project, task_id: task, date: ago(daysAgo), hours, description, is_billable: true, invoice_id: invoice });
    };
    log('s_te1', 's_p1', 33, 4, 'Kickoff and discovery', 's_i3', 's_t1');
    log('s_te2', 's_p1', 31, 3.5, 'Moodboards', 's_i3', 's_t1');
    log('s_te3', 's_p1', 12, 5, 'Logo sketches', '', 's_t2');
    log('s_te4', 's_p1', 9, 6, 'Logo concepts', '', 's_t2');
    log('s_te5', 's_p1', 2, 3, 'Client review call', '', 's_t2');
    log('s_te6', 's_p2', 26, 6, 'Sitemap workshop', 's_i4', 's_t4');
    log('s_te7', 's_p2', 24, 7.5, 'Wireframes', 's_i4', 's_t4');
    log('s_te8', 's_p2', 8, 6, 'Homepage layout', '', 's_t5');
    log('s_te9', 's_p2', 5, 7, 'Homepage build', '', 's_t5');
    log('s_te10', 's_p2', 1, 4.5, 'Responsive fixes', '', 's_t5');
    log('s_te11', 's_p3', 50, 8, 'User interviews', 's_i2');
    log('s_te12', 's_p3', 48, 7, 'Synthesis', 's_i2');
    time_entries.push({ id: 's_te13', project_id: 's_p2', task_id: '', date: ago(3), hours: 1.5, description: 'Internal planning', is_billable: false, invoice_id: '' });

    const li = (id: string, description: string, quantity: number, rate: number) => ({ id, description, quantity, rate });
    const invoices = [
        { id: 's_i1', invoice_number: `SAMPLE-${y}-001`, client_id: 's_c1', issue_date: monthsAgo(4), due_date: monthsAgo(4, 19), status: 'Paid', paid_date: monthsAgo(4, 15), tax_rate: 0, notes: 'Deposit for brand refresh.', line_items: [li('l1', 'Brand refresh deposit (30%)', 1, 3600)] },
        { id: 's_i2', invoice_number: `SAMPLE-${y}-002`, client_id: 's_c3', issue_date: monthsAgo(2), due_date: monthsAgo(2, 19), status: 'Paid', paid_date: monthsAgo(2, 12), tax_rate: 10, notes: '', line_items: [li('l2', 'Discovery sprint: research', 15, 150), li('l3', 'Findings workshop', 1, 1200)] },
        { id: 's_i3', invoice_number: `SAMPLE-${y}-003`, client_id: 's_c1', issue_date: monthsAgo(1), due_date: monthsAgo(1, 19), status: 'Paid', paid_date: monthsAgo(1, 17), tax_rate: 0, notes: '', line_items: [li('l4', 'Northwind brand refresh time', 7.5, 120)] },
        { id: 's_i4', invoice_number: `SAMPLE-${y}-004`, client_id: 's_c2', issue_date: ago(20), due_date: ago(6), status: 'Sent', paid_date: '', tax_rate: 19, notes: 'Milestone 1: sitemap and wireframes.', line_items: [li('l5', 'Alpen Labs website time', 13.5, 130)] },
        { id: 's_i5', invoice_number: `SAMPLE-${y}-005`, client_id: 's_c1', issue_date: ago(4), due_date: ahead(10), status: 'Sent', paid_date: '', tax_rate: 0, notes: 'Monthly retainer.', line_items: [li('l6', 'Design retainer', 1, 2500)], recurrence: 'monthly', next_issue_date: day(addDays(subDays(today, 4), 30)) },
        { id: 's_i6', invoice_number: `SAMPLE-${y}-006`, client_id: 's_c3', issue_date: ago(0), due_date: ahead(14), status: 'Draft', paid_date: '', tax_rate: 10, notes: '', line_items: [li('l7', 'UX audit (fixed fee)', 1, 4500)] },
    ];

    const expenses = [
        { id: 's_e1', date: ago(28), category: 'Software', amount: 54, description: 'Figma (sample)', project_id: '' },
        { id: 's_e2', date: ago(21), category: 'Equipment', amount: 329, description: 'Drawing tablet (sample)', project_id: 's_p1' },
        { id: 's_e3', date: ago(15), category: 'Travel', amount: 186.4, description: 'Train to client workshop (sample)', project_id: 's_p2' },
        { id: 's_e4', date: ago(15), category: 'Meals', amount: 42.8, description: 'Workshop lunch (sample)', project_id: 's_p2' },
        { id: 's_e5', date: day(subMonths(today, 2)), category: 'Software', amount: 54, description: 'Figma (sample)', project_id: '' },
        { id: 's_e6', date: day(subMonths(today, 3)), category: 'Other', amount: 120, description: 'Stock photos (sample)', project_id: 's_p1' },
    ];

    const notes = [
        { id: 's_n1', contact_id: 's_c1', content: 'Prefers async updates on Fridays. Decision maker for packaging.' },
        { id: 's_n2', contact_id: 's_c3', content: 'Procurement needs invoices with PO number in the notes.' },
        { id: 's_n3', contact_id: 's_c4', content: 'Met at the Lisbon meetup. Launch planned for next quarter.' },
    ];

    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exported_at: today.toISOString(),
        collections: { contacts, deals, projects, tasks, invoices, time_entries, expenses, notes, business_profile: null },
    };
}
