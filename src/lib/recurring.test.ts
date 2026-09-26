import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// The same file PocketBase loads in pb_hooks/recurring.pb.js.
const require = createRequire(import.meta.url);
const r = require('../../pb_hooks/lib/recurring.js') as {
    addInterval: (d: string, rec: string, anchor?: number) => string;
    addDays: (d: string, n: number) => string;
    daysBetween: (a: string, b: string) => number;
    nextInvoiceNumber: (existing: string[], prefix: string, year: number) => string;
    planOccurrences: (t: { recurrence: string; next_issue_date: string; issue_date: string }, today: string) => { dates: string[]; next: string };
    todayStored: (d: Date) => string;
};

const d = (s: string) => `${s} 00:00:00.000Z`;

describe('recurring invoices', () => {
    it('steps each interval', () => {
        expect(r.addInterval(d('2026-01-15'), 'weekly')).toBe(d('2026-01-22'));
        expect(r.addInterval(d('2026-12-29'), 'weekly')).toBe(d('2027-01-05'));
        expect(r.addInterval(d('2026-01-15'), 'monthly')).toBe(d('2026-02-15'));
        expect(r.addInterval(d('2026-11-15'), 'quarterly')).toBe(d('2027-02-15'));
        expect(r.addInterval(d('2024-02-29'), 'yearly')).toBe(d('2025-02-28'));
        expect(r.addInterval(d('2026-01-15'), 'bogus')).toBe('');
    });

    it('keeps end-of-month anchors instead of drifting', () => {
        const jan31 = d('2026-01-31');
        const feb = r.addInterval(jan31, 'monthly', 31);
        expect(feb).toBe(d('2026-02-28'));
        expect(r.addInterval(feb, 'monthly', 31)).toBe(d('2026-03-31'));
    });

    it('computes day offsets', () => {
        expect(r.daysBetween(d('2026-01-01'), d('2026-01-31'))).toBe(30);
        expect(r.addDays(d('2026-02-20'), 14)).toBe(d('2026-03-06'));
    });

    it('plans due occurrences and catches up missed ones', () => {
        const plan = r.planOccurrences({ recurrence: 'monthly', issue_date: d('2026-06-10'), next_issue_date: d('2026-07-10') }, d('2026-09-26'));
        expect(plan.dates).toEqual([d('2026-07-10'), d('2026-08-10'), d('2026-09-10')]);
        expect(plan.next).toBe(d('2026-10-10'));
    });

    it('does nothing before the next date, and generates on the day itself', () => {
        expect(r.planOccurrences({ recurrence: 'weekly', issue_date: d('2026-09-20'), next_issue_date: d('2026-09-27') }, d('2026-09-26')).dates).toEqual([]);
        expect(r.planOccurrences({ recurrence: 'weekly', issue_date: d('2026-09-19'), next_issue_date: d('2026-09-26') }, d('2026-09-26')).dates).toEqual([d('2026-09-26')]);
    });

    it('caps catch-up at 12 per run', () => {
        const plan = r.planOccurrences({ recurrence: 'weekly', issue_date: d('2020-01-01'), next_issue_date: d('2020-01-08') }, d('2026-09-26'));
        expect(plan.dates).toHaveLength(12);
    });

    it('numbers like the client does', () => {
        expect(r.nextInvoiceNumber(['INV-2026-004', '2026-010'], 'INV-', 2026)).toBe('INV-2026-005');
        expect(r.nextInvoiceNumber([], '', 2027)).toBe('2027-001');
    });

    it('formats today in UTC', () => {
        expect(r.todayStored(new Date(Date.UTC(2026, 8, 26, 23, 59)))).toBe(d('2026-09-26'));
    });
});
