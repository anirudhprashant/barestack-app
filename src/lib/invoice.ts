import { Invoice, InvoiceStatus, LineItem } from '../../types';
import { parseDateOnly } from './dates';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineItemAmount(item: Pick<LineItem, 'quantity' | 'rate'>): number {
    const q = Number(item.quantity) || 0;
    const r = Number(item.rate) || 0;
    return round2(q * r);
}

export function invoiceSubtotal(invoice: Pick<Invoice, 'line_items'>): number {
    return round2((invoice.line_items || []).reduce((sum, li) => sum + lineItemAmount(li), 0));
}

export function invoiceTax(invoice: Pick<Invoice, 'line_items' | 'tax_rate'>): number {
    return round2(invoiceSubtotal(invoice) * ((Number(invoice.tax_rate) || 0) / 100));
}

export function invoiceTotal(invoice: Pick<Invoice, 'line_items' | 'tax_rate'>): number {
    return round2(invoiceSubtotal(invoice) + invoiceTax(invoice));
}

// A Sent invoice past its due date is Overdue, whether or not anyone has
// flipped the stored status yet. Draft/Paid are never overdue.
export function effectiveStatus(invoice: Pick<Invoice, 'status' | 'due_date'>, today: Date = new Date()): InvoiceStatus {
    if (invoice.status !== InvoiceStatus.Sent) return invoice.status;
    const due = parseDateOnly(invoice.due_date);
    if (!due) return invoice.status;
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return due < startOfToday ? InvoiceStatus.Overdue : InvoiceStatus.Sent;
}

export function isUnpaid(invoice: Pick<Invoice, 'status' | 'due_date'>): boolean {
    const s = effectiveStatus(invoice);
    return s === InvoiceStatus.Sent || s === InvoiceStatus.Overdue;
}

// Next number in the "<prefix><year>-<seq>" series, e.g. INV-2026-007.
// Numbers from other years or other formats are ignored, so the sequence
// restarts each year and never collides with an existing number.
export function nextInvoiceNumber(existing: string[], prefix = '', year: number = new Date().getFullYear()): string {
    const head = `${prefix}${year}-`;
    let max = 0;
    for (const num of existing) {
        if (!num || !num.startsWith(head)) continue;
        const seq = parseInt(num.slice(head.length), 10);
        if (Number.isFinite(seq) && seq > max) max = seq;
    }
    const taken = new Set(existing);
    let candidate = '';
    let seq = max + 1;
    do {
        candidate = `${head}${String(seq).padStart(3, '0')}`;
        seq++;
    } while (taken.has(candidate));
    return candidate;
}

export function newLineItemId(): string {
    return `li${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
