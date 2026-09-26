import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseDate, parseDateOnly, toDateInput, toStoredDate } from './dates';
import { formatMoney, currencySymbol } from './format';
import { invoiceSubtotal, invoiceTax, invoiceTotal, effectiveStatus, nextInvoiceNumber, isUnpaid } from './invoice';
import { csvCell, toCSV } from './csv';
import { InvoiceStatus, ACTIVITY_TYPES } from '../../types';

describe('dates', () => {
    it('parses PocketBase space-separated datetimes', () => {
        const d = parseDate('2026-09-26 11:46:12.000Z');
        expect(d?.toISOString()).toBe('2026-09-26T11:46:12.000Z');
    });

    it('returns null for empty or invalid values', () => {
        expect(parseDate('')).toBeNull();
        expect(parseDate('not a date')).toBeNull();
        expect(parseDateOnly(undefined)).toBeNull();
    });

    it('reads date-only values as local calendar dates (no timezone shift)', () => {
        const d = parseDateOnly('2026-09-26 00:00:00.000Z')!;
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(8);
        expect(d.getDate()).toBe(26);
        expect(toDateInput('2026-09-26T00:00:00.000Z')).toBe('2026-09-26');
    });

    it('round-trips an input value through storage', () => {
        expect(toStoredDate('2026-01-05')).toBe('2026-01-05 00:00:00.000Z');
        expect(toDateInput(toStoredDate('2026-01-05'))).toBe('2026-01-05');
        expect(toStoredDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05 00:00:00.000Z');
    });
});

describe('money', () => {
    it('formats with the requested currency', () => {
        expect(formatMoney(1234.5, 'USD')).toContain('1,234.50');
        expect(formatMoney(10, 'EUR')).toMatch(/€/);
    });

    it('falls back instead of throwing on a bad currency code', () => {
        expect(() => formatMoney(1, 'NOPE')).not.toThrow();
        expect(currencySymbol('USD')).toBe('$');
    });

    it('treats non-finite amounts as zero', () => {
        expect(formatMoney(NaN, 'USD')).toContain('0.00');
    });
});

describe('invoice math', () => {
    const inv = {
        line_items: [
            { id: 'a', description: 'x', quantity: 3, rate: 33.33 },
            { id: 'b', description: 'y', quantity: 1.5, rate: 100 },
        ],
        tax_rate: 20,
    };

    it('computes subtotal, tax and total rounded to cents', () => {
        expect(invoiceSubtotal(inv)).toBe(249.99);
        expect(invoiceTax(inv)).toBe(50);
        expect(invoiceTotal(inv)).toBe(299.99);
    });

    it('handles empty or malformed line items', () => {
        expect(invoiceTotal({ line_items: [], tax_rate: 10 })).toBe(0);
        expect(invoiceTotal({ line_items: [{ id: 'z', description: '', quantity: NaN, rate: 5 }], tax_rate: 0 })).toBe(0);
    });

    it('marks sent invoices past due as overdue', () => {
        const today = new Date(2026, 8, 26);
        expect(effectiveStatus({ status: InvoiceStatus.Sent, due_date: '2026-09-25 00:00:00.000Z' }, today)).toBe(InvoiceStatus.Overdue);
        expect(effectiveStatus({ status: InvoiceStatus.Sent, due_date: '2026-09-26 00:00:00.000Z' }, today)).toBe(InvoiceStatus.Sent);
        expect(effectiveStatus({ status: InvoiceStatus.Paid, due_date: '2020-01-01 00:00:00.000Z' }, today)).toBe(InvoiceStatus.Paid);
        expect(effectiveStatus({ status: InvoiceStatus.Draft, due_date: '2020-01-01 00:00:00.000Z' }, today)).toBe(InvoiceStatus.Draft);
        expect(isUnpaid({ status: InvoiceStatus.Overdue, due_date: '' })).toBe(true);
    });

    it('numbers invoices per year and never reuses a number', () => {
        expect(nextInvoiceNumber([], '', 2026)).toBe('2026-001');
        expect(nextInvoiceNumber(['2026-001', '2026-009', '2025-044', 'garbage'], '', 2026)).toBe('2026-010');
        expect(nextInvoiceNumber(['INV-2026-002'], 'INV-', 2026)).toBe('INV-2026-003');
        expect(nextInvoiceNumber(['2026-001'], 'INV-', 2026)).toBe('INV-2026-001');
    });
});

describe('csv', () => {
    it('neutralises spreadsheet formulas', () => {
        expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
        expect(csvCell('+1 555')).toBe("'+1 555");
        expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('keeps plain negative numbers intact', () => {
        expect(csvCell('-42.5')).toBe('-42.5');
        expect(csvCell(-3)).toBe('-3');
    });

    it('quotes commas, quotes and newlines', () => {
        expect(csvCell('a,b')).toBe('"a,b"');
        expect(csvCell('say "hi"')).toBe('"say ""hi"""');
        expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    });

    it('builds a header from the union of keys', () => {
        const out = toCSV([{ a: 1 }, { b: 'x' }]);
        expect(out.split('\r\n')).toEqual(['a,b', '1,', ',x']);
    });
});

describe('activity types stay in sync across client, hook and migration', () => {
    const root = resolve(__dirname, '../..');
    const extract = (text: string) => {
        const found = new Set<string>();
        for (const t of ACTIVITY_TYPES) if (text.includes(`"${t}"`)) found.add(t);
        return found;
    };

    it('pb_hooks/integrity.pb.js accepts every client type in both handlers', () => {
        const hook = readFileSync(resolve(root, 'pb_hooks/integrity.pb.js'), 'utf8');
        const lists = hook.match(/var TYPES = \[[^\]]*\]/g) || [];
        expect(lists.length).toBe(2);
        for (const list of lists) {
            expect([...extract(list)].sort()).toEqual([...ACTIVITY_TYPES].sort());
        }
    });

    it('the latest schema migration allows every client type', () => {
        const mig = readFileSync(resolve(root, 'pb_migrations/1780800000_v1_1_schema.js'), 'utf8');
        const list = mig.match(/const ACTIVITY_TYPES = \[[^\]]*\]/)?.[0] || '';
        expect([...extract(list)].sort()).toEqual([...ACTIVITY_TYPES].sort());
    });
});
