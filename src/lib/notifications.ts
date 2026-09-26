import { differenceInCalendarDays } from 'date-fns';
import { AppState, DealStage, InvoiceStatus, TaskStatus } from '../../types';
import { effectiveStatus, invoiceTotal } from './invoice';
import { parseDateOnly } from './dates';
import { formatMoney } from './format';

export interface AppNotification {
    id: string; // stable per item + state, so a dismissal sticks until it changes
    kind: 'invoice' | 'task' | 'deal';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    href: string;
}

// Things that need attention, derived from data the user already has. No
// server-side notification store needed.
export function computeNotifications(data: AppState, currency: string, today: Date = new Date()): AppNotification[] {
    const out: AppNotification[] = [];
    const clientName = (id: string) => data.contacts.find(c => c.id === id)?.name || 'a client';

    for (const inv of data.invoices) {
        const st = effectiveStatus(inv, today);
        const due = parseDateOnly(inv.due_date);
        if (!due || st === InvoiceStatus.Paid || st === InvoiceStatus.Draft) continue;
        const days = differenceInCalendarDays(due, today);
        if (days < 0) {
            out.push({
                id: `inv-overdue-${inv.id}`,
                kind: 'invoice',
                severity: 'critical',
                title: `Invoice ${inv.invoice_number} is ${-days} day${days === -1 ? '' : 's'} overdue`,
                detail: `${formatMoney(invoiceTotal(inv), currency)} from ${clientName(inv.client_id)}`,
                href: `/invoices?open=${inv.id}`,
            });
        } else if (days <= 3) {
            out.push({
                id: `inv-due-${inv.id}-${inv.due_date}`,
                kind: 'invoice',
                severity: 'info',
                title: `Invoice ${inv.invoice_number} due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`,
                detail: `${formatMoney(invoiceTotal(inv), currency)} from ${clientName(inv.client_id)}`,
                href: `/invoices?open=${inv.id}`,
            });
        }
    }

    for (const task of data.tasks) {
        if (task.status === TaskStatus.Done) continue;
        const due = parseDateOnly(task.due_date);
        if (!due) continue;
        const days = differenceInCalendarDays(due, today);
        if (days > 1) continue;
        const project = data.projects.find(p => p.id === task.project_id);
        if (project && project.status !== 'Active') continue;
        out.push({
            id: `task-${task.id}-${task.due_date}`,
            kind: 'task',
            severity: days < 0 ? 'warning' : 'info',
            title: days < 0 ? `Task overdue: ${task.title}` : `Task due ${days === 0 ? 'today' : 'tomorrow'}: ${task.title}`,
            detail: project?.name || 'Project',
            href: `/projects/${task.project_id}`,
        });
    }

    for (const deal of data.deals) {
        if (deal.stage === DealStage.Won || deal.stage === DealStage.Lost) continue;
        const close = parseDateOnly(deal.expected_close);
        if (!close || differenceInCalendarDays(close, today) >= 0) continue;
        out.push({
            id: `deal-${deal.id}-${deal.expected_close}`,
            kind: 'deal',
            severity: 'warning',
            title: `Deal past expected close${deal.title ? `: ${deal.title}` : ''}`,
            detail: `${formatMoney(deal.value || 0, currency)} with ${clientName(deal.contact_id)}`,
            href: '/crm/pipeline',
        });
    }

    const rank = { critical: 0, warning: 1, info: 2 };
    return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
